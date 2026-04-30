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
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FFF; border-radius: 15px; text-align: center;">
                        
                        <!-- LOGO FITHUB -->
                        <div style="margin-bottom: 25px;">
                            <img src="https://i.imgur.com/bW4YeAN.png" 
                                alt="FitHub Logo" 
                                style="width: 180px; height: auto; display: inline-block;">
                        </div>

                        <h2 style="color: #577263; margin-bottom: 20px;">¡Bienvenido a FitHub Connect!</h2>
                        
                        <p style="color: #577263; line-height: 1.6; font-size: 16px;">
                            Estamos encantados de tenerte con nosotros. Para empezar a entrenar con <strong>FitHub</strong>, 
                            necesitamos confirmar tu cuenta.
                        </p>
                        
                        <div style="margin: 40px 0;">
                            <a href="$activationLink" 
                            style="background-color: #577263; color: #fff; padding: 18px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                            CONFIRMAR MI REGISTRO
                            </a>
                        </div>
                        
                        <p style="font-size: 12px; color: #666; border-top: 1px solid #333; padding-top: 25px; margin-top: 30px;">
                            Si no has solicitado esta cuenta, puedes ignorar este correo.
                            <br>© 2026 FitHub Connect - Tu entrenamiento empieza aquí.
                        </p>
                    </div>
                    """
                .trimIndent())
                
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