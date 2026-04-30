package com.example.routes

import com.example.models.*
import com.example.models.dto.AvailabilityDto
import com.example.models.dto.MonitorDetailResponse
import com.example.models.dto.MonitorListItem
import com.example.models.dto.UpdateTrainerProfileRequest
import com.example.models.dto.OccupiedSlotDto
import com.example.models.dto.MonitorProfileResponse
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.*

fun Application.monitorRoutes() {
    routing {
        route("/monitors") {

            // Obtener el monitor del usuario autenticado (solo TRAINER)
            get("/me") {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                if (userId == null) {
                    call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")
                    return@get
                }

                val monitor = transaction {
                    Monitor.find { Monitors.userId eq userId }.firstOrNull()
                }

                if (monitor == null) {
                    call.respond(HttpStatusCode.NotFound, "No se encontró perfil de monitor para este usuario")
                    return@get
                }

                val response = MonitorProfileResponse(
                    monitorId = monitor.id.value,
                    specialty = monitor.specialty,
                    hourlyRate = monitor.hourlyRate?.toDouble() ?: 0.0,
                    bio = monitor.bio ?: ""
                )

                call.respond(HttpStatusCode.OK, response)
            }

            // Actualizar el perfil profesional del monitor autenticado (solo TRAINER)
            post("/me/update") {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                if (userId == null) {
                    call.respond(HttpStatusCode.BadRequest, "Header X-User-Id requerido")
                    return@post
                }

                val req = try {
                    call.receive<UpdateTrainerProfileRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, "Cuerpo de la petición no válido")
                    return@post
                }

                val updatedMonitor = transaction {
                    val monitor = Monitor.find { Monitors.userId eq userId }.firstOrNull()
                    if (monitor != null) {
                        monitor.specialty = req.specialty
                        monitor.bio = req.bio
                        monitor.hourlyRate = req.hourlyRate.toBigDecimal()
                    }
                    monitor
                }

                if (updatedMonitor == null) {
                    call.respond(HttpStatusCode.NotFound, "No se encontró perfil de monitor para este usuario")
                } else {
                    call.respond(HttpStatusCode.OK, mapOf("message" to "Perfil profesional actualizado correctamente"))
                }
            }

            // Obtener todos los monitores
            get {
                val list = transaction {
                    val allMonitors = Monitor.all().toList()
                    allMonitors.map { monitor ->
                        MonitorListItem(
                            id = monitor.id.value,
                            name = monitor.user.name,
                            specialty = monitor.specialty,
                            hourlyRate = monitor.hourlyRate?.toDouble()
                        )
                    }
                }
                call.respond(HttpStatusCode.OK, list)
            }

            // Obtener detalle de un monitor
            get("/{id}") {
                val monitorId = call.parameters["id"]?.toIntOrNull()
                if (monitorId == null) {
                    call.respond(HttpStatusCode.BadRequest, "ID de monitor no valido")
                    return@get
                }

                val detail = transaction {
                    val monitor = Monitor.findById(monitorId) ?: return@transaction null

                    val availabilityList = Availability.find {
                        Availabilities.monitorId eq monitorId
                    }.map {
                        AvailabilityDto(
                            id = it.id.value,
                            monitorId = monitorId,
                            dayOfWeek = it.dayOfWeek.name,
                            startTime = it.startTime.toString(),
                            endTime = it.endTime.toString(),
                            isAvailable = it.isAvailable
                        )
                    }

                    // OBTENER SLOTS OCUPADOS (RESERVAS ACTIVAS)
                    val occupiedSlots = Booking.find {
                        (Bookings.monitorId eq monitorId) and 
                        (Bookings.status neq BookingStatus.CANCELLED)
                    }.map {
                        OccupiedSlotDto(
                            date = it.date.toLocalDate().toString(),
                            startTime = it.startTime
                        )
                    }

                    MonitorDetailResponse(
                        id = monitor.id.value,
                        name = monitor.user.name,
                        specialty = monitor.specialty,
                        hourlyRate = monitor.hourlyRate?.toDouble(),
                        bio = monitor.bio,
                        availability = availabilityList,
                        occupiedSlots = occupiedSlots
                    )
                }

                if (detail == null) {
                    call.respond(HttpStatusCode.NotFound, "Monitor no encontrado")
                } else {
                    call.respond(HttpStatusCode.OK, detail)
                }
            }
        }
    }
}
