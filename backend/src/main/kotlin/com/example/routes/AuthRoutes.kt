package com.example.routes

import com.example.models.*
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
import java.util.UUID
import com.example.services.EmailService

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

            // 1. Validar Rol.
            val role = try {
                UserRole.valueOf(body.role.uppercase())
            } catch (e: IllegalArgumentException) {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Rol no valido. Usa FREE, MEMBER o TRAINER."))
                return@post
            }
            
            // 2. Verificar si el email ya existe
            val existente = transaction { 
                User.find { Users.email eq body.email }.firstOrNull() 
            }
            if (existente != null) {
                return@post call.respond(HttpStatusCode.Conflict, mapOf("error" to "Ya existe una cuenta con el email que has indicado."))
            }
            // Generamos la llave para el registro
            val verificationToken = UUID.randomUUID().toString()
            
           // 3. Crear Usuario y, si es monitor, su perfil profesional
            val user = transaction {
                val newUser = User.new {
                    name = body.name
                    email = body.email
                    passwordHash = hashPassword(body.password)
                    this.role = role
                    // Guardamos la llave y marcamos como falso
                    this.isVerified = false
                    this.verificationToken = verificationToken
                }

                // En caso de ser un usuario MONITOR, Creamos la entrada en la tabla Monitors.
                if (role == UserRole.TRAINER) {
                    Monitor.new {
                        this.user = newUser
                        this.specialty = "General" // Valores por defecto iniciales
                        this.hourlyRate = 0.0.toBigDecimal()
                        this.bio = "Nuevo monitor en FitHub Connect."
                    }
                }
                newUser
            }

            // Creamos el usuario sin estar verificado
            EmailService.sendVerificationEmail(user.email, verificationToken)
            call.respond(HttpStatusCode.Created, mapOf("message" to "Has registrado tu cuenta, verifica tu correo electronico para activar tu cuenta"))
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

            transaction { 
                user.role = newRole 
                
                // Si el rol es TRAINER, creamos su perfil en la tabla Monitors si no existe
                if (newRole == UserRole.TRAINER) {
                    val existeMonitor = Monitor.find { Monitors.userId eq user.id }.firstOrNull()
                    if (existeMonitor == null) {
                        Monitor.new {
                            this.user = user
                            this.specialty = "Especialista"
                            this.hourlyRate = 0.0.toBigDecimal()
                            this.bio = "Perfil actualizado a Monitor."
                        }
                    }
                }
            }

            call.respond(mapOf(
                "message" to "Rol actualizado correctamente.",
                "newRole" to newRole.name
            ))
        }
    }
}
