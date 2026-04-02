package com.example

import com.example.db.DatabaseFactory
import com.example.routes.authRoutes
import com.example.routes.availabilityRoutes
import com.example.routes.bookingRoutes
import com.example.routes.monitorRoutes
import io.ktor.server.application.*

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    DatabaseFactory.init()
    configureSerialization()
    configureRouting()
    authRoutes()
    availabilityRoutes()
    monitorRoutes()
    bookingRoutes()
}
