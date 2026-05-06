package com.example.routes

import com.example.models.*
import com.example.models.dto.BookingRequest
import com.example.models.dto.BookingResponse
import com.example.models.dto.CheckoutResponse
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
import org.jetbrains.exposed.sql.*
import java.time.LocalDateTime
import java.time.LocalDate

fun Application.bookingRoutes() {
    // 1. Cargamos las variables del archivo .env
    val env = io.github.cdimascio.dotenv.dotenv { ignoreIfMissing = true }

    // 2. CONFIGURACIÓN CRÍTICA: Asignamos la clave secreta de Stripe globalmente
    // Esto soluciona el error "No API key provided"
    Stripe.apiKey = env["STRIPE_SECRET_KEY"] ?: System.getenv("STRIPE_SECRET_KEY") ?: "sk_test_tu_clave_aqui"

    // 3. URL del frontend para los redirects de Stripe Checkout
    val frontendUrl = env["FRONTEND_URL"] ?: System.getenv("FRONTEND_URL") ?: "https://fithub.vps.webdock.cloud"

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
                    val bookingDateTime = LocalDateTime.parse("${body.date}T${body.startTime}:00")

                    // VALIDACIÓN ANTI-DUPLICADOS
                    val existing = Booking.find {
                        (Bookings.monitorId eq body.monitorId) and 
                        (Bookings.date eq bookingDateTime) and 
                        (Bookings.status neq BookingStatus.CANCELLED)
                    }.firstOrNull()

                    if (existing != null) {
                        throw Exception("Este horario ya está reservado. Por favor, elige otro.")
                    }

                    val isPremium = user.role == UserRole.PREMIUM

                    val booking = Booking.new {
                        this.user = user
                        this.monitor = monitor
                        this.date = bookingDateTime
                        this.startTime = body.startTime
                        this.endTime = body.endTime
                        this.status = if (isPremium) BookingStatus.CONFIRMED else BookingStatus.PENDING
                        this.notes = body.notes
                        this.amount = if (isPremium) 0.0.toBigDecimal() else (monitor.hourlyRate ?: 0.0.toBigDecimal())
                    }

                    if (isPremium) {
                        CheckoutResponse(
                            bookingId = booking.id.value,
                            clientSecret = null, // No se requiere pago
                            amount = 0.0
                        )
                    } else {
                        val intent = PaymentService.createPaymentIntent(booking.amount, booking.id.value, userId)
                        booking.paymentId = intent.id

                        CheckoutResponse(
                            bookingId = booking.id.value,
                            clientSecret = intent.clientSecret,
                            amount = booking.amount.toDouble()
                        )
                    }
                }
                call.respond(HttpStatusCode.Created, result)
            } catch (e: Exception) {
                // LIMPIEZA DE RESERVA FANTASMA
                transaction {
                   // Intentamos borrar la reserva que acabamos de crear si falló Stripe
                   Booking.find { 
                       (Bookings.userId eq userId) and (Bookings.status eq BookingStatus.PENDING) 
                   }.sortedByDescending { it.id.value }.firstOrNull()?.delete()
                }
                call.respond(HttpStatusCode.InternalServerError, mapOf("error" to (e.message ?: "Error desconocido")))
            }
        }

        // --- 2. CREAR SESIÓN DE CHECKOUT (Web) ---
        post("/create-checkout-session") {
            try {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Falta ID de usuario"))

                val rawBody = call.receiveText()
                val request = io.ktor.serialization.kotlinx.json.DefaultJson.decodeFromString<Map<String, kotlinx.serialization.json.JsonElement>>(rawBody)
                
                val monitorId = request["monitorId"]?.toString()?.replace("\"", "")?.toIntOrNull() ?: 1
                val monitorName = request["monitorName"]?.toString()?.replace("\"", "") ?: "Monitor"
                val priceString = request["price"]?.toString()?.replace("\"", "") ?: "0.0"
                val price = priceString.toDoubleOrNull() ?: 0.0

                // 1. Verificar si el usuario es Premium
                val (user, monitor) = transaction {
                    User.findById(userId) to Monitor.findById(monitorId)
                }

                if (user == null || monitor == null)
                    return@post call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario o Monitor no encontrado"))

                if (user.role == UserRole.PREMIUM) {
                    val dateStr = request["date"]?.toString()?.replace("\"", "") ?: LocalDate.now().toString()
                    val hourStr = request["startTime"]?.toString()?.replace("\"", "") ?: "10:00"
                    val bDateTime = LocalDateTime.parse("${dateStr}T${hourStr}:00")

                    // VALIDACIÓN ANTI-DUPLICADOS (Web Premium)
                    val alreadyBooked = transaction {
                        Booking.find {
                            (Bookings.monitorId eq monitorId) and 
                            (Bookings.date eq bDateTime) and 
                            (Bookings.status neq BookingStatus.CANCELLED)
                        }.any()
                    }

                    if (alreadyBooked) {
                        return@post call.respond(HttpStatusCode.Conflict, mapOf("error" to "Este horario ya está reservado."))
                    }

                    // Si es PREMIUM, creamos la reserva directamente y no abrimos Stripe
                    transaction {
                        Booking.new {
                            this.user = user
                            this.monitor = monitor
                            this.date = bDateTime
                            this.startTime = hourStr
                            this.endTime = request["endTime"]?.toString()?.replace("\"", "") ?: "11:00"
                            this.status = BookingStatus.CONFIRMED
                            this.amount = 0.0.toBigDecimal()
                        }
                    }
                    return@post call.respond(mapOf("url" to null, "message" to "Reserva gratuita confirmada (Premium)"))
                }

                // 2. Si no es Premium, flujo normal de Stripe
                val bookingId = transaction {
                    val dateStr = request["date"]?.toString()?.replace("\"", "") ?: LocalDate.now().toString()
                    val hourStr = request["startTime"]?.toString()?.replace("\"", "") ?: "10:00"
                    val bDateTime = LocalDateTime.parse("${dateStr}T${hourStr}:00")

                    Booking.new {
                        this.user = user
                        this.monitor = monitor
                        this.date = bDateTime
                        this.startTime = hourStr
                        this.endTime = request["endTime"]?.toString()?.replace("\"", "") ?: "11:00"
                        this.status = BookingStatus.PENDING
                        this.amount = price.toBigDecimal()
                    }.id.value
                }

                val webReturnUrl = request["webReturnUrl"]?.toString()?.replace("\"", "") ?: ""

                val backendUrl = env["BACKEND_URL"] ?: "http://localhost:8080"
                // Si viene de la web, Stripe redirige directo a la app web (sin página intermedia)
                val successUrl = if (webReturnUrl.isNotEmpty()) {
                    "${webReturnUrl}/?payment=success&monitorId=${monitorId}"
                } else {
                    "${backendUrl}/payment-success?monitorId=${monitorId}"
                }
                val cancelUrl = if (webReturnUrl.isNotEmpty()) {
                    "${webReturnUrl}/?payment=cancelled&monitorId=${monitorId}"
                } else {
                    "${backendUrl}/payment-cancel?monitorId=${monitorId}"
                }

                val params = SessionCreateParams.builder()
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(successUrl)
                    .setCancelUrl(cancelUrl)
                    .putMetadata("userId", userId.toString())
                    .putMetadata("bookingId", bookingId.toString())
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

                // 1. Manejo de PaymentIntent (Flujo Nativo — Reservas y Suscripciones)
                if ("payment_intent.succeeded" == event.type) {
                    val dataObject = event.dataObjectDeserializer.`object`.orElse(null)
                    if (dataObject is PaymentIntent) {
                        val bId  = dataObject.metadata["bookingId"]?.toIntOrNull()
                        val uId  = dataObject.metadata["userId"]?.toIntOrNull()
                        val mId  = dataObject.metadata["monitorId"]?.toIntOrNull()
                        val type = dataObject.metadata["type"]

                        transaction {
                            // Confirmar reserva si existe
                            bId?.let { id -> Booking.findById(id)?.let { it.status = BookingStatus.CONFIRMED } }

                            // Si es una suscripción a entrenador, activarla
                            if (type == "TRAINER_SUBSCRIPTION" && uId != null && mId != null) {
                                val user    = User.findById(uId)
                                val monitor = Monitor.findById(mId)
                                if (user != null && monitor != null) {
                                    // Cancelar suscripciones previas al mismo entrenador
                                    Subscription.find {
                                        (Subscriptions.userId    eq uId) and
                                        (Subscriptions.monitorId eq mId)
                                    }.forEach { it.status = SubscriptionStatus.CANCELLED }

                                    // Crear la suscripción activa por 1 mes
                                    Subscription.new {
                                        this.user      = user
                                        this.monitor   = monitor
                                        this.status    = SubscriptionStatus.ACTIVE
                                        this.expiresAt = java.time.LocalDateTime.now().plusMonths(1)
                                        this.paymentId = dataObject.id
                                    }
                                    
                                    // Actualizar el rol del usuario a PREMIUM para que toda la app lo reconozca
                                    user.role = UserRole.PREMIUM
                                }
                            }
                            // NOTA: pagar una reserva normal NO cambia el rol del usuario a PREMIUM
                        }
                    }
                }
                
                // 2. Manejo de Checkout Session (Flujo Web / Suscripciones)
                if ("checkout.session.completed" == event.type) {
                    val session = event.dataObjectDeserializer.`object`.orElse(null) as? Session
                    val uId = session?.metadata?.get("userId")?.toIntOrNull()
                    val bId = session?.metadata?.get("bookingId")?.toIntOrNull()
                    
                    transaction {
                        // Activamos Premium si es necesario
                        uId?.let { id -> User.findById(id)?.let { it.role = UserRole.PREMIUM } }
                        // Confirmamos la reserva si existe
                        bId?.let { id -> Booking.findById(id)?.let { it.status = BookingStatus.CONFIRMED } }
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

        // --- 3. CREAR SESIÓN PARA SUSCRIPCIÓN ILIMITADA ---
        post("/create-subscription-session") {
            try {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Falta ID de usuario"))

                // Para la suscripción ilimitada, usamos un precio fijo
                val price = 29.99

                // Leer el body para obtener webReturnUrl
                val rawBody = call.receiveText()
                val webReturnUrl = try {
                    val request = io.ktor.serialization.kotlinx.json.DefaultJson.decodeFromString<Map<String, kotlinx.serialization.json.JsonElement>>(rawBody)
                    request["webReturnUrl"]?.toString()?.replace("\"", "") ?: ""
                } catch (_: Exception) { "" }

                val backendUrl = env["BACKEND_URL"] ?: "http://localhost:8080"
                // Si viene de la web, Stripe redirige directo a la app web
                val successUrl = if (webReturnUrl.isNotEmpty()) {
                    "${webReturnUrl}/?payment=success"
                } else {
                    "${backendUrl}/payment-success"
                }
                val cancelUrl = if (webReturnUrl.isNotEmpty()) {
                    "${webReturnUrl}/?payment=cancelled"
                } else {
                    "${backendUrl}/payment-cancel"
                }

                val params = SessionCreateParams.builder()
                    .addPaymentMethodType(SessionCreateParams.PaymentMethodType.CARD)
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(successUrl)
                    .setCancelUrl(cancelUrl)
                    .putMetadata("userId", userId.toString())
                    .putMetadata("type", "PREMIUM_PASS")
                    .addLineItem(
                        SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(
                                SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency("eur")
                                    .setUnitAmount((price * 100).toLong())
                                    .setProductData(
                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName("Pase Ilimitado FitHub Connect")
                                            .setDescription("Acceso total a todas las clases y contenido premium")
                                            .build()
                                    )
                                    .build()
                            )
                            .build()
                    )
                    .build()

                val session = Session.create(params)
                call.respond(HttpStatusCode.OK, mapOf("url" to session.url))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, mapOf("error" to (e.message ?: "Error al crear sesión de suscripción")))
            }
        }
        // --- 4. CONFIRMAR SUSCRIPCIÓN PREMIUM ---
        post("/confirm-premium") {
            try {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Falta ID de usuario"))

                transaction {
                    val user = User.findById(userId)
                    if (user != null) {
                        user.role = UserRole.PREMIUM
                    }
                }
                call.respond(HttpStatusCode.OK, mapOf("message" to "Usuario actualizado a PREMIUM"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, mapOf("error" to (e.message ?: "Error al confirmar premium")))
            }
        }
    }
}