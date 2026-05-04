package com.example

import com.example.db.DatabaseFactory
import com.example.routes.*
import io.ktor.server.application.*

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    // 1. Inicializar Base de Datos
    DatabaseFactory.init()
    configureSerialization()
    configureRouting()
}