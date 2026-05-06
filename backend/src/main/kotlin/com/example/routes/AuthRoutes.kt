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
import kotlinx.coroutines.*

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

            // Lanzamos el envio de email en segundo plano para no bloquear la respuesta al usuario
            kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.IO) {
                EmailService.sendVerificationEmail(user.email, verificationToken)
            }
            
            call.respond(HttpStatusCode.Created, mapOf("message" to "Has registrado tu cuenta, verifica tu correo electronico para activar tu cuenta"))
        }

        // Validación EMAIL
        post("/auth/check-email") {
            try {
                // Recibimos el body que contiene el email
                val body = call.receive<Map<String, String>>()
                val emailToCheck = body["email"]

                if (emailToCheck.isNullOrBlank()) {
                    return@post call.respond(HttpStatusCode.BadRequest, mapOf("message" to "Email no proporcionado"))
                }

                // Buscamos en la base de datos si el email existe
                val existe = transaction {
                    User.find { Users.email eq emailToCheck }.firstOrNull()
                }

                if (existe != null) {
                    // Si existe, devolvemos un error de conflicto (409)
                    call.respond(HttpStatusCode.Conflict, mapOf("message" to "El email ya se encuentra registrado"))
                } else {
                    // Si no existe, devolvemos un OK (200)
                    call.respond(HttpStatusCode.OK, mapOf("message" to "Email disponible"))
                }
            } catch (e: Exception) {
                call.respond(HttpStatusCode.InternalServerError, mapOf("message" to "Error en el servidor"))
            }
        }

        // Endpoint para registrar la verificación del correo.
        get("/verify") {
        // Token que viene en la URL
            val verificationToken = call.request.queryParameters["token"]
        
            // Si no hay token, cortamos la petición
            if (verificationToken.isNullOrBlank()) {
                return@get call.respond(HttpStatusCode.BadRequest, "Token no encontrado")
            }

            // Entramos en la base de datos para validar al usuario
            val isReady = transaction {
                // Buscamos al usuario que tenga ese token asignado
                val user = User.find { Users.verificationToken eq verificationToken }.firstOrNull()
                
                if (user != null) {
                    user.isVerified = true
                    user.verificationToken = null 
                    true
                } else {
                    // En caso de que el token no exista o haya sido usado.
                    false
                }
            }

            // Código HTML que ve el usuario.
            if (isReady) {
                call.respondText("""
                    <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <style>
                                body { 
                                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                                    text-align: center; 
                                    padding: 50px 20px; 
                                    background-color: #0d0d0d; 
                                    color: white; 
                                }
                                .card { 
                                    background: #161616; 
                                    padding: 40px; 
                                    border-radius: 20px; 
                                    border: 2px solid #2ecc71; 
                                    max-width: 400px;
                                    margin: auto;
                                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                                }
                                h1 { color: #2ecc71; margin-bottom: 10px; }
                                p { color: #ccc; line-height: 1.6; }
                                .brand { font-weight: bold; color: #2ecc71; }
                            </style>
                        </head>
                        <body>
                            <div class="card">
                                <h1>¡Listo! ✅</h1>
                                <p>Tu cuenta ha sido activada correctamente.</p>
                                <p>Ya puedes cerrar esta ventana, abrir <span class="brand">FitHub Connect</span></p>
                            </div>
                        </body>
                    </html>
                """.trimIndent(), ContentType.Text.Html)
            } else {
                // Mejor dar un error genérico por seguridad
                call.respond(HttpStatusCode.BadRequest, "El enlace no es válido o ya ha caducado.")
            }
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

            // Verificación del correo.
            if (!user.isVerified) {
                return@post call.respond(
                    HttpStatusCode.Forbidden, 
                    mapOf("error" to "Debes verificar tu email primero para poder entrar.")
                )
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
