package com.example.routes

import com.example.models.*
import com.example.models.dto.AddExerciseToRoutineRequest
import com.example.models.dto.CreateRoutineRequest
import com.example.models.dto.RoutineDetailDto
import com.example.models.dto.RoutineDto
import com.example.models.dto.RoutineExerciseDto
import com.example.models.dto.UpdateRoutineExerciseRequest
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.or
import org.jetbrains.exposed.sql.transactions.transaction

fun Application.routineRoutes() {
    routing {
        route("/routines") {

            // GET /routines  →  rutinas propias del usuario + rutinas públicas
            get {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")

                val list = transaction {
                    Routine.find {
                        (Routines.creatorId eq userId) or (Routines.isPublic eq true)
                    }.orderBy(Routines.createdAt to SortOrder.DESC).map { r ->
                        RoutineDto(
                            id            = r.id.value,
                            title         = r.title,
                            description   = r.description,
                            difficulty    = r.difficulty,
                            goal          = r.goal,
                            isPublic      = r.isPublic,
                            creatorId     = r.creator.id.value,
                            creatorName   = r.creator.name,
                            exerciseCount = RoutineExercise.find { RoutineExercises.routineId eq r.id }.count().toInt(),
                            createdAt     = r.createdAt.toString()
                        )
                    }
                }
                call.respond(HttpStatusCode.OK, list)
            }

            // GET /routines/my  →  solo rutinas creadas por el usuario (útil para monitores)
            get("/my") {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")

                val list = transaction {
                    Routine.find { Routines.creatorId eq userId }
                        .orderBy(Routines.createdAt to SortOrder.DESC)
                        .map { r ->
                            RoutineDto(
                                id            = r.id.value,
                                title         = r.title,
                                description   = r.description,
                                difficulty    = r.difficulty,
                                goal          = r.goal,
                                isPublic      = r.isPublic,
                                creatorId     = r.creator.id.value,
                                creatorName   = r.creator.name,
                                exerciseCount = RoutineExercise.find { RoutineExercises.routineId eq r.id }.count().toInt(),
                                createdAt     = r.createdAt.toString()
                            )
                        }
                }
                call.respond(HttpStatusCode.OK, list)
            }

            // GET /routines/{id}  →  detalle con ejercicios
            get("/{id}") {
                val routineId = call.parameters["id"]?.toIntOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, "ID de rutina no válido")
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()

                val detail = transaction {
                    val r = Routine.findById(routineId) ?: return@transaction null

                    // Si la rutina es privada y no pertenece al usuario, no se puede ver
                    if (!r.isPublic && (userId == null || r.creator.id.value != userId)) {
                        return@transaction "forbidden"
                    }

                    val exList = RoutineExercise.find { RoutineExercises.routineId eq r.id }
                        .orderBy(RoutineExercises.orderIndex to SortOrder.ASC)
                        .map { re ->
                            RoutineExerciseDto(
                                id          = re.id.value,
                                exerciseId  = re.exercise.id.value,
                                name        = re.exercise.name,
                                muscleGroup = re.exercise.muscleGroup,
                                equipment   = re.exercise.equipment,
                                videoUrl    = re.exercise.videoUrl,
                                sets        = re.sets,
                                reps        = re.reps,
                                restSeconds = re.restSeconds,
                                orderIndex  = re.orderIndex,
                                notes       = re.notes
                            )
                        }

                    RoutineDetailDto(
                        id          = r.id.value,
                        title       = r.title,
                        description = r.description,
                        difficulty  = r.difficulty,
                        goal        = r.goal,
                        isPublic    = r.isPublic,
                        creatorId   = r.creator.id.value,
                        creatorName = r.creator.name,
                        createdAt   = r.createdAt.toString(),
                        exercises   = exList
                    )
                }

                when (detail) {
                    null        -> call.respond(HttpStatusCode.NotFound, "Rutina no encontrada")
                    "forbidden" -> call.respond(HttpStatusCode.Forbidden, mapOf("error" to "Esta rutina es privada"))
                    else        -> call.respond(HttpStatusCode.OK, detail)
                }
            }

            // POST /routines  →  crear rutina (cualquier usuario autenticado)
            post {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")

                val req = try {
                    call.receive<CreateRoutineRequest>()
                } catch (e: Exception) {
                    return@post call.respond(HttpStatusCode.BadRequest, "Cuerpo de la petición no válido")
                }

                if (req.title.isBlank()) {
                    return@post call.respond(
                        HttpStatusCode.BadRequest,
                        mapOf("error" to "El título de la rutina es obligatorio")
                    )
                }

                val result = transaction {
                    val user = User.findById(userId) ?: return@transaction null
                    // Solo un TRAINER puede hacer la rutina pública
                    val publicFlag = req.isPublic && user.role == UserRole.TRAINER
                    val created = Routine.new {
                        title       = req.title.trim()
                        description = req.description?.trim()
                        difficulty  = req.difficulty?.trim()
                        goal        = req.goal?.trim()
                        isPublic    = publicFlag
                        creator     = user
                    }
                    created.id.value
                }

                if (result == null) {
                    call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario no encontrado"))
                } else {
                    call.respond(
                        HttpStatusCode.Created,
                        mapOf("message" to "Rutina creada", "routineId" to result.toString())
                    )
                }
            }

            // DELETE /routines/{id}  →  el creador puede borrar su rutina
            delete("/{id}") {
                val routineId = call.parameters["id"]?.toIntOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "ID de rutina no válido")
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")

                val ok = transaction {
                    val r = Routine.findById(routineId) ?: return@transaction false
                    if (r.creator.id.value != userId) return@transaction false
                    r.delete()
                    true
                }

                if (ok) call.respond(HttpStatusCode.OK, mapOf("message" to "Rutina eliminada"))
                else    call.respond(HttpStatusCode.Forbidden, mapOf("error" to "No tienes permiso para eliminar esta rutina"))
            }

            // --- Gestión de ejercicios dentro de la rutina ---

            // POST /routines/{id}/exercises  →  añadir un ejercicio existente a la rutina
            post("/{id}/exercises") {
                val routineId = call.parameters["id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.BadRequest, "ID de rutina no válido")
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")

                val req = try {
                    call.receive<AddExerciseToRoutineRequest>()
                } catch (e: Exception) {
                    return@post call.respond(HttpStatusCode.BadRequest, "Cuerpo de la petición no válido")
                }

                val result = transaction {
                    val r = Routine.findById(routineId) ?: return@transaction "not_found"
                    if (r.creator.id.value != userId) return@transaction "forbidden"
                    val ex = Exercise.findById(req.exerciseId) ?: return@transaction "exercise_not_found"

                    val nextIndex = req.orderIndex ?: (
                        RoutineExercise.find { RoutineExercises.routineId eq r.id }.count().toInt()
                    )

                    val item = RoutineExercise.new {
                        routine     = r
                        exercise    = ex
                        sets        = req.sets
                        reps        = req.reps
                        restSeconds = req.restSeconds
                        orderIndex  = nextIndex
                        notes       = req.notes?.trim()
                    }
                    "ok:${item.id.value}"
                }

                when {
                    result == "not_found"          -> call.respond(HttpStatusCode.NotFound, mapOf("error" to "Rutina no encontrada"))
                    result == "forbidden"          -> call.respond(HttpStatusCode.Forbidden, mapOf("error" to "No puedes modificar esta rutina"))
                    result == "exercise_not_found" -> call.respond(HttpStatusCode.NotFound, mapOf("error" to "Ejercicio no encontrado"))
                    else -> {
                        val id = result.removePrefix("ok:")
                        call.respond(HttpStatusCode.Created, mapOf("message" to "Ejercicio añadido a la rutina", "routineExerciseId" to id))
                    }
                }
            }

            // PUT /routines/{id}/exercises/{reId}  →  editar sets/reps/etc de una fila
            put("/{id}/exercises/{reId}") {
                val routineId = call.parameters["id"]?.toIntOrNull()
                val reId      = call.parameters["reId"]?.toIntOrNull()
                val userId    = call.request.headers["X-User-Id"]?.toIntOrNull()
                if (routineId == null || reId == null || userId == null) {
                    return@put call.respond(HttpStatusCode.BadRequest, "Parámetros no válidos")
                }

                val req = try {
                    call.receive<UpdateRoutineExerciseRequest>()
                } catch (e: Exception) {
                    return@put call.respond(HttpStatusCode.BadRequest, "Cuerpo de la petición no válido")
                }

                val result = transaction {
                    val r = Routine.findById(routineId) ?: return@transaction "not_found"
                    if (r.creator.id.value != userId) return@transaction "forbidden"
                    val item = RoutineExercise.findById(reId) ?: return@transaction "not_found"
                    if (item.routine.id.value != r.id.value) return@transaction "not_found"

                    req.sets?.let { item.sets = it }
                    req.reps?.let { item.reps = it }
                    req.restSeconds?.let { item.restSeconds = it }
                    req.orderIndex?.let { item.orderIndex = it }
                    req.notes?.let { item.notes = it.ifBlank { null } }
                    "ok"
                }

                when (result) {
                    "not_found" -> call.respond(HttpStatusCode.NotFound, mapOf("error" to "No encontrado"))
                    "forbidden" -> call.respond(HttpStatusCode.Forbidden, mapOf("error" to "No puedes modificar esta rutina"))
                    else        -> call.respond(HttpStatusCode.OK, mapOf("message" to "Ejercicio actualizado"))
                }
            }

            // DELETE /routines/{id}/exercises/{reId}  →  quitar ejercicio de una rutina
            delete("/{id}/exercises/{reId}") {
                val routineId = call.parameters["id"]?.toIntOrNull()
                val reId      = call.parameters["reId"]?.toIntOrNull()
                val userId    = call.request.headers["X-User-Id"]?.toIntOrNull()
                if (routineId == null || reId == null || userId == null) {
                    return@delete call.respond(HttpStatusCode.BadRequest, "Parámetros no válidos")
                }

                val ok = transaction {
                    val r = Routine.findById(routineId) ?: return@transaction false
                    if (r.creator.id.value != userId) return@transaction false
                    val item = RoutineExercise.findById(reId) ?: return@transaction false
                    if (item.routine.id.value != r.id.value) return@transaction false
                    item.delete()
                    true
                }

                if (ok) call.respond(HttpStatusCode.OK, mapOf("message" to "Ejercicio retirado de la rutina"))
                else    call.respond(HttpStatusCode.Forbidden, mapOf("error" to "No tienes permiso"))
            }
        }
    }
}
