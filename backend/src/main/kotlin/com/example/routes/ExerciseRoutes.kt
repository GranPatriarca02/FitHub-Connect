package com.example.routes

import com.example.models.*
import com.example.models.dto.CreateExerciseRequest
import com.example.models.dto.ExerciseDto
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.transactions.transaction

fun Application.exerciseRoutes() {
    routing {
        route("/exercises") {

            // GET /exercises  →  catálogo completo de ejercicios (oficiales + creados por monitores)
            //   query opcional: ?muscleGroup=PECHO
            get {
                val muscleGroup = call.request.queryParameters["muscleGroup"]?.trim()

                val list = transaction {
                    val query = if (!muscleGroup.isNullOrBlank() && !muscleGroup.equals("todos", ignoreCase = true)) {
                        Exercise.find { Exercises.muscleGroup eq muscleGroup }
                    } else {
                        Exercise.all()
                    }
                    query.orderBy(Exercises.name to SortOrder.ASC).map { ex ->
                        ExerciseDto(
                            id          = ex.id.value,
                            name        = ex.name,
                            description = ex.description,
                            muscleGroup = ex.muscleGroup,
                            difficulty  = ex.difficulty,
                            equipment   = ex.equipment,
                            videoUrl    = ex.videoUrl,
                            creatorId   = ex.creator?.id?.value,
                            creatorName = ex.creator?.name,
                            createdAt   = ex.createdAt.toString()
                        )
                    }
                }
                call.respond(HttpStatusCode.OK, list)
            }

            // GET /exercises/{id}
            get("/{id}") {
                val exId = call.parameters["id"]?.toIntOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, "ID de ejercicio no válido")

                val ex = transaction {
                    Exercise.findById(exId)?.let { e ->
                        ExerciseDto(
                            id          = e.id.value,
                            name        = e.name,
                            description = e.description,
                            muscleGroup = e.muscleGroup,
                            difficulty  = e.difficulty,
                            equipment   = e.equipment,
                            videoUrl    = e.videoUrl,
                            creatorId   = e.creator?.id?.value,
                            creatorName = e.creator?.name,
                            createdAt   = e.createdAt.toString()
                        )
                    }
                } ?: return@get call.respond(HttpStatusCode.NotFound, "Ejercicio no encontrado")

                call.respond(HttpStatusCode.OK, ex)
            }

            // POST /exercises  →  solo TRAINER puede crear ejercicios
            post {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")

                val req = try {
                    call.receive<CreateExerciseRequest>()
                } catch (e: Exception) {
                    return@post call.respond(HttpStatusCode.BadRequest, "Cuerpo de la petición no válido")
                }

                if (req.name.isBlank()) {
                    return@post call.respond(
                        HttpStatusCode.BadRequest,
                        mapOf("error" to "El nombre del ejercicio es obligatorio")
                    )
                }

                val result = transaction {
                    val user = User.findById(userId) ?: return@transaction null
                    if (user.role != UserRole.TRAINER) return@transaction "forbidden"

                    val created = Exercise.new {
                        name        = req.name.trim()
                        description = req.description?.trim()
                        muscleGroup = req.muscleGroup?.trim()?.uppercase()
                        difficulty  = req.difficulty?.trim()
                        equipment   = req.equipment?.trim()
                        videoUrl    = req.videoUrl?.trim()
                        creator     = user
                    }
                    created.id.value
                }

                when (result) {
                    null         -> call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario no encontrado"))
                    "forbidden"  -> call.respond(HttpStatusCode.Forbidden, mapOf("error" to "Solo los entrenadores pueden crear ejercicios"))
                    else         -> call.respond(
                        HttpStatusCode.Created,
                        mapOf("message" to "Ejercicio creado", "exerciseId" to result.toString())
                    )
                }
            }

            // DELETE /exercises/{id}  →  el creador puede borrar su propio ejercicio
            delete("/{id}") {
                val exId = call.parameters["id"]?.toIntOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "ID no válido")
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")

                val ok = transaction {
                    val ex = Exercise.findById(exId) ?: return@transaction false
                    if (ex.creator?.id?.value != userId) return@transaction false
                    ex.delete()
                    true
                }

                if (ok) call.respond(HttpStatusCode.OK, mapOf("message" to "Ejercicio eliminado"))
                else call.respond(HttpStatusCode.Forbidden, mapOf("error" to "No tienes permiso para eliminar este ejercicio"))
            }
        }
    }
}
