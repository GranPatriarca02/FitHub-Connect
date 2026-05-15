package com.example.routes

import com.example.models.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.or
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.update
import java.util.concurrent.ConcurrentHashMap
import java.time.ZoneOffset
import java.time.Duration

// --- DATOS DE ENTRADA (REQUESTS) ---
@Serializable data class CreatePostRequest(val content: String)
@Serializable data class EditPostRequest(val content: String)
@Serializable data class CreateCommentRequest(val content: String)
@Serializable data class ChatMessageRequest(val receiverId: Int, val content: String)

// --- DATOS DE SALIDA (RESPONSES) ---
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
    val commentsCount: Int,
    val timeAgo: String,
    val isLikedByMe: Boolean
)

@Serializable
data class ChatMessageResponse(
    val id: Int,
    val senderId: Int,
    val receiverId: Int,
    val content: String,
    val createdAt: Long,
    val isRead: Boolean
)

@Serializable
data class ContactResponse(
    val id: Int, 
    val name: String, 
    val role: String,
    val unreadCount: Int = 0,
    val isOnline: Boolean
)

// --- LÓGICA DE APOYO ---
val sessions = ConcurrentHashMap<Int, DefaultWebSocketServerSession>()

suspend fun broadcastStatusChange(userId: Int, isOnline: Boolean) {
    val statusPayload = buildJsonObject {
        put("type", "USER_STATUS_CHANGE")
        put("userId", userId)
        put("isOnline", isOnline)
    }.toString()
    
    sessions.values.forEach { session ->
        try {
            session.send(Frame.Text(statusPayload))
        } catch (_: Exception) { }
    }
}

fun calculateTimeAgo(postTime: java.time.LocalDateTime): String {
    val now = java.time.LocalDateTime.now(ZoneOffset.UTC)
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
        
        // 0. ENDPOINT DE LOGOUT SEGURO
        post("/social/auth/logout") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Falta ID de usuario"))

            sessions[userId]?.let { session ->
                try {
                    session.close(CloseReason(CloseReason.Codes.NORMAL, "Logout solicitado"))
                } catch (_: Exception) {}
                sessions.remove(userId)
            }

            transaction {
                val user = User.findById(userId)
                user?.isOnline = false
            }

            broadcastStatusChange(userId, isOnline = false)
            call.respond(HttpStatusCode.OK, mapOf("status" to "Logged out exitosamente"))
        }

        // 1. FEED SOCIAL
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

        // 2. CREAR POST
        post("/social/posts") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull() 
                ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "No autorizado"))
            val body = call.receive<CreatePostRequest>()
            
            val newPostId = transaction {
                val user = User.findById(userId) ?: return@transaction null
                Post.new {
                    this.user = user
                    this.content = body.content
                    this.likesCount = 0
                }.id.value
            }
            
            if (newPostId == null) {
                call.respond(HttpStatusCode.InternalServerError, mapOf("error" to "No se pudo crear el post"))
            } else {
                call.respond(HttpStatusCode.Created, mapOf("id" to newPostId))
            }
        }

        // 3. LIKE/UNLIKE
        post("/social/posts/{id}/like") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull() 
                ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "No autorizado"))
            val postId = call.parameters["id"]?.toIntOrNull() 
                ?: return@post call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID inválido"))

            val result = transaction {
                val post = Post.findById(postId) ?: return@transaction null
                val user = User.findById(userId) ?: return@transaction null
                val existingLike = PostLike.find { (PostLikes.postId eq postId) and (PostLikes.userId eq userId) }.firstOrNull()

                if (existingLike != null) {
                    existingLike.delete()
                    post.likesCount = maxOf(0, post.likesCount - 1)
                    false
                } else {
                    PostLike.new { this.post = post; this.user = user }
                    post.likesCount += 1
                    true
                }
            }
            if (result == null) call.respond(HttpStatusCode.NotFound, mapOf("error" to "No encontrado"))
            else call.respond(HttpStatusCode.OK, mapOf("isLiked" to result))
        }

        // 4. EDITAR POST
        put("/social/posts/{id}") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull() ?: return@put call.respond(HttpStatusCode.Unauthorized)
            val body = call.receive<EditPostRequest>()

            val success = transaction {
                val post = Post.findById(call.parameters["id"]?.toInt() ?: 0) ?: return@transaction false
                if (post.user.id.value != userId) return@transaction false
                post.content = body.content
                true
            }
            call.respond(if (success) HttpStatusCode.OK else HttpStatusCode.Forbidden, mapOf("success" to success))
        }

        // 5. ELIMINAR POST
        delete("/social/posts/{id}") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull() ?: return@delete call.respond(HttpStatusCode.Unauthorized)
            val success = transaction {
                val post = Post.findById(call.parameters["id"]?.toInt() ?: 0) ?: return@transaction false
                if (post.user.id.value != userId) return@transaction false
                post.delete()
                true
            }
            call.respond(if (success) HttpStatusCode.OK else HttpStatusCode.Forbidden, mapOf("success" to success))
        }

        // 6. OBTENER COMENTARIOS
        get("/social/posts/{id}/comments") {
            val postId = call.parameters["id"]?.toIntOrNull() ?: return@get call.respond(HttpStatusCode.BadRequest)
            val comments = transaction {
                Comment.find { Comments.postId eq postId }.orderBy(Pair(Comments.createdAt, SortOrder.ASC)).map {
                    CommentResponse(it.id.value, it.user.id.value, it.user.name, it.user.role.name, it.content, calculateTimeAgo(it.createdAt))
                }
            }
            call.respond(HttpStatusCode.OK, comments)
        }

        // 7. PUBLICAR COMENTARIO
        post("/social/posts/{id}/comments") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull() ?: return@post call.respond(HttpStatusCode.Unauthorized)
            val body = call.receive<CreateCommentRequest>()
            val ok = transaction {
                val post = Post.findById(call.parameters["id"]?.toInt() ?: 0) ?: return@transaction false
                val user = User.findById(userId) ?: return@transaction false
                Comment.new { this.post = post; this.user = user; this.content = body.content }
                true
            }
            call.respond(if (ok) HttpStatusCode.Created else HttpStatusCode.NotFound, mapOf("success" to ok))
        }

        // 8. ENVIAR MENSAJE (Mantenido por compatibilidad HTTP si tu app lo usa en fallback)
        post("/social/chat/send") {
            val senderId = call.request.headers["X-User-Id"]?.toIntOrNull() ?: return@post call.respond(HttpStatusCode.Unauthorized)
            val body = call.receive<ChatMessageRequest>()

            val response = transaction {
                val s = User.findById(senderId)
                val r = User.findById(body.receiverId)
                if (s != null && r != null) {
                    val msg = ChatMessage.new { 
                        sender = s; receiver = r; content = body.content; isRead = false 
                    }
                    commit()
                    ChatMessageResponse(
                        msg.id.value, msg.sender.id.value, msg.receiver.id.value, 
                        msg.content, msg.createdAt.toInstant(ZoneOffset.UTC).toEpochMilli(), msg.isRead
                    )
                } else null
            }
            
            if (response != null) {
                val socketMsg = buildJsonObject {
                    put("type", "MESSAGE")
                    put("id", response.id)
                    put("senderId", response.senderId)
                    put("receiverId", response.receiverId)
                    put("content", response.content)
                    put("createdAt", response.createdAt)
                    put("isRead", response.isRead)
                }.toString()

                sessions[response.receiverId]?.let { try { it.send(Frame.Text(socketMsg)) } catch (_: Exception) {} }
                call.respond(HttpStatusCode.Created, response)
            } else call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Error al enviar"))
        }

        // 9. HISTORIAL DE CHAT
        get("/social/chat/history/{otherUserId}") {
            val myId = call.request.headers["X-User-Id"]?.toIntOrNull() ?: return@get call.respond(HttpStatusCode.Unauthorized)
            val otherId = call.parameters["otherUserId"]?.toIntOrNull() ?: 0

            val history = transaction {
                ChatMessage.find {
                    ((ChatMessages.senderId eq myId) and (ChatMessages.receiverId eq otherId)) or
                    ((ChatMessages.senderId eq otherId) and (ChatMessages.receiverId eq myId))
                }
                .orderBy(ChatMessages.createdAt to SortOrder.ASC, ChatMessages.id to SortOrder.ASC)
                .map {
                    ChatMessageResponse(
                        it.id.value, it.sender.id.value, it.receiver.id.value, 
                        it.content, it.createdAt.toInstant(ZoneOffset.UTC).toEpochMilli(), it.isRead
                    )
                }
            }
            call.respond(HttpStatusCode.OK, history)
        }

        // 10. CONTACTOS
        get("/social/chat/contacts") {
            val myId = call.request.headers["X-User-Id"]?.toIntOrNull() ?: return@get call.respond(HttpStatusCode.Unauthorized)
            val contacts = transaction {
                val user = User.findById(myId) ?: return@transaction emptyList()
                if (user.role == UserRole.TRAINER) {
                    val monitor = Monitor.find { Monitors.userId eq myId }.firstOrNull() ?: return@transaction emptyList()
                    Subscription.find { Subscriptions.monitorId eq monitor.id }.map { sub ->
                        val unread = ChatMessage.find { 
                            (ChatMessages.senderId eq sub.user.id) and 
                            (ChatMessages.receiverId eq myId) and 
                            (ChatMessages.isRead eq false) 
                        }.count().toInt()
                        ContactResponse(sub.user.id.value, sub.user.name, "Alumno", unread, sub.user.isOnline)
                    }
                } else {
                    Subscription.find { Subscriptions.userId eq myId }.map { sub ->
                        val unread = ChatMessage.find { 
                            (ChatMessages.senderId eq sub.monitor.user.id) and 
                            (ChatMessages.receiverId eq myId) and 
                            (ChatMessages.isRead eq false) 
                        }.count().toInt()
                        ContactResponse(sub.monitor.user.id.value, sub.monitor.user.name, "Entrenador", unread, sub.monitor.user.isOnline)
                    }
                }
            }
            call.respond(HttpStatusCode.OK, contacts)
        }

        // 11. MARCAR LEÍDO
        post("/social/chat/read") {
            val myId = call.request.headers["X-User-Id"]?.toIntOrNull() ?: return@post call.respond(HttpStatusCode.Unauthorized)
            val body = call.receive<Map<String, Int>>()
            val senderId = body["senderId"] ?: return@post call.respond(HttpStatusCode.BadRequest)

            transaction {
                ChatMessages.update({ (ChatMessages.senderId eq senderId) and (ChatMessages.receiverId eq myId) }) {
                    it[isRead] = true
                }
            }
            call.respond(HttpStatusCode.OK, mapOf("status" to "success"))
        }

        // 12. WEBSOCKET
        webSocket("/chat/{userId}") {
            val myId = call.parameters["userId"]?.toIntOrNull() ?: return@webSocket
            
            // Forzar cierre de sesiones colgadas o duplicadas en caliente
            sessions[myId]?.let { oldSession ->
                try { oldSession.close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Nueva conexión detectada")) } catch(_: Exception){}
            }
            
            sessions[myId] = this

            // Cambiar estado a ONLINE en la Base de Datos de forma limpia
            transaction {
                val user = User.findById(myId)
                user?.isOnline = true
            }
            broadcastStatusChange(myId, isOnline = true)

            try {
                for (frame in incoming) {
                    if (frame is Frame.Text) {
                        val text = frame.readText()
                        val json = Json.parseToJsonElement(text).jsonObject
                        
                        when (json["type"]?.jsonPrimitive?.content) {
                            // Mantiene la conexión activa y evita que el socket muera por inactividad
                            "PING" -> {
                                try { 
                                    send(Frame.Text(buildJsonObject { put("type", "PONG") }.toString())) 
                                } catch (_: Exception) {}
                            }

                            "SEND_MESSAGE" -> {
                                val rId = json["receiverId"]?.jsonPrimitive?.int ?: continue
                                val messageContent = json["content"]?.jsonPrimitive?.content ?: ""
                                
                                val savedMsgPayload = transaction {
                                    val s = User.findById(myId)
                                    val r = User.findById(rId)
                                    if (s != null && r != null) {
                                        val msg = ChatMessage.new { sender = s; receiver = r; content = messageContent; isRead = false }
                                        commit()
                                        
                                        buildJsonObject {
                                            put("type", "MESSAGE")
                                            put("id", msg.id.value) // ID REAL DE BD
                                            put("senderId", myId)
                                            put("receiverId", rId)
                                            put("content", messageContent)
                                            put("createdAt", System.currentTimeMillis())
                                            put("isRead", false)
                                        }.toString()
                                    } else null
                                }

                                if (savedMsgPayload != null) {
                                    // 1. Enviar en tiempo real al receptor si está conectado
                                    sessions[rId]?.let { receiverSession ->
                                        try { receiverSession.send(Frame.Text(savedMsgPayload)) } catch (_: Exception) {}
                                    }
                                    // 2. Enviar de vuelta al emisor para confirmar el guardado real e ID definitivo
                                    try { this.send(Frame.Text(savedMsgPayload)) } catch (_: Exception) {}
                                }
                            }

                            "READ_EVENT" -> {
                                val sId = json["senderId"]?.jsonPrimitive?.int ?: continue
                                val confirmation = buildJsonObject {
                                    put("type", "READ_CONFIRMATION")
                                    put("readerId", myId)
                                }.toString()
                                sessions[sId]?.let { try { it.send(Frame.Text(confirmation)) } catch (_: Exception) {} }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                // Maneja cierres inesperados de conexión de la app móvil
            } finally {
                // SÍ O SÍ: Limpieza de sesión y paso a OFFLINE definitivo cuando muere el canal
                sessions.remove(myId)
                transaction {
                    val user = User.findById(myId)
                    user?.isOnline = false
                }
                broadcastStatusChange(myId, isOnline = false)
            }
        }
    }
}