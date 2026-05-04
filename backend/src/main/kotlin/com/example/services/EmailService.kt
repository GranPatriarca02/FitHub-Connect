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

        println("----- PROCESANDO ENVÍO -----")
        println("Remitente: $sender")
        println("Destinatario: $targetEmail")
        println("----------------------------")

        try {
            val email = HtmlEmail()
            
            // Configuración del servidor de salida
            email.hostName = "smtp-relay.brevo.com" 
            email.setSmtpPort(587)
            
            // Autenticación
            email.setAuthenticator(DefaultAuthenticator(userAccount, apiKey))
            email.isStartTLSEnabled = true
            
            // Remitente y Destinatario
            email.setFrom(sender, "FitHub Connect")
            email.addTo(targetEmail)
            email.subject = "Activa tu cuenta de FitHub Connect"
            
            // Mensaje en HTML
            val activationLink = "$baseUrl/verify?token=$verificationToken"
            
            email.setHtmlMsg("""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FFF; border-radius: 15px; text-align: center;">
                    <h2 style="color: #577263; margin-bottom: 20px;">¡Bienvenido a FitHub Connect!</h2>
                    <p style="color: #577263; line-height: 1.6; font-size: 16px;">
                        Estamos encantados de tenerte con nosotros. Para empezar a entrenar, necesitamos confirmar tu cuenta.
                    </p>
                    <div style="margin: 40px 0;">
                        <a href="$activationLink" 
                           style="background-color: #577263; color: #fff; padding: 18px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                           CONFIRMAR MI REGISTRO
                        </a>
                    </div>
                    <p style="font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 25px; margin-top: 30px;">
                        © 2026 FitHub Connect - Tu entrenamiento empieza aquí.
                    </p>
                </div>
            """.trimIndent())

            email.send()
            println("Email de verificación enviado correctamente a: $targetEmail")
            
        } catch (err: Exception) {
            println("Ha ocurrido un error al intentar enviar el correo $targetEmail: ${err.message}")
            err.printStackTrace()
        }
    }
}