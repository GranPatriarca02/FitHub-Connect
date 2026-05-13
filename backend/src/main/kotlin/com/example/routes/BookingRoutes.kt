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
import java.time.Duration
import java.time.LocalDateTime
import java.time.LocalDate
import java.time.LocalTime

// === Helpers de validacion de reservas ===
private fun isHalfHourAligned(t: LocalTime): Boolean =
    t.second == 0 && t.nano == 0 && (t.minute == 0 || t.minute == 30)

/**
 * Valida una reserva de usuario:
 *  - start/end alineados a bloques de 30 min
 *  - start < end
 *  - duracion entre 60 y 180 minutos
 *  - encaja dentro de ALGUNA franja del entrenador ese dia
 *  - no solapa con otras reservas activas del entrenador ese dia
 *
 * Devuelve el numero de horas (Double, p.ej. 1.5) cuando es valida,
 * o lanza IllegalArgumentException con el mensaje al usuario.
 */
private fun validateBookingSlot(
    monitorId: Int,
    dateStr: String,
    startStr: String,
    endStr: String
): Double {
    val date = try { LocalDate.parse(dateStr) }
    catch (e: Exception) { throw IllegalArgumentException("Fecha invalida") }

    val start = try { LocalTime.parse(startStr) }
    catch (e: Exception) { throw IllegalArgumentException("Hora de inicio invalida") }

    val end = try { LocalTime.parse(endStr) }
    catch (e: Exception) { throw IllegalArgumentException("Hora de fin invalida") }

    if (!isHalfHourAligned(start) || !isHalfHourAligned(end))
        throw IllegalArgumentException("Las horas deben estar alineadas a bloques de 30 min")

    if (!start.isBefore(end))
        throw IllegalArgumentException("El inicio debe ser anterior al fin")

    val minutes = Duration.between(start, end).toMinutes()
    if (minutes < 60 || minutes > 180)
        throw IllegalArgumentException("La reserva debe ser de entre 1 y 3 horas")

    // Encaja en alguna franja del entrenador ese dia?
    val franjas = com.example.models.Availability.find {
        (com.example.models.Availabilities.monitorId eq monitorId) and
        (com.example.models.Availabilities.dayOfWeek eq date.dayOfWeek) and
        (com.example.models.Availabilities.isAvailable eq true)
    }.toList()
    val encaja = franjas.any { f ->
        !start.isBefore(f.startTime) && !end.isAfter(f.endTime)
    }
    if (!encaja)
        throw IllegalArgumentException("La reserva debe estar dentro de la disponibilidad del entrenador")

    // No solapa con otra reserva activa?
    val solapa = Booking.find {
        (Bookings.monitorId eq monitorId) and
        (Bookings.status neq BookingStatus.CANCELLED)
    }.filter { it.date.toLocalDate() == date }.any { b ->
        val bs = LocalTime.parse(b.startTime)
        val be = LocalTime.parse(b.endTime)
        start.isBefore(be) && end.isAfter(bs)
    }
    if (solapa) throw IllegalArgumentException("Este horario ya esta reservado")

    return minutes / 60.0  // 1.0, 1.5, 2.0, 2.5, 3.0
}

/**
 * Verifica si el usuario tiene una suscripción activa con este monitor específico.
 */
private fun isSubscribedToMonitor(userId: Int, monitorId: Int): Boolean {
    return transaction {
        Subscription.find {
            (Subscriptions.userId eq userId) and
            (Subscriptions.monitorId eq monitorId) and
            (Subscriptions.status eq SubscriptionStatus.ACTIVE)
        }.any { sub ->
            sub.expiresAt == null || sub.expiresAt!!.isAfter(LocalDateTime.now())
        }
    }
}

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

                    // Validacion completa: alineacion 30 min, duracion 1-3h,
                    // encaje en franja, sin solape. Devuelve horas (1.0..3.0 en saltos de 0.5).
                    val horas = validateBookingSlot(
                        monitorId = body.monitorId,
                        dateStr = body.date,
                        startStr = body.startTime,
                        endStr = body.endTime
                    )

                    // Un usuario tiene reserva gratis si:
                    // 1. Está suscrito a ESTE monitor específico
                    val isFree = isSubscribedToMonitor(userId, body.monitorId)
                    
                    val hourlyRate = monitor.hourlyRate?.toDouble() ?: 0.0
                    // Precio = horas * tarifa/h (1h30 = 1.5x, 2h30 = 2.5x, etc.)
                    val precioTotal = (horas * hourlyRate).toBigDecimal()

                    val booking = Booking.new {
                        this.user = user
                        this.monitor = monitor
                        this.date = bookingDateTime
                        this.startTime = body.startTime
                        this.endTime = body.endTime
                        this.status = if (isFree) BookingStatus.CONFIRMED else BookingStatus.PENDING
                        this.notes = body.notes
                        this.amount = if (isFree) 0.0.toBigDecimal() else precioTotal
                    }

                    if (isFree) {
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
            } catch (e: IllegalArgumentException) {
                // Validacion fallida (alineacion, duracion, encaje, solape...)
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to (e.message ?: "Reserva no valida")))
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

                // 1. Verificar usuario / monitor
                val (user, monitor) = transaction {
                    User.findById(userId) to Monitor.findById(monitorId)
                }

                if (user == null || monitor == null)
                    return@post call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario o Monitor no encontrado"))

                val dateStr = request["date"]?.toString()?.replace("\"", "") ?: LocalDate.now().toString()
                val hourStr = request["startTime"]?.toString()?.replace("\"", "") ?: "10:00"
                val endStr  = request["endTime"]?.toString()?.replace("\"", "") ?: "11:00"

                // Validacion completa + calculo del precio en servidor
                val horas = try {
                    transaction {
                        validateBookingSlot(
                            monitorId = monitorId,
                            dateStr = dateStr,
                            startStr = hourStr,
                            endStr = endStr
                        )
                    }
                } catch (e: IllegalArgumentException) {
                    return@post call.respond(HttpStatusCode.BadRequest, mapOf("error" to (e.message ?: "Reserva no valida")))
                }

                val hourlyRate = monitor.hourlyRate?.toDouble() ?: 0.0
                val price = horas * hourlyRate

                val isFree = isSubscribedToMonitor(userId, monitorId)

                if (isFree) {
                    val bDateTime = LocalDateTime.parse("${dateStr}T${hourStr}:00")

                    // Si es PREMIUM (global o por monitor), creamos la reserva directamente
                    transaction {
                        Booking.new {
                            this.user = user
                            this.monitor = monitor
                            this.date = bDateTime
                            this.startTime = hourStr
                            this.endTime = endStr
                            this.status = BookingStatus.CONFIRMED
                            this.amount = 0.0.toBigDecimal()
                        }
                    }
                    return@post call.respond(mapOf("url" to "", "message" to "Reserva gratuita confirmada"))
                }

                // 2. Si no es Premium, flujo normal de Stripe
                val bookingId = transaction {
                    val bDateTime = LocalDateTime.parse("${dateStr}T${hourStr}:00")

                    Booking.new {
                        this.user = user
                        this.monitor = monitor
                        this.date = bDateTime
                        this.startTime = hourStr
                        this.endTime = endStr
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

                            // 1. Si es una suscripción a entrenador, activarla
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
                    val mId = session?.metadata?.get("monitorId")?.toIntOrNull()
                    val type = session?.metadata?.get("type")
                    
                    transaction {
                        // Confirmamos la reserva si existe
                        bId?.let { id -> Booking.findById(id)?.let { it.status = BookingStatus.CONFIRMED } }

                        // Si es una suscripción a entrenador desde la WEB, activarla
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
                                    this.paymentId = session.id
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


        // --- 4. CANCELAR/BORRAR RESERVA PENDIENTE ---
        delete("/bookings/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.BadRequest, "ID inválido")
            val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                ?: return@delete call.respond(HttpStatusCode.Unauthorized, "Falta ID de usuario")

            val success = transaction {
                val booking = Booking.findById(id)
                if (booking != null && booking.user.id.value == userId && booking.status == BookingStatus.PENDING) {
                    booking.delete()
                    true
                } else false
            }
            if (success) call.respond(HttpStatusCode.OK, mapOf("message" to "Reserva eliminada"))
            else call.respond(HttpStatusCode.NotFound, mapOf("error" to "Reserva no encontrada o no es cancelable"))
        }

        // --- 5. OBTENER RESERVAS ---
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

                val price = 29.99

                val rawBody = call.receiveText()
                val (monitorId, monitorName, webReturnUrl) = try {
                    val request = io.ktor.serialization.kotlinx.json.DefaultJson.decodeFromString<Map<String, kotlinx.serialization.json.JsonElement>>(rawBody)
                    Triple(
                        request["monitorId"]?.toString()?.replace("\"", "")?.toIntOrNull() ?: 0,
                        request["monitorName"]?.toString()?.replace("\"", "") ?: "Monitor",
                        request["webReturnUrl"]?.toString()?.replace("\"", "") ?: ""
                    )
                } catch (_: Exception) { Triple(0, "Monitor", "") }

                if (monitorId == 0) return@post call.respond(HttpStatusCode.BadRequest, mapOf("error" to "monitorId requerido"))

                // Verificar si ya hay una suscripción activa
                val existingSub = transaction {
                    Subscription.find {
                        (Subscriptions.userId eq userId) and
                        (Subscriptions.monitorId eq monitorId) and
                        (Subscriptions.status eq SubscriptionStatus.ACTIVE)
                    }.firstOrNull()
                }

                if (existingSub != null) {
                    return@post call.respond(HttpStatusCode.Conflict, mapOf("error" to "Ya tienes una suscripción activa con este entrenador."))
                }

                val backendUrl = env["BACKEND_URL"] ?: "http://localhost:8080"
                // Si viene de la web, Stripe redirige directo a la app web
                val successUrl = if (webReturnUrl.isNotEmpty()) {
                    "${webReturnUrl}/?payment=success&monitorId=${monitorId}"
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
                    .putMetadata("monitorId", monitorId.toString())
                    .putMetadata("type", "TRAINER_SUBSCRIPTION")
                    .addLineItem(
                        SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(
                                SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency("eur")
                                    .setUnitAmount((price * 100).toLong())
                                    .setProductData(
                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName("Suscripción a $monitorName")
                                            .setDescription("Acceso total a las clases y contenido premium de $monitorName")
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

    }
}