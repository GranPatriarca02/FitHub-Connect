package com.example.routes

import com.example.models.Booking
import com.example.models.BookingStatus
import com.example.models.Bookings
import com.example.models.Monitor
import com.example.models.User
import com.example.models.UserRole
import com.example.models.dto.BookingRequest
import com.example.models.dto.BookingResponse
import com.example.services.PaymentService // Importamos el servicio de Stripe
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

fun Application.bookingRoutes() {
    routing {

        // Crear una nueva reserva de sesion (Integrado con Stripe)
        post("/bookings") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Falta la cabecera X-User-Id."))

            val user = transaction { User.findById(userId) }
                ?: return@post call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario no encontrado."))

            // Solo permitimos el rol PREMIUM)
            if (user.role != UserRole.CLIENT_PREMIUM) {
                call.respond(
                    HttpStatusCode.Forbidden,
                    mapOf("error" to "Necesitas una suscripción activa para poder reservar sesiones")
                )
                return@post
            }

            // Transformamos JSON que envia la app al objeto que entiende Kotlin.
            val body = call.receive<BookingRequest>()

            val monitor = transaction { Monitor.findById(body.monitorId) }
                ?: return@post call.respond(HttpStatusCode.NotFound, mapOf("error" to "Monitor no encontrado."))

            val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            val fechaHora = LocalDateTime.parse("${body.date} ${body.startTime}", formatter)

            try {
                val response = transaction {
                    // 1. Creamos la reserva en la base de datos (Exposed)
                    val booking = Booking.new {
                        this.user = user
                        this.monitor = monitor
                        this.date = fechaHora
                        this.startTime = body.startTime
                        this.endTime = body.endTime
                        this.status = BookingStatus.PENDING
                        this.notes = body.notes
                        this.amount = monitor.hourlyRate ?: 0.0.toBigDecimal() // Guardamos el precio
                    }

                    // 2. Creamos el intento de pago en Stripe
                    val intent = PaymentService.createPaymentIntent(
                        amount = booking.amount,
                        bookingId = booking.id.value
                    )

                    // 3. Guardamos el ID del pago en nuestra reserva
                    booking.paymentId = intent.id

                    // 4. Preparamos la respuesta para la App (incluye clientSecret)
                    mapOf(
                        "bookingId" to booking.id.value,
                        "monitorName" to monitor.user.name,
                        "clientSecret" to intent.clientSecret, // LLAVE PARA EL FRONTEND
                        "amount" to booking.amount.toDouble(),
                        "status" to booking.status.name
                    )
                }
                // Respondemos al cliente.
                call.respond(HttpStatusCode.Created, response)

            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, mapOf("error" to "Error al procesar el pago: ${e.message}"))
            }
        }

        // Ver reservas de un cliente
        get("/bookings/user/{userId}") {
            val userId = call.parameters["userId"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID no valido."))

            val bookings = transaction {
                Booking.find { Bookings.userId eq userId }.map { b ->
                    BookingResponse(
                        bookingId = b.id.value,
                        monitorId = b.monitor.id.value,
                        monitorName = b.monitor.user.name,
                        date = b.date.toLocalDate().toString(),
                        startTime = b.startTime,
                        endTime = b.endTime,
                        status = b.status.name,
                        notes = b.notes
                    )
                }
            }

            call.respond(bookings)
        }

        // Ver reservas que tiene asignadas un entrenador
        get("/bookings/monitor/{monitorId}") {
            val monitorId = call.parameters["monitorId"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID no valido."))

            val bookings = transaction {
                Booking.find { Bookings.monitorId eq monitorId }.map { b ->
                    BookingResponse(
                        bookingId = b.id.value,
                        monitorId = b.monitor.id.value,
                        monitorName = b.monitor.user.name,
                        date = b.date.toLocalDate().toString(),
                        startTime = b.startTime,
                        endTime = b.endTime,
                        status = b.status.name,
                        notes = b.notes
                    )
                }
            }

            call.respond(bookings)
        }

        // Aceptar o rechazar una reserva
        patch("/bookings/{id}/status") {
            val bookingId = call.parameters["id"]?.toIntOrNull()
                ?: return@patch call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID no valido."))

            val body = call.receive<Map<String, String>>()
            val newStatus = body["status"]?.let {
                try { BookingStatus.valueOf(it.uppercase()) }
                catch (e: IllegalArgumentException) { null }
            } ?: return@patch call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Estado no valido."))

            val booking = transaction { Booking.findById(bookingId) }
                ?: return@patch call.respond(HttpStatusCode.NotFound, mapOf("error" to "Reserva no encontrada."))

            transaction { booking.status = newStatus }

            call.respond(mapOf("message" to "Estado actualizado a ${newStatus.name}."))
        }
    }
}