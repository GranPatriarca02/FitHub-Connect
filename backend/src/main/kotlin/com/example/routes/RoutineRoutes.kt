package com.example.routes

import com.example.models.*
import com.example.models.dto.AddExerciseToRoutineRequest
import com.example.models.dto.AssignRoutineRequest
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
                val userRole = call.request.headers["X-User-Role"]?.uppercase() ?: "FREE"

                val list = transaction {
                    // 1. Obtener IDs de monitores a los que está suscrito (excepto si es TRAINER que ve todo)
                    val activeSubMonitorIds = if (userRole != "TRAINER" && userId != null) {
                        Subscription.find {
                            (Subscriptions.userId eq userId) and (Subscriptions.status eq SubscriptionStatus.ACTIVE)
                        }.map { it.monitor.id.value }
                    } else emptyList()

                    // 2. Buscar rutinas:
                    // - Propias (creatorId == userId)
                    // - Públicas (isPublic == true) pero con filtro Premium
                    // - Asignadas en exclusiva al usuario (assignedToUserId == userId)
                    Routine.find {
                        (Routines.creatorId eq userId) or
                        (Routines.isPublic eq true) or
                        (Routines.assignedToUserId eq userId)
                    }.orderBy(Routines.createdAt to SortOrder.DESC).filter { r ->
                        // Filtro de visibilidad:
                        // - Si es propia, se ve siempre
                        if (r.creator.id.value == userId) return@filter true

                        // - Si está asignada en exclusiva a este usuario, se ve siempre
                        if (r.assignedTo?.id?.value == userId) return@filter true

                        // - Si la rutina tiene assignedToUserId distinto al usuario, NO se ve
                        //   (incluso si es pública, es contenido exclusivo de otro suscriptor)
                        if (r.assignedTo != null) return@filter false

                        // - Si es ajena y Premium: solo se ve si el usuario está suscrito a ese monitor
                        if (r.isPremium) {
                            val monitor = Monitor.find { Monitors.userId eq r.creator.id }.firstOrNull()
                            // Si no hay perfil de monitor (ej. rutina oficial), solo se ve si el usuario es Premium
                            if (monitor == null) return@filter userRole != "FREE"
                            // Si hay monitor, check suscriptores
                            return@filter activeSubMonitorIds.contains(monitor.id.value)
                        }

                        // - Si es ajena y no Premium: se ve siempre que sea pública
                        true
                    }.map { r ->
                        RoutineDto(
                            id            = r.id.value,
                            title         = r.title,
                            description   = r.description,
                            difficulty    = r.difficulty,
                            goal          = r.goal,
                            isPublic      = r.isPublic,
                            isPremium     = r.isPremium,
                            creatorId     = r.creator.id.value,
                            creatorName   = r.creator.name,
                            exerciseCount = RoutineExercise.find { RoutineExercises.routineId eq r.id }.count().toInt(),
                            createdAt     = r.createdAt.toString(),
                            assignedToUserId = r.assignedTo?.id?.value
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
                                isPremium     = r.isPremium,
                                creatorId     = r.creator.id.value,
                                creatorName   = r.creator.name,
                                exerciseCount = RoutineExercise.find { RoutineExercises.routineId eq r.id }.count().toInt(),
                                createdAt     = r.createdAt.toString(),
                                assignedToUserId = r.assignedTo?.id?.value
                            )
                        }
                }
                call.respond(HttpStatusCode.OK, list)
            }

            // GET /routines/assigned  →  rutinas con asignación exclusiva
            //   Modo entrenador (?subscriberId={id}):
            //     devuelve las rutinas creadas por el usuario actual y
            //     asignadas a ese suscriptor.
            //   Modo suscriptor (sin subscriberId, opcional ?byMonitorId={id}):
            //     devuelve las rutinas asignadas al usuario actual,
            //     opcionalmente filtradas por el monitor (Monitor.id) que las creó.
            get("/assigned") {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@get call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")
                val subscriberIdParam = call.request.queryParameters["subscriberId"]?.toIntOrNull()
                val byMonitorIdParam  = call.request.queryParameters["byMonitorId"]?.toIntOrNull()

                val list = transaction {
                    val routines = when {
                        subscriberIdParam != null -> {
                            // Modo entrenador: rutinas creadas por mí y asignadas a ese suscriptor
                            Routine.find {
                                (Routines.creatorId eq userId) and
                                (Routines.assignedToUserId eq subscriberIdParam)
                            }
                        }
                        byMonitorIdParam != null -> {
                            // Modo suscriptor filtrado por monitor
                            val monitor = Monitor.findById(byMonitorIdParam)
                            if (monitor == null) {
                                Routine.find { Routines.creatorId eq -1 } // vacío
                            } else {
                                Routine.find {
                                    (Routines.assignedToUserId eq userId) and
                                    (Routines.creatorId eq monitor.user.id)
                                }
                            }
                        }
                        else -> {
                            // Modo suscriptor sin filtro: todas las asignadas a mí
                            Routine.find { Routines.assignedToUserId eq userId }
                        }
                    }

                    routines.orderBy(Routines.createdAt to SortOrder.DESC).map { r ->
                        RoutineDto(
                            id            = r.id.value,
                            title         = r.title,
                            description   = r.description,
                            difficulty    = r.difficulty,
                            goal          = r.goal,
                            isPublic      = r.isPublic,
                            isPremium     = r.isPremium,
                            creatorId     = r.creator.id.value,
                            creatorName   = r.creator.name,
                            exerciseCount = RoutineExercise.find { RoutineExercises.routineId eq r.id }.count().toInt(),
                            createdAt     = r.createdAt.toString(),
                            assignedToUserId = r.assignedTo?.id?.value
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

                    val isOwner = userId != null && r.creator.id.value == userId
                    val isAssignee = userId != null && r.assignedTo?.id?.value == userId

                    // 0. Si la rutina está asignada en exclusiva a OTRO usuario,
                    //    sólo el creador y el suscriptor asignado pueden verla.
                    if (r.assignedTo != null && !isOwner && !isAssignee) {
                        return@transaction "forbidden"
                    }

                    // 1. Si la rutina es privada y no pertenece al usuario, no se puede ver
                    //    (los suscriptores asignados pasan este filtro).
                    if (!r.isPublic && !isOwner && !isAssignee) {
                        return@transaction "forbidden"
                    }

                    // 2. Si la rutina es Premium y no es del usuario, check suscripción
                    //    (los suscriptores asignados también pueden verla).
                    if (r.isPremium && !isOwner && !isAssignee) {
                        val monitor = Monitor.find { Monitors.userId eq r.creator.id }.firstOrNull()
                        if (monitor != null) {
                            val isSubscribed = Subscription.find {
                                (Subscriptions.userId eq userId!!) and
                                (Subscriptions.monitorId eq monitor.id) and
                                (Subscriptions.status eq SubscriptionStatus.ACTIVE)
                            }.any()
                            if (!isSubscribed) return@transaction "premium_only"
                        } else {
                            // Rutina oficial premium? Requiere que el usuario apoye a algún entrenador
                            val hasAnySub = Subscription.find {
                                (Subscriptions.userId eq userId!!) and
                                (Subscriptions.status eq SubscriptionStatus.ACTIVE)
                            }.any()
                            if (!hasAnySub) return@transaction "premium_only"
                        }
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
                        isPremium   = r.isPremium,
                        creatorId   = r.creator.id.value,
                        creatorName = r.creator.name,
                        createdAt   = r.createdAt.toString(),
                        exercises   = exList,
                        assignedToUserId = r.assignedTo?.id?.value
                    )
                }

                when (detail) {
                    null           -> call.respond(HttpStatusCode.NotFound, "Rutina no encontrada")
                    "forbidden"    -> call.respond(HttpStatusCode.Forbidden, mapOf("error" to "Esta rutina es privada"))
                    "premium_only" -> call.respond(HttpStatusCode.PaymentRequired, mapOf("error" to "Contenido exclusivo para suscriptores de este monitor"))
                    else           -> call.respond(HttpStatusCode.OK, detail)
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

                    // Si se pide assignedToUserId, validar que existe y que el creador
                    // es TRAINER. Si no es TRAINER, ignoramos la asignación.
                    val assignee = if (req.assignedToUserId != null && user.role == UserRole.TRAINER) {
                        User.findById(req.assignedToUserId)
                    } else null

                    val created = Routine.new {
                        title       = req.title.trim()
                        description = req.description?.trim()
                        difficulty  = req.difficulty?.trim()
                        goal        = req.goal?.trim()
                        // Una rutina asignada nunca puede ser pública (es exclusiva)
                        isPublic    = if (assignee != null) false else publicFlag
                        isPremium   = req.isPremium
                        creator     = user
                        assignedTo  = assignee
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

            // --- Asignación de una rutina existente a un suscriptor ---

            // POST /routines/{id}/assign  →  el creador asigna su rutina en exclusiva
            post("/{id}/assign") {
                val routineId = call.parameters["id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.BadRequest, "ID de rutina no válido")
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")

                val req = try {
                    call.receive<AssignRoutineRequest>()
                } catch (e: Exception) {
                    return@post call.respond(HttpStatusCode.BadRequest, "Cuerpo de la petición no válido")
                }

                val result = transaction {
                    val r = Routine.findById(routineId) ?: return@transaction "not_found"
                    if (r.creator.id.value != userId) return@transaction "forbidden"
                    val sub = User.findById(req.subscriberId) ?: return@transaction "subscriber_not_found"
                    r.assignedTo = sub
                    // La rutina pasa a ser exclusiva: deja de ser pública.
                    r.isPublic = false
                    "ok"
                }

                when (result) {
                    "not_found"             -> call.respond(HttpStatusCode.NotFound, mapOf("error" to "Rutina no encontrada"))
                    "forbidden"             -> call.respond(HttpStatusCode.Forbidden, mapOf("error" to "No puedes asignar esta rutina"))
                    "subscriber_not_found"  -> call.respond(HttpStatusCode.NotFound, mapOf("error" to "Suscriptor no encontrado"))
                    else                    -> call.respond(HttpStatusCode.OK, mapOf("message" to "Rutina asignada"))
                }
            }

            // DELETE /routines/{id}/assign?subscriberId={id}  →  retira la asignación
            delete("/{id}/assign") {
                val routineId = call.parameters["id"]?.toIntOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "ID de rutina no válido")
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@delete call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")
                // subscriberId es opcional aquí: si se envía, validamos coincidencia.
                val subscriberId = call.request.queryParameters["subscriberId"]?.toIntOrNull()

                val ok = transaction {
                    val r = Routine.findById(routineId) ?: return@transaction false
                    if (r.creator.id.value != userId) return@transaction false
                    if (subscriberId != null && r.assignedTo?.id?.value != subscriberId) {
                        return@transaction false
                    }
                    r.assignedTo = null
                    true
                }

                if (ok) call.respond(HttpStatusCode.OK, mapOf("message" to "Asignación retirada"))
                else    call.respond(HttpStatusCode.Forbidden, mapOf("error" to "No tienes permiso o no existe esa asignación"))
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
