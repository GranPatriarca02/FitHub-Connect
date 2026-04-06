package com.example.routes

import com.example.models.*
import com.example.models.dto.BookingRequest
import com.example.models.dto.BookingResponse
import com.example.services.PaymentService
import com.stripe.model.PaymentIntent
import com.stripe.net.Webhook
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.LocalDateTime

fun Application.bookingRoutes() {
    // Cargamos variables de entorno (como las keys de Stripe) sin que pete si falta el .env
    val env = io.github.cdimascio.dotenv.dotenv { ignoreIfMissing = true }

    routing {
        // 1. CREAR RESERVA
        post("/bookings") {
            // Pillamos el ID del usuario de la cabecera; si no viene, cortamos aquí
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Falta ID"))

            val body = call.receive<BookingRequest>()

            // Verificamos de un tirón que tanto el cliente como el monitor existan en la base de datos
            val (user, monitor) = transaction {
                User.findById(userId) to Monitor.findById(body.monitorId)
            }
            
            if (user == null || monitor == null) 
                return@post call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario o Monitor no encontrado"))

            try {
                // Todo este bloque es atómico: o se crea la reserva con su pago o no se hace nada
                val result = transaction {
                    val booking = Booking.new {
                        this.user = user
                        this.monitor = monitor
                        this.date = LocalDateTime.now()
                        this.startTime = body.startTime
                        this.endTime = body.endTime
                        this.status = BookingStatus.PENDING
                        this.notes = body.notes
                        // El precio se saca de la tarifa del monitor en ese momento
                        this.amount = monitor.hourlyRate ?: 0.0.toBigDecimal()
                    }

                    // Generamos el intento de pago en Stripe y vinculamos el ID de la reserva
                    val intent = PaymentService.createPaymentIntent(booking.amount, booking.id.value)
                    booking.paymentId = intent.id

                    // Devolvemos lo justo para que el frontend pueda completar el pago
                    mapOf(
                        "bookingId" to booking.id.value,
                        "clientSecret" to intent.clientSecret
                    )
                }
                call.respond(HttpStatusCode.Created, result)
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, mapOf("error" to (e.message ?: "Error desconocido")))
            }
        }

        // 2. WEBHOOK DE STRIPE (Escucha cuando el pago se confirma fuera de nuestra app)
        post("/bookings/webhook") {
            val payload = call.receiveText()
            val sigHeader = call.request.headers["Stripe-Signature"] ?: ""
            val endpointSecret = env["STRIPE_WEBHOOK_SECRET"] ?: ""
            
            try {
                // Validamos que la petición venga realmente de Stripe y no sea un fake
                val event = Webhook.constructEvent(payload, sigHeader, endpointSecret)

                if ("payment_intent.succeeded" == event.type) {
                    val dataObject = event.dataObjectDeserializer.`object`.orElse(null)
                    if (dataObject is PaymentIntent) {
                        // Recuperamos el ID de reserva que guardamos en los metadatos de Stripe
                        val bId = dataObject.metadata["bookingId"]?.toIntOrNull()
                        transaction {
                            bId?.let { id ->
                                Booking.findById(id)?.let { 
                                    it.status = BookingStatus.CONFIRMED
                                    // Al pagar una reserva, subimos al usuario a categoría Premium
                                    it.user.role = UserRole.PREMIUM 
                                }
                            }
                        }
                    }
                }
                call.respond(HttpStatusCode.OK)
            } catch (e: Exception) {
                call.respond(HttpStatusCode.BadRequest, "Error en el Webhook")
            }
        }

        // 3. OBTENER RESERVAS DE UN USUARIO
        get("/bookings/user/{userId}") {
            val userId = call.parameters["userId"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, "ID inválido")

            val result = transaction {
                // Buscamos todas las reservas asociadas al usuario y las mapeamos al DTO de respuesta
                Booking.find { Bookings.userId eq userId }.map { b ->
                    BookingResponse(
                        bookingId = b.id.value,
                        monitorId = b.monitor.id.value,
                        monitorName = b.monitor.user.name,
                        date = b.date.toString(),
                        startTime = b.startTime,
                        endTime = b.endTime,
                        status = b.status.name,
                        notes = b.notes ?: ""
                    )
                }
            }
            call.respond(result)
        }

        // 4. ACTUALIZAR ESTADO (Para cancelar, completar, etc.)
        patch("/bookings/{id}/status") {
            val bId = call.parameters["id"]?.toIntOrNull()
            val body = call.receive<Map<String, String>>()
            val newStatusStr = body["status"]?.uppercase() ?: ""

            val success = transaction {
                val b = Booking.findById(bId ?: -1)
                if (b != null) {
                    try {
                        // Intentamos convertir el string a un enum válido
                        b.status = BookingStatus.valueOf(newStatusStr)
                        true
                    } catch (e: Exception) { false }
                } else false
            }

            if (success) call.respond(mapOf("message" to "Estado actualizado"))
            else call.respond(HttpStatusCode.BadRequest, "No se pudo actualizar")
        }
    }
}