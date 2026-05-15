package com.example.routes

import com.example.models.*
import com.stripe.Stripe
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.LocalDateTime

@Serializable
data class CreateSubscriptionIntentRequest(
    val monitorId: Int
)

@Serializable
data class SubscriptionIntentResponse(
    val clientSecret: String,
    val monitorName: String,
    val price: Double
)

@Serializable
data class SubscriptionStatusResponse(
    val isSubscribed: Boolean,
    val monitorId: Int?,
    val monitorName: String?,
    val expiresAt: String?
)

@Serializable
data class SubscriptionCheckResponse(
    val isSubscribed: Boolean,
    val userRole: String
)

fun Application.subscriptionRoutes() {
    val env = io.github.cdimascio.dotenv.dotenv { ignoreIfMissing = true }
    Stripe.apiKey = env["STRIPE_SECRET_KEY"] ?: System.getenv("STRIPE_SECRET_KEY") ?: ""

    routing {

        // --- 1. CREAR PAYMENT INTENT PARA SUSCRIPCIÓN A UN ENTRENADOR (flujo nativo) ---
        post("/subscriptions/intent") {
            try {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Falta ID de usuario"))

                val body = call.receive<CreateSubscriptionIntentRequest>()

                val (user, monitor) = transaction {
                    User.findById(userId) to Monitor.findById(body.monitorId)
                }

                if (user == null) return@post call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario no encontrado"))
                if (monitor == null) return@post call.respond(HttpStatusCode.NotFound, mapOf("error" to "Entrenador no encontrado"))

                // Verificar si ya hay una suscripción activa a este mismo entrenador
                val existingSubscription = transaction {
                    Subscription.find {
                        (Subscriptions.userId eq userId) and
                        (Subscriptions.monitorId eq body.monitorId) and
                        (Subscriptions.status eq SubscriptionStatus.ACTIVE)
                    }.firstOrNull()
                }

                if (existingSubscription != null) {
                    return@post call.respond(
                        HttpStatusCode.Conflict,
                        mapOf("error" to "Ya tienes una suscripción activa con este entrenador.")
                    )
                }

                // Precio de suscripción mensual fijo (29.99€)
                val price = 29.99
                val monitorName = transaction { monitor.user.name }

                // Crear PaymentIntent con metadatos para identificarlo en el webhook
                val intent = com.stripe.model.PaymentIntent.create(
                    com.stripe.param.PaymentIntentCreateParams.builder()
                        .setAmount((price * 100).toLong())
                        .setCurrency("eur")
                        .setDescription("Suscripción mensual a $monitorName — FitHub Connect")
                        .putMetadata("userId", userId.toString())
                        .putMetadata("monitorId", body.monitorId.toString())
                        .putMetadata("type", "TRAINER_SUBSCRIPTION")
                        .setAutomaticPaymentMethods(
                            com.stripe.param.PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build()
                        )
                        .build()
                )

                call.respond(
                    HttpStatusCode.OK,
                    SubscriptionIntentResponse(
                        clientSecret = intent.clientSecret,
                        monitorName = monitorName,
                        price = price
                    )
                )
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, mapOf("error" to (e.message ?: "Error al crear intento de pago")))
            }
        }

        // --- 2. CONFIRMAR SUSCRIPCIÓN MANUALMENTE (fallback si el webhook falla) ---
        post("/subscriptions/confirm") {
            try {
                val userId = call.request.headers["X-User-Id"]?.toIntOrNull()
                    ?: return@post call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Falta ID de usuario"))

                val body = call.receive<CreateSubscriptionIntentRequest>()

                transaction {
                    val user = User.findById(userId)
                    val monitor = Monitor.findById(body.monitorId)

                    if (user == null || monitor == null) {
                        // Lanzamos excepción para que la capture el catch del try-block exterior
                        throw IllegalArgumentException("Usuario o entrenador no encontrado")
                    }

                    // Cancelar cualquier suscripción anterior del usuario a este mismo entrenador
                    Subscription.find {
                        (Subscriptions.userId eq userId) and
                        (Subscriptions.monitorId eq body.monitorId)
                    }.forEach { it.status = SubscriptionStatus.CANCELLED }

                    // Crear suscripción nueva activa (1 mes desde ahora)
                    Subscription.new {
                        this.user = user
                        this.monitor = monitor
                        this.status = SubscriptionStatus.ACTIVE
                        this.expiresAt = LocalDateTime.now().plusMonths(1)
                    }
                }

                call.respond(HttpStatusCode.OK, mapOf("message" to "Suscripción activada correctamente"))
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, mapOf("error" to (e.message ?: "Error al confirmar suscripción")))
            }
        }

        // --- 3. COMPROBAR SI EL USUARIO ESTÁ SUSCRITO A UN ENTRENADOR ---
        get("/subscriptions/check") {
            val userId = call.request.queryParameters["userId"]?.toIntOrNull()
            val monitorId = call.request.queryParameters["monitorId"]?.toIntOrNull()

            if (userId == null || monitorId == null) {
                return@get call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Faltan parámetros"))
            }

            val (isSubscribed, role) = transaction {
                val user = User.findById(userId)
                val hasSub = Subscription.find {
                    (Subscriptions.userId eq userId) and
                    (Subscriptions.monitorId eq monitorId) and
                    (Subscriptions.status eq SubscriptionStatus.ACTIVE)
                }.any { it.expiresAt == null || it.expiresAt!!.isAfter(LocalDateTime.now()) }
                Pair(hasSub, user?.role?.name ?: "FREE")
            }

            call.respond(SubscriptionCheckResponse(
                isSubscribed = isSubscribed,
                userRole = role
            ))
        }

        // --- 4. LISTA DE SUSCRIPCIONES ACTIVAS DEL USUARIO ---
        get("/subscriptions/user/{userId}") {
            val userId = call.parameters["userId"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID inválido"))

            val subs = transaction {
                Subscription.find {
                    (Subscriptions.userId eq userId) and
                    (Subscriptions.status eq SubscriptionStatus.ACTIVE)
                }.map { sub ->
                    mapOf(
                        "monitorId"   to sub.monitor.id.value.toString(),
                        "monitorName" to sub.monitor.user.name,
                        "specialty"   to (sub.monitor.specialty ?: ""),
                        "expiresAt"   to (sub.expiresAt?.toString() ?: ""),
                        "status"      to sub.status.name
                    )
                }
            }
            call.respond(subs)
        }

        // --- 5. LISTA DE SUSCRIPTORES ACTIVOS DEL ENTRENADOR ---
        // El parámetro de la ruta es el userId del entrenador. Internamente
        // se localiza su Monitor asociado y se devuelven los usuarios con
        // suscripción ACTIVE a ese monitor.
        get("/subscriptions/trainer/{trainerUserId}") {
            val trainerUserId = call.parameters["trainerUserId"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID inválido"))

            val result = transaction {
                val monitor = Monitor.find { Monitors.userId eq trainerUserId }.firstOrNull()
                    ?: return@transaction emptyList<Map<String, String>>()

                Subscription.find {
                    (Subscriptions.monitorId eq monitor.id) and
                    (Subscriptions.status eq SubscriptionStatus.ACTIVE)
                }.map { sub ->
                    mapOf(
                        "id"           to sub.user.id.value.toString(),
                        "name"         to sub.user.name,
                        "email"        to sub.user.email,
                        "subscribedAt" to sub.createdAt.toString(),
                        "expiresAt"    to (sub.expiresAt?.toString() ?: ""),
                        "status"       to sub.status.name
                    )
                }
            }
            call.respond(result)
        }
    }
}
