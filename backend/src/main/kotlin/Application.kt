package com.example

import com.example.db.DatabaseFactory
import com.example.routes.availabilityRoutes
import io.ktor.server.application.*

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    DatabaseFactory.init()
    configureSerialization()
    configureRouting()
    availabilityRoutes()
}
