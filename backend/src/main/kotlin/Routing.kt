package com.example

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.configureRouting() {
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
                            .btn { background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 10px; display: inline-block; margin-top: 20px; font-weight: bold; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <div style="font-size: 50px;">✅</div>
                            <h1>¡Pago Confirmado!</h1>
                            <p>Tu cuenta ha sido actualizada correctamente.</p>
                            <a href="fithub://home" class="btn">Volver a la App</a>
                        </div>
                    </body>
                </html>
            """.trimIndent(), ContentType.Text.Html)
        }

        get("/payment-cancel") {
            call.respondText("""
                <html>
                    <body style="background-color: #0a0a0a; color: white; text-align: center; padding: 50px;">
                        <h1>Pago Cancelado ❌</h1>
                        <p>No se ha realizado ningún cargo.</p>
                        <a href="fithub://home" style="color: #4CAF50;">Volver a la App</a>
                    </body>
                </html>
            """.trimIndent(), ContentType.Text.Html)
        }
    }
}