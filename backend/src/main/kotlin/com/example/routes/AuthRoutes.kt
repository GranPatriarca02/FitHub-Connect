package com.example.routes

import com.example.models.User
import com.example.models.UserRole
import com.example.models.Users
import com.example.models.dto.AuthResponse
import com.example.models.dto.LoginRequest
import com.example.models.dto.RegisterRequest
import com.example.models.dto.UpgradeRoleRequest
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.security.MessageDigest

// Cifra la contrasena por seguridad
fun hashPassword(password: String): String {
    val bytes = MessageDigest.getInstance("SHA-256").digest(password.toByteArray())
    return bytes.joinToString("") { "%02x".format(it) }
}

// Genera un token unico para identificar al usuario en la sesion
fun generateToken(userId: Int, role: String): String {
    val raw = "$userId:$role:${System.currentTimeMillis()}"
    return hashPassword(raw)
}

fun Application.authRoutes() {
    routing {

        // Endpoint para registrar un usuario nuevo
        post("/auth/register") {
            val body = call.receive<RegisterRequest>()

            val role = try {
                UserRole.valueOf(body.role.uppercase())
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Rol no valido. Usa FREE, MEMBER o TRAINER."))
                return@post
            }

            val existente = transaction {
                User.find { Users.email eq body.email }.firstOrNull()
            }
            if (existente != null) {
                call.respond(HttpStatusCode.Conflict, mapOf("error" to "Ya existe una cuenta con ese email."))
                return@post
            }

            val user = transaction {
                User.new {
                    name = body.name
                    email = body.email
                    passwordHash = hashPassword(body.password)
                    this.role = role
                }
            }

            call.respond(
                HttpStatusCode.Created,
                AuthResponse(
                    userId = user.id.value,
                    name = user.name,
                    email = user.email,
                    role = user.role.name,
                    token = generateToken(user.id.value, user.role.name)
                )
            )
        }

        // Endpoint para iniciar sesion
        post("/auth/login") {
            val body = call.receive<LoginRequest>()

            val user = transaction {
                User.find { Users.email eq body.email }.firstOrNull()
            }

            if (user == null || user.passwordHash != hashPassword(body.password)) {
                call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Email o contrasena incorrectos."))
                return@post
            }

            call.respond(
                AuthResponse(
                    userId = user.id.value,
                    name = user.name,
                    email = user.email,
                    role = user.role.name,
                    token = generateToken(user.id.value, user.role.name)
                )
            )
        }

        // Obtener perfil del usuario
        get("/auth/user/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@get call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID no valido."))

            val user = transaction { User.findById(id) }
                ?: return@get call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario no encontrado."))

            call.respond(mapOf(
                "id" to user.id.value.toString(),
                "name" to user.name,
                "email" to user.email,
                "role" to user.role.name
            ))
        }

        // Cambiar rol del usuario (ej. de gratuito a miembro o monitor)
        post("/auth/upgrade/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@post call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID no valido."))

            val body = call.receive<UpgradeRoleRequest>()

            val newRole = try {
                UserRole.valueOf(body.newRole.uppercase())
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Rol no valido."))
                return@post
            }

            if (newRole == UserRole.FREE) {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "No se puede degradar a FREE desde este endpoint."))
                return@post
            }

            val user = transaction { User.findById(id) }
                ?: return@post call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario no encontrado."))

            transaction { user.role = newRole }

            call.respond(mapOf(
                "message" to "Rol actualizado correctamente.",
                "newRole" to newRole.name
            ))
        }
    }
}
