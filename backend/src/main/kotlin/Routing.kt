package com.example

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.configureRouting() {
    install(CORS) {
        anyHost() // Permite cualquier origen
        
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
        allowMethod(HttpMethod.Options)

        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
        allowHeader("X-User-Id")
        allowHeader("X-User-Role")
        
        // Opcional para evitar bloqueos en navegadores
        allowNonSimpleContentTypes = true 
    }

    routing {
        get("/") {
            call.respondText("FitHub Connect API v0.1")
        }

        get("/payment-success") {
            call.respondText("""
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { font-family: sans-serif; background-color: #0a0a0a; color: white; text-align: center; padding: 50px; }
                            .card { background: #121212; padding: 30px; border-radius: 20px; border: 1px solid #4CAF50; display: inline-block; }
                            h1 { color: #4CAF50; }
                            p { color: #888; }
                            .btn { background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 10px; display: inline-block; margin-top: 20px; font-weight: bold; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div style="font-size: 50px; margin-bottom: 20px;">✅</div>
                            <h1>¡Pago Confirmado!</h1>
                            <p style="font-size: 18px; color: #fff;">Tu reserva o suscripción ya está activa.</p>
                            <div style="margin: 30px 0; padding: 20px; background: rgba(76, 175, 80, 0.1); border-radius: 12px; border: 1px dashed #4CAF50;">
                                <p style="margin: 0; color: #4CAF50; font-weight: bold;">Pago verificado correctamente</p>
                                <p style="margin: 5px 0 20px 0; font-size: 13px;">Tu cuenta ha sido actualizada.</p>
                                <a href="fithub://home" class="btn">Volver a la App</a>
                            </div>
                            <p style="font-size: 11px; color: #555;">Si el botón no funciona, puedes cerrar esta pestaña manualmente.</p>
                        </div>
                    </body>
                </html>
            """.trimIndent(), ContentType.Text.Html)
        }

        get("/payment-cancel") {
            call.respondText("""
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { font-family: sans-serif; background-color: #0a0a0a; color: white; text-align: center; padding: 50px; }
                            .card { background: #121212; padding: 30px; border-radius: 20px; border: 1px solid #ff5252; display: inline-block; }
                            h1 { color: #ff5252; }
                            p { color: #888; }
                            .btn { background: #333; color: white; padding: 10px 20px; text-decoration: none; border-radius: 10px; display: inline-block; margin-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h1>Pago Cancelado ❌</h1>
                            <p>No se ha realizado ningún cargo en tu cuenta.</p>
                            <p>¿Quieres volver a intentarlo?</p>
                            <a href="fithub://home" class="btn">Volver a la App</a>
                        </div>
                    </body>
                </html>
            """.trimIndent(), ContentType.Text.Html)
        }
    }
}
