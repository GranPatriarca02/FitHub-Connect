package com.example

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import com.example.routes.* // Importamos todas tus rutas personalizadas

fun Application.configureRouting() {
    // Configuración de CORS: Permite que la App de React Native (IP externa) se conecte
    install(CORS) {
        anyHost() // Permite conexiones de Android, Web y Emuladores
        
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

    // Registro de todas las rutas de la API bajo la protección de CORS
    authRoutes()
    availabilityRoutes()
    monitorRoutes()
    bookingRoutes()
    subscriptionRoutes()
    videoRoutes()
    exerciseRoutes()
    routineRoutes()
    socialRoutes()

    // Leemos FRONTEND_URL para redirecciones web tras el pago
    val env = io.github.cdimascio.dotenv.dotenv { ignoreIfMissing = true }
    val frontendUrl = env["FRONTEND_URL"] ?: System.getenv("FRONTEND_URL") ?: "http://localhost:8081"

    // Rutas base y de ayuda
    routing {
        get("/") {
            call.respondText("FitHub Connect API v0.1")
        }

        // Ruta para confirmar pago exitoso desde WebView
        get("/payment-success") {
            val monitorId = call.request.queryParameters["monitorId"] ?: ""
            val returnUrl = call.request.queryParameters["returnUrl"] ?: frontendUrl
            call.respondText("""
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { font-family: sans-serif; background-color: #0a0a0a; color: white; text-align: center; padding: 50px; margin: 0; }
                            .card { background: #121212; padding: 30px; border-radius: 20px; border: 1px solid #4CAF50; display: inline-block; }
                            h1 { color: #4CAF50; }
                            .btn { background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; display: inline-block; margin-top: 20px; font-weight: bold; cursor: pointer; border: none; font-size: 16px; }
                            .btn:hover { opacity: 0.9; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Pago Confirmado</h1>
                            <p>Tu cuenta ha sido actualizada correctamente.</p>
                            <button class="btn" onclick="volverApp()">Volver a la App</button>
                        </div>
                        <script>
                            function volverApp() {
                                var monitorId = '${monitorId}';
                                var deepLink = monitorId ? 'fithub://monitor/' + monitorId : 'fithub://home';
                                var webFallback = '${returnUrl}/?payment=success' + (monitorId ? '&monitorId=' + monitorId : '');
                                var clicked = Date.now();
                                window.location.href = deepLink;
                                setTimeout(function() {
                                    if (Date.now() - clicked < 2000) {
                                        window.location.href = webFallback;
                                    }
                                }, 1500);
                            }
                        </script>
                    </body>
                </html>
            """.trimIndent(), ContentType.Text.Html)
        }

        // Ruta para manejar pagos cancelados
        get("/payment-cancel") {
            val monitorId = call.request.queryParameters["monitorId"] ?: ""
            val returnUrl = call.request.queryParameters["returnUrl"] ?: frontendUrl
            call.respondText("""
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { font-family: sans-serif; background-color: #0a0a0a; color: white; text-align: center; padding: 50px; margin: 0; }
                            .card { background: #121212; padding: 30px; border-radius: 20px; border: 1px solid #e74c3c; display: inline-block; }
                            h1 { color: #e74c3c; }
                            .btn { background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; display: inline-block; margin-top: 20px; font-weight: bold; cursor: pointer; border: none; font-size: 16px; }
                            .btn:hover { opacity: 0.9; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Pago Cancelado</h1>
                            <p>No se ha realizado ningún cargo.</p>
                            <button class="btn" onclick="volverApp()">Volver a la App</button>
                        </div>
                        <script>
                            function volverApp() {
                                var monitorId = '${monitorId}';
                                var deepLink = monitorId ? 'fithub://monitor/' + monitorId : 'fithub://home';
                                var webFallback = '${returnUrl}/?payment=cancelled' + (monitorId ? '&monitorId=' + monitorId : '');
                                var clicked = Date.now();
                                window.location.href = deepLink;
                                setTimeout(function() {
                                    if (Date.now() - clicked < 2000) {
                                        window.location.href = webFallback;
                                    }
                                }, 1500);
                            }
                        </script>
                    </body>
                </html>
            """.trimIndent(), ContentType.Text.Html)
        }
    }
}