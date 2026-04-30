package com.example.services

import org.apache.commons.mail.DefaultAuthenticator
import org.apache.commons.mail.HtmlEmail
import io.github.cdimascio.dotenv.dotenv

object EmailService {
    // Cargamos el .env una sola vez para todo el objeto
    private val config = dotenv { ignoreIfMissing = true }

    fun sendVerificationEmail(targetEmail: String, verificationToken: String) {
        // Sacamos las credenciales del entorno al .env
        val apiKey = config["BREVO_SMTP_KEY"]
        val sender = config["EMAIL_FROM"]
        val userAccount = config["BREVO_LOGIN"]
        val baseUrl = config["BACKEND_URL"] ?: "http://192.168.1.131:8080"

        // LOGS: Verificamos que el servidor lee bien el dominio
        println("----- PROCESANDO ENVÍO -----")
        println("Remitente: $sender")
        println("Destinatario: $targetEmail")
        println("----------------------------")

        try {
            val email = HtmlEmail().apply {
                // Configuración del servidor de salida (Brevo actualizado)
                hostName = "smtp-relay.brevo.com" 
                setSmtpPort(587)
                
                // Autenticación con las credenciales de tu imagen image_3db5f9.png
                setAuthenticator(DefaultAuthenticator(userAccount, apiKey))
                isStartTLSEnabled = true
                
                // Remitente verificado según image_3db97e.png
                setFrom(sender, "FitHub Connect")
                subject = "Activa tu cuenta de FitHub Connect"
                
                // Mensaje en HTML
                val activationLink = "$baseUrl/verify?token=$verificationToken"
                
                setHtmlMsg("""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #f0f0f0; border-radius: 10px;">
                        <h2 style="color: #2ecc71; text-align: center;">¡Bienvenido a la comunidad!</h2>
                        <p style="color: #333; line-height: 1.5;">
                            Estamos encantados de tenerte con nosotros. Para empezar a usar FitHub, 
                            necesitamos confirmar que este correo te pertenece.
                        </p>
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="$activationLink" 
                               style="background-color: #2ecc71; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                               Confirmar mi registro
                            </a>
                        </div>
                        <p style="font-size: 13px; color: #999; border-top: 1px solid #eee; padding-top: 20px;">
                            Si no has creado ninguna cuenta en nuestra plataforma, puedes ignorar este mensaje tranquilamente.
                        </p>
                    </div>
                """.trimIndent())
                
                // IMPORTANTE: Añadir el destinatario
                addTo(targetEmail)
            }
            
            email.send()
            println("Email de verificación enviado correctamente a: $targetEmail")
            
        } catch (err: Exception) {
            println("Ha ocurrido un error al intentar enviar el correo $targetEmail: ${err.message}")
            err.printStackTrace()
        }
    }
}