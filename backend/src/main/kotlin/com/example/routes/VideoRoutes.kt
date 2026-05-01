package com.example.routes

import com.example.models.*
import com.example.models.dto.CreateVideoRequest
import com.example.models.dto.VideoDto
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.transactions.transaction

fun Application.videoRoutes() {
    routing {
        route("/videos") {

            get {
                val userRole = call.request.headers["X-User-Role"]?.uppercase() ?: "FREE"
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()

                val videos = transaction {
                    val query = if (userRole == "FREE") {
                        Video.find { Videos.isPremium eq false }.toList()
                    } else if (userRole == "TRAINER") {
                        Video.all().toList()
                    } else {
                        val activeSubMonitorIds = if (userId != null) {
                            Subscription.find {
                                (Subscriptions.userId eq userId) and (Subscriptions.status eq SubscriptionStatus.ACTIVE)
                            }.map { it.monitor.id.value }
                        } else emptyList()

                        Video.all().filter { v ->
                            !v.isPremium || 
                            v.monitor == null || 
                            activeSubMonitorIds.contains(v.monitor?.id?.value)
                        }
                    }

                    query.map { v ->
                        VideoDto(
                            id           = v.id.value,
                            title        = v.title,
                            description  = v.description,
                            videoUrl     = v.videoUrl,
                            thumbnailUrl = v.thumbnailUrl,
                            isPremium    = v.isPremium,
                            trainerName  = v.monitor?.user?.name,
                            monitorId    = v.monitor?.id?.value,
                            createdAt    = v.createdAt.toString()
                        )
                    }
                }

                call.respond(HttpStatusCode.OK, videos)
            }

            // GET /videos/my — videos del entrenador autenticado
            get("/my") {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Header X-User-Id requerido"))

                val videos = transaction {
                    val monitor = Monitor.find { Monitors.userId eq userId }.firstOrNull()
                        ?: return@transaction null // Cambiamos a null para detectar fuera

                    Video.find { Videos.monitorId eq monitor.id }
                        .orderBy(Videos.createdAt to org.jetbrains.exposed.sql.SortOrder.DESC)
                        .map { v ->
                            VideoDto(
                                id           = v.id.value,
                                title        = v.title,
                                description  = v.description,
                                videoUrl     = v.videoUrl,
                                thumbnailUrl = v.thumbnailUrl,
                                isPremium    = v.isPremium,
                                trainerName  = v.monitor?.user?.name,
                                monitorId    = v.monitor?.id?.value,
                                createdAt    = v.createdAt.toString()
                            )
                        }
                }

                if (videos == null) {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Perfil de monitor no encontrado para este usuario"))
                } else {
                    call.respond(HttpStatusCode.OK, videos)
                }
            }

            // POST /videos — solo TRAINER puede publicar un video
            post {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Header X-User-Id requerido"))

                val monitor = transaction {
                    Monitor.find { Monitors.userId eq userId }.firstOrNull()
                } ?: return@post call.respond(
                    HttpStatusCode.Forbidden,
                    mapOf("error" to "No se encontró perfil de monitor para este usuario. Asegúrate de que tu cuenta sea de entrenador.")
                )

                val req = try {
                    call.receive<CreateVideoRequest>()
                } catch (e: Exception) {
                    return@post call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Cuerpo de la petición no válido"))
                }

                if (req.title.isBlank() || req.videoUrl.isBlank()) {
                    return@post call.respond(
                        HttpStatusCode.BadRequest,
                        mapOf("error" to "El título y la URL del video son obligatorios")
                    )
                }

                val video = transaction {
                    Video.new {
                        title        = req.title
                        description  = req.description
                        videoUrl     = req.videoUrl
                        thumbnailUrl = req.thumbnailUrl
                        isPremium    = req.isPremium
                        this.monitor = monitor
                    }
                }

                call.respond(
                    HttpStatusCode.Created,
                    mapOf(
                        "message" to "Video publicado correctamente",
                        "videoId" to video.id.value.toString()
                    )
                )
            }

            // DELETE /videos/{id} — el entrenador puede eliminar sus propios videos
            delete("/{id}") {
                val videoId = call.parameters["id"]?.toIntOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "ID de video no valido")

                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")

                val deleted = transaction {
                    val monitor = Monitor.find { Monitors.userId eq userId }.firstOrNull()
                        ?: return@transaction false
                    val video = Video.findById(videoId)
                        ?: return@transaction false
                    if (video.monitor?.id != monitor.id) return@transaction false
                    video.delete()
                    true
                }

                if (deleted) {
                    call.respond(HttpStatusCode.OK, mapOf("message" to "Video eliminado correctamente"))
                } else {
                    call.respond(HttpStatusCode.Forbidden, mapOf("error" to "No tienes permiso para eliminar este video"))
                }
            }
        }
    }
}
