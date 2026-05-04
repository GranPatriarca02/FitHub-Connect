package com.example
import com.example.db.DatabaseFactory
import com.example.routes.authRoutes
import com.example.routes.availabilityRoutes
import com.example.routes.bookingRoutes
import com.example.routes.exerciseRoutes
import com.example.routes.monitorRoutes
import com.example.routes.routineRoutes
import com.example.routes.subscriptionRoutes
import com.example.routes.socialRoutes
import com.example.routes.videoRoutes
import io.ktor.server.application.*

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    // 1. Inicializar Base de Datos
    DatabaseFactory.init()
    
    // 2. Configurar Serialización (JSON)
    configureSerialization()
    
    // 3. Configurar Routing
    configureRouting()
    
    // 4. Registrar Rutas de la API
    authRoutes()
    availabilityRoutes()
    monitorRoutes()
    bookingRoutes()
    subscriptionRoutes()
    socialRoutes()
    videoRoutes()
    exerciseRoutes()
    routineRoutes()
}