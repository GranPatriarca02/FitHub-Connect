package com.example.routes

import com.example.models.ActivityLog
import com.example.models.dto.ActivityLogResponse
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.time.format.DateTimeFormatter

fun Route.securityRoutes() {
    route("/api/security") {
        
        // Endpoint para obtener todos los logs de actividad
        get("/logs") {
            val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
            
            // 1. Buscamos en la base de datos (Model)
            val logs = org.jetbrains.exposed.sql.transactions.transaction {
                ActivityLog.all().sortedByDescending { it.createdAt }.map { log ->
                    
                    // 2. Mapeamos cada registro al DTO (Response)
                    ActivityLogResponse(
                        id = log.id.value,
                        logCode = "#LOG-${log.id.value}",
                        category = log.category,
                        device = log.device,
                        timestamp = log.createdAt.format(formatter),
                        ipAddress = log.ipAddress,
                        status = log.status,
                        // Aquí definimos la lógica de colores para Tailwind
                        statusClass = when (log.status.lowercase()) {
                            "success" -> "bg-green-100 text-green-700"
                            "warning" -> "bg-yellow-100 text-yellow-700"
                            "failed" -> "bg-red-100 text-red-700"
                            else -> "bg-gray-100 text-gray-700"
                        }
                    )
                }
            }
            
            // 3. Enviamos la lista de DTOs como JSON
            call.respond(logs)
        }
    }
}