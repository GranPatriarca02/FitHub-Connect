package com.example.routes

import com.example.models.*
import com.example.models.dto.BookingRequest
import com.example.models.dto.BookingResponse
import com.example.services.PaymentService
import com.stripe.Stripe
import com.stripe.model.PaymentIntent
import com.stripe.model.checkout.Session
import com.stripe.param.checkout.SessionCreateParams
import com.stripe.net.Webhook
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.LocalDateTime

fun Application.bookingRoutes() {
    // 1. Cargamos las variables del archivo .env
    val env = io.github.cdimascio.dotenv.dotenv { ignoreIfMissing = true }

    // 2. CONFIGURACIÓN CRÍTICA: Asignamos la clave secreta de Stripe globalmente
    // Esto soluciona el error "No API key provided"
    Stripe.apiKey = env["STRIPE_SECRET_KEY"] ?: "sk_test_tu_clave_aqui"

    routing {
        // --- 1. CREAR RESERVA (Nativo) ---
        post("/bookings") {
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Falta ID"))

            val body = call.receive<BookingRequest>()

            val (user, monitor) = transaction {
                User.findById(userId) to Monitor.findById(body.monitorId)
            }
            
            if (user == null || monitor == null) 
                return@post call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario o Monitor no encontrado"))

            try {
                val result = transaction {
                    val booking = Booking.new {
                        this.user = user
                        this.monitor = monitor
                        this.date = LocalDateTime.now()
                        this.startTime = body.startTime
                        this.endTime = body.endTime
                        this.status = BookingStatus.PENDING
                        this.notes = body.notes
                        this.amount = monitor.hourlyRate ?: 0.0.toBigDecimal()
                    }

                    val intent = PaymentService.createPaymentIntent(booking.amount, booking.id.value)
                    booking.paymentId = intent.id

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

        // --- 2. CREAR SESIÓN DE CHECKOUT (Web) ---
        post("/create-checkout-session") {
            try {
                val rawBody = call.receiveText()
                val request = io.ktor.serialization.kotlinx.json.DefaultJson.decodeFromString<Map<String, kotlinx.serialization.json.JsonElement>>(rawBody)
                
                val monitorName = request["monitorName"]?.toString()?.replace("\"", "") ?: "Monitor"
                val priceString = request["price"]?.toString()?.replace("\"", "") ?: "0.0"
                val price = priceString.toDoubleOrNull() ?: 0.0

                val params = SessionCreateParams.builder()
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl("http://localhost:8081/home?payment=success")
                    .setCancelUrl("http://localhost:8081/monitor-detail")
                    .addLineItem(
                        SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(
                                SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency("eur")
                                    .setUnitAmount((price * 100).toLong())
                                    .setProductData(
                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName("Sesión con $monitorName")
                                            .build()
                                    )
                                    .build()
                            )
                            .build()
                    )
                    .build()

                val session = Session.create(params)
                call.respond(mapOf("url" to session.url))
                
            } catch (e: Exception) {
                println("ERROR CRÍTICO STRIPE: ${e.localizedMessage}")
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to (e.message ?: "Error desconocido")))
            }
        }

        // --- 3. WEBHOOK ---
        post("/bookings/webhook") {
            val payload = call.receiveText()
            val sigHeader = call.request.headers["Stripe-Signature"] ?: ""
            val endpointSecret = env["STRIPE_WEBHOOK_SECRET"] ?: ""
            
            try {
                val event = Webhook.constructEvent(payload, sigHeader, endpointSecret)

                if ("payment_intent.succeeded" == event.type) {
                    val dataObject = event.dataObjectDeserializer.`object`.orElse(null)
                    if (dataObject is PaymentIntent) {
                        val bId = dataObject.metadata["bookingId"]?.toIntOrNull()
                        transaction {
                            bId?.let { id ->
                                Booking.findById(id)?.let { 
                                    it.status = BookingStatus.CONFIRMED
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

        // --- 4. OBTENER RESERVAS ---
        get("/bookings/user/{userId}") {
            val userId = call.parameters["userId"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, "ID inválido")

            val result = transaction {
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
    }
}