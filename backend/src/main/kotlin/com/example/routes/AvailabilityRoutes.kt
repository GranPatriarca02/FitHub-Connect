package com.example.routes

import com.example.models.Availabilities
import com.example.models.Availability
import com.example.models.Monitor
import com.example.models.Monitors
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

private fun isHalfHourAligned(t: LocalTime): Boolean =
    t.second == 0 && t.nano == 0 && (t.minute == 0 || t.minute == 30)

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
                    Availability.find {
                        (Availabilities.monitorId eq monitorId) and
                        (Availabilities.isAvailable eq true)
                    }.map {
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

            // Crear (o eliminar) una franja horaria.
            //
            // Comportamiento:
            //  - isAvailable=true  -> INSERTA siempre una nueva franja (permite varias por dia).
            //  - isAvailable=false -> elimina las franjas que casen exactamente con esa hora.
            //
            // Validaciones:
            //  - start/end alineadas a bloques de 30 min.
            //  - start < end.
            //  - No solapa con otras franjas del mismo dia.
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

                val day = try {
                    DayOfWeek.valueOf(req.dayOfWeek.uppercase())
                } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Dia de la semana invalido"))
                    return@post
                }

                val start = try { LocalTime.parse(req.startTime) } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Hora de inicio invalida"))
                    return@post
                }
                val end = try { LocalTime.parse(req.endTime) } catch (e: Exception) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Hora de fin invalida"))
                    return@post
                }

                if (!isHalfHourAligned(start) || !isHalfHourAligned(end)) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Las horas deben estar alineadas a bloques de 30 min"))
                    return@post
                }
                if (!start.isBefore(end)) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "El inicio debe ser anterior al fin"))
                    return@post
                }

                val result = transaction {
                    val monitor = Monitor.findById(monitorId) ?: return@transaction "NOT_FOUND"

                    val existentesDia = Availability.find {
                        (Availabilities.monitorId eq monitorId) and
                        (Availabilities.dayOfWeek eq day) and
                        (Availabilities.isAvailable eq true)
                    }.toList()

                    if (!req.isAvailable) {
                        // Compatibilidad con el flujo antiguo de borrado por rango exacto.
                        existentesDia.filter { it.startTime == start && it.endTime == end }
                            .forEach { it.delete() }
                        return@transaction "OK"
                    }

                    // Validar solapamiento con franjas existentes del mismo dia.
                    val solapa = existentesDia.any { f ->
                        start.isBefore(f.endTime) && end.isAfter(f.startTime)
                    }
                    if (solapa) return@transaction "OVERLAP"

                    Availability.new {
                        this.monitor = monitor
                        this.dayOfWeek = day
                        this.startTime = start
                        this.endTime = end
                        this.isAvailable = true
                    }
                    "OK"
                }

                when (result) {
                    "NOT_FOUND" -> call.respond(HttpStatusCode.NotFound, mapOf("error" to "Monitor no encontrado"))
                    "OVERLAP"   -> call.respond(HttpStatusCode.Conflict, mapOf("error" to "La franja se solapa con otra ya existente"))
                    else        -> call.respond(HttpStatusCode.OK, mapOf("message" to "Disponibilidad actualizada correctamente"))
                }
            }

            // Borrar una franja concreta por id.
            delete("/{availabilityId}") {
                val availabilityId = call.parameters["availabilityId"]?.toIntOrNull()
                if (availabilityId == null) {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Id de franja invalido"))
                    return@delete
                }

                val result = transaction {
                    val a = Availability.findById(availabilityId) ?: return@transaction false
                    a.delete()
                    true
                }

                if (result) call.respond(HttpStatusCode.OK, mapOf("message" to "Franja eliminada"))
                else call.respond(HttpStatusCode.NotFound, mapOf("error" to "Franja no encontrada"))
            }
        }
    }
}
