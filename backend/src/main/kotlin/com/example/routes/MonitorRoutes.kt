package com.example.routes

import com.example.models.*
import com.example.models.dto.AvailabilityDto
import com.example.models.dto.MonitorDetailResponse
import com.example.models.dto.MonitorListItem
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.*
import com.example.models.dto.OccupiedSlotDto

fun Application.monitorRoutes() {
    routing {
        route("/monitors") {

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
