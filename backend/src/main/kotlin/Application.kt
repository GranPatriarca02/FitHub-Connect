package com.example

import com.example.db.DatabaseFactory
import com.example.routes.*
import io.ktor.server.application.*
import io.ktor.server.websocket.*
import kotlin.time.Duration.Companion.seconds

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    // 1. Inicializar Base de Datos
    DatabaseFactory.init()

    // 2. Configurar WebSockets
    install(WebSockets) {
        pingPeriod = 15.seconds // Usa la extensión de Kotlin
        timeout = 15.seconds
        maxFrameSize = Long.MAX_VALUE
        masking = false
    }

    // 3. Configuración de Serialización (JSON)
    configureSerialization()

    // 4. Registrar Rutas de la API
    configureRouting()
}