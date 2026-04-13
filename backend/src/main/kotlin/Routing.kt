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
        
        // Opcional para evitar bloqueos en navegadores
        allowNonSimpleContentTypes = true 
    }

    routing {
        get("/") {
            call.respondText("FitHub Connect API v0.1")
        }
    }
}
