package com.example
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.update
import org.jetbrains.exposed.sql.and
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import com.example.routes.*
import java.util.concurrent.ConcurrentHashMap
import kotlinx.serialization.json.* // Importación para manejar JSON de forma nativa

// Mapa de sesiones para rastrear qué usuarios están online
val userSessions = ConcurrentHashMap<Int, DefaultWebSocketServerSession>()

fun Application.configureRouting() {
    // Configuración de CORS: Permite que la App de React Native se conecte a la API
    install(CORS) {
        anyHost()
        
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        allowMethod(HttpMethod.Options)

        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
        allowHeader("X-User-Id")
        allowHeader("X-User-Role")
        
        allowNonSimpleContentTypes = true 
    }

    // URL del Frontend para redirecciones tras el pago
    val env = io.github.cdimascio.dotenv.dotenv { ignoreIfMissing = true }
    val frontendUrl = env["FRONTEND_URL"] ?: System.getenv("FRONTEND_URL") ?: "http://localhost:8081"

    routing {
        // Registro de rutas de la API
        authRoutes()
        availabilityRoutes()
        securityRoutes()
        monitorRoutes()
        bookingRoutes()
        subscriptionRoutes()
        videoRoutes()
        exerciseRoutes()
        routineRoutes()
        socialRoutes()

        get("/") {
            call.respondText("FitHub Connect API v0.1")
        }

        // --- LÓGICA DE WEBSOCKET PARA CHAT ---
        webSocket("/chat/{userId}") {
            val myId = call.parameters["userId"]?.toIntOrNull() ?: return@webSocket
            userSessions[myId] = this // Registrar sesión

            try {
                for (frame in incoming) {
                    if (frame is Frame.Text) {
                        val receivedText = frame.readText()
                        
                        // Parseo de JSON usando kotlinx.serialization
                        val json = Json.parseToJsonElement(receivedText).jsonObject
                        val type = json["type"]?.jsonPrimitive?.content

                        // 1. Enviar Mensaje (Privado)
                        if (type == "SEND_MESSAGE") {
                            val receiverId = json["receiverId"]?.jsonPrimitive?.intOrNull
                            if (receiverId != null) {
                                // Buscamos la sesión del destinatario y enviamos solo a él
                                userSessions[receiverId]?.send(Frame.Text(receivedText))
                            }
                        }

                        // 2. Evento de Lectura (Privado)
                        if (type == "READ_EVENT") {
                            val targetId = json["senderId"]?.jsonPrimitive?.intOrNull
                            if (targetId != null) {
                                // Confirmamos al que envió el mensaje que ha sido leído
                                val confirmation = """{"type": "READ_CONFIRMATION", "readerId": $myId}"""
                                userSessions[targetId]?.send(Frame.Text(confirmation))
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                println("Error en socket del usuario $myId: ${e.localizedMessage}")
            } finally {
                userSessions.remove(myId) // Eliminar sesión al desconectar
            }
        }

        // --- RUTAS DE REDIRECCIÓN DE PAGOS ---
        get("/payment-success") {
            val monitorId = call.request.queryParameters["monitorId"] ?: ""
            val returnUrl = call.request.queryParameters["returnUrl"] ?: frontendUrl
            call.respondText("""
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { font-family: sans-serif; background-color: #000; color: white; text-align: center; padding: 50px; }
                            .card { background: #121212; padding: 30px; border-radius: 20px; border: 1px solid #4CAF50; display: inline-block; }
                            h1 { color: #4CAF50; }
                            .btn { background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; display: inline-block; margin-top: 20px; font-weight: bold; cursor: pointer; border: none; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Pago Confirmado</h1>
                            <p>Tu suscripción se ha activado correctamente.</p>
                            <button class="btn" onclick="volverApp()">Volver a FitHub</button>
                        </div>
                        <script>
                            function volverApp() {
                                var monitorId = '${monitorId}';
                                var deepLink = monitorId ? 'fithub://monitor/' + monitorId : 'fithub://home';
                                var webFallback = '${returnUrl}/?payment=success';
                                window.location.href = deepLink;
                                setTimeout(function() { window.location.href = webFallback; }, 1500);
                            }
                        </script>
                    </body>
                </html>
            """.trimIndent(), ContentType.Text.Html)
        }

        get("/payment-cancel") {
            val returnUrl = call.request.queryParameters["returnUrl"] ?: frontendUrl
            call.respondText("""
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { font-family: sans-serif; background-color: #000; color: white; text-align: center; padding: 50px; }
                            .card { background: #121212; padding: 30px; border-radius: 20px; border: 1px solid #e74c3c; display: inline-block; }
                            h1 { color: #e74c3c; }
                            .btn { background: #e74c3c; color: white; padding: 12px 24px; border-radius: 10px; display: inline-block; margin-top: 20px; font-weight: bold; cursor: pointer; border: none; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Pago Cancelado</h1>
                            <p>No se ha realizado ningún cargo en tu cuenta.</p>
                            <button class="btn" onclick="volverApp()">Volver a la App</button>
                        </div>
                        <script>
                            function volverApp() {
                                window.location.href = 'fithub://home';
                                setTimeout(function() { window.location.href = '${returnUrl}/?payment=cancelled'; }, 1500);
                            }
                        </script>
                    </body>
                </html>
            """.trimIndent(), ContentType.Text.Html)
        }
    }
}