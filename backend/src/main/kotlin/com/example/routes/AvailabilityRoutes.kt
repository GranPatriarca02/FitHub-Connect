package com.example.routes

import com.example.models.Availabilities
import com.example.models.Availability
import com.example.models.Monitor
import com.example.models.dto.AvailabilityDto
import com.example.models.dto.UpdateAvailabilityRequest
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.DayOfWeek
import java.time.LocalTime

fun Application.availabilityRoutes() {
    routing {
        route("/availability") {
            // Obtener horarios disponibles
            get("/{monitorId}") {
                val monitorId = call.parameters["monitorId"]?.toIntOrNull()
                if (monitorId == null) {
                    call.respond(HttpStatusCode.BadRequest, "ID de monitor no valido")
                    return@get
                }

                val availabilityList = transaction {
                    Availability.find { Availabilities.monitorId eq monitorId }.map {
                        AvailabilityDto(
                            id = it.id.value,
                            monitorId = it.monitor.id.value,
                            dayOfWeek = it.dayOfWeek.name,
                            startTime = it.startTime.toString(),
                            endTime = it.endTime.toString(),
                            isAvailable = it.isAvailable
                        )
                    }
                }

                call.respond(HttpStatusCode.OK, availabilityList)
            }

            // Guardar disponibilidad
            post("/{monitorId}/update") {
                val monitorId = call.parameters["monitorId"]?.toIntOrNull()
                if (monitorId == null) {
                    call.respond(HttpStatusCode.BadRequest, "ID de monitor no valido")
                    return@post
                }
                
                val req = try {
                    call.receive<UpdateAvailabilityRequest>()
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, "Cuerpo de la peticion no valido")
                    return@post
                }

                val day = DayOfWeek.valueOf(req.dayOfWeek.uppercase())
                val start = LocalTime.parse(req.startTime)
                val end = LocalTime.parse(req.endTime)

                transaction {
                    // Validar monitor
                    val monitor = Monitor.findById(monitorId) ?: return@transaction

                    // Guardar horario
                    val existing = Availability.find { 
                        (Availabilities.monitorId eq monitorId) and (Availabilities.dayOfWeek eq day) 
                    }.firstOrNull()

                    if (existing != null) {
                        existing.startTime = start
                        existing.endTime = end
                        existing.isAvailable = req.isAvailable
                    } else {
                        Availability.new {
                            this.monitor = monitor
                            this.dayOfWeek = day
                            this.startTime = start
                            this.endTime = end
                            this.isAvailable = req.isAvailable
                        }
                    }
                }

                call.respond(HttpStatusCode.OK, mapOf("message" to "Disponibilidad actualizada correctamente"))
            }
        }
    }
}
