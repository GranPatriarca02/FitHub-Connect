package com.example.routes

import com.example.models.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.transactions.transaction

@Serializable
data class CreatePostRequest(
    val content: String
)

@Serializable
data class EditPostRequest(
    val content: String
)

@Serializable
data class CreateCommentRequest(
    val content: String
)

@Serializable
data class CommentResponse(
    val id: Int,
    val userId: Int,
    val userName: String,
    val userRole: String,
    val content: String,
    val timeAgo: String
)

@Serializable
data class PostResponse(
    val id: Int,
    val userId: Int,
    val userName: String,
    val userRole: String,
    val content: String,
    val likesCount: Int,
    val commentsCount: Int, // Placeholder for MVP
    val timeAgo: String,
    val isLikedByMe: Boolean
)

// Helper function to calculate a simple "time ago" string
fun calculateTimeAgo(postTime: java.time.LocalDateTime): String {
    // createdAt viene de CURRENT_TIMESTAMP (UTC en la DB),
    // así que comparamos contra UTC para que no haya desfase.
    val now = java.time.LocalDateTime.now(java.time.ZoneOffset.UTC)
    val duration = java.time.Duration.between(postTime, now)
    
    return when {
        duration.toMinutes() < 1 -> "Ahora mismo"
        duration.toHours() < 1 -> "${duration.toMinutes()}m"
        duration.toDays() < 1 -> "${duration.toHours()}h"
        duration.toDays() < 7 -> "${duration.toDays()}d"
        else -> "${duration.toDays() / 7}w"
    }
}

fun Application.socialRoutes() {
    routing {
        
        // --- 1. OBTENER EL FEED SOCIAL ---
        get("/social/posts") {
            val currentUserId = call.request.headers["X-User-Id"]?.toIntOrNull()

            val postsList = transaction {
                Post.all().orderBy(Pair(Posts.createdAt, SortOrder.DESC)).limit(50).map { post ->
                    val isLiked = currentUserId != null && PostLike.find {
                        (PostLikes.postId eq post.id) and (PostLikes.userId eq currentUserId)
                    }.count() > 0

                    val commentsCount = Comment.find { Comments.postId eq post.id }.count().toInt()

                    PostResponse(
                        id = post.id.value,
                        userId = post.user.id.value,
                        userName = post.user.name,
                        userRole = post.user.role.name,
                        content = post.content,
                        likesCount = post.likesCount,
                        commentsCount = commentsCount,
                        timeAgo = calculateTimeAgo(post.createdAt),
                        isLikedByMe = isLiked
                    )
                }
            }

            call.respond(HttpStatusCode.OK, postsList)
        }

        // --- 2. CREAR UN NUEVO POST ---
        post("/social/posts") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "No autenticado"))

            val body = call.receive<CreatePostRequest>()

            if (body.content.isBlank()) {
                return@post call.respond(HttpStatusCode.BadRequest, mapOf("error" to "El contenido no puede estar vacío"))
            }

            val newPost = transaction {
                val user = User.findById(userId) ?: return@transaction null
                
                Post.new {
                    this.user = user
                    this.content = body.content
                    this.likesCount = 0
                }
            }

            if (newPost == null) {
                call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario no encontrado"))
            } else {
                call.respond(HttpStatusCode.Created, mapOf(
                    "message" to "Post creado exitosamente", 
                    "id" to newPost.id.value.toString()
                ))
            }
        }

        // --- 3. DAR O QUITAR LIKE A UN POST ---
        post("/social/posts/{id}/like") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "No autenticado"))
                
            val postId = call.parameters["id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID de post inválido"))

            val isLikedNow = transaction {
                val post = Post.findById(postId) ?: return@transaction null
                val user = User.findById(userId) ?: return@transaction null

                val existingLike = PostLike.find {
                    (PostLikes.postId eq postId) and (PostLikes.userId eq userId)
                }.firstOrNull()

                if (existingLike != null) {
                    // Si ya le dio like, lo quitamos (Unlike)
                    existingLike.delete()
                    post.likesCount = maxOf(0, post.likesCount - 1)
                    false // Ya no está liked
                } else {
                    // Si no le ha dado like, lo creamos (Like)
                    PostLike.new {
                        this.post = post
                        this.user = user
                    }
                    post.likesCount += 1
                    true // Ahora está liked
                }
            }

            if (isLikedNow == null) {
                call.respond(HttpStatusCode.NotFound, mapOf("error" to "Post o usuario no encontrado"))
            } else {
                call.respond(HttpStatusCode.OK, mapOf("isLiked" to isLikedNow.toString()))
            }
        }
        // --- 4. EDITAR UN POST ---
        put("/social/posts/{id}") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                ?: return@put call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "No autenticado"))
                
            val postId = call.parameters["id"]?.toIntOrNull()
                ?: return@put call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID de post inválido"))

            val body = call.receive<EditPostRequest>()

            if (body.content.isBlank()) {
                return@put call.respond(HttpStatusCode.BadRequest, mapOf("error" to "El contenido no puede estar vacío"))
            }

            val success = transaction {
                val post = Post.findById(postId) ?: return@transaction false
                if (post.user.id.value != userId) return@transaction false // Solo el autor puede editar

                post.content = body.content
                true
            }

            if (success) {
                call.respond(HttpStatusCode.OK, mapOf("message" to "Post actualizado"))
            } else {
                call.respond(HttpStatusCode.Forbidden, mapOf("error" to "No se pudo editar el post"))
            }
        }

        // --- 5. ELIMINAR UN POST ---
        delete("/social/posts/{id}") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "No autenticado"))
                
            val postId = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID de post inválido"))

            val success = transaction {
                val post = Post.findById(postId) ?: return@transaction false
                if (post.user.id.value != userId) {
                    println("DELETE FAILED: User $userId is not author of post $postId")
                    return@transaction false
                }

                try {
                    post.delete()
                    true
                } catch (e: Exception) {
                    println("DELETE FAILED: DB error deleting post $postId: ${e.message}")
                    false
                }
            }

            if (success) {
                call.respond(HttpStatusCode.OK, mapOf("message" to "Post eliminado"))
            } else {
                call.respond(HttpStatusCode.Forbidden, mapOf("error" to "No se pudo eliminar el post"))
            }
        }

        // --- 6. OBTENER COMENTARIOS DE UN POST ---
        get("/social/posts/{id}/comments") {
            val postId = call.parameters["id"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID de post inválido"))

            val commentsList = transaction {
                Comment.find { Comments.postId eq postId }.orderBy(Pair(Comments.createdAt, SortOrder.ASC)).map { comment ->
                    CommentResponse(
                        id = comment.id.value,
                        userId = comment.user.id.value,
                        userName = comment.user.name,
                        userRole = comment.user.role.name,
                        content = comment.content,
                        timeAgo = calculateTimeAgo(comment.createdAt)
                    )
                }
            }

            call.respond(HttpStatusCode.OK, commentsList)
        }

        // --- 7. AÑADIR UN COMENTARIO ---
        post("/social/posts/{id}/comments") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "No autenticado"))
                
            val postId = call.parameters["id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID de post inválido"))

            val body = call.receive<CreateCommentRequest>()

            if (body.content.isBlank()) {
                return@post call.respond(HttpStatusCode.BadRequest, mapOf("error" to "El comentario no puede estar vacío"))
            }

            val newComment = transaction {
                val user = User.findById(userId) ?: return@transaction null
                val post = Post.findById(postId) ?: return@transaction null
                
                Comment.new {
                    this.post = post
                    this.user = user
                    this.content = body.content
                }
            }

            if (newComment == null) {
                call.respond(HttpStatusCode.NotFound, mapOf("error" to "Post o usuario no encontrado"))
            } else {
                call.respond(HttpStatusCode.Created, mapOf("message" to "Comentario creado exitosamente"))
            }
        }

    }
}
