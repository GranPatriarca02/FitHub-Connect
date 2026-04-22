package com.example.db

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import com.example.models.*
import io.github.cdimascio.dotenv.dotenv
import java.time.DayOfWeek
import java.time.LocalTime
import java.time.LocalDateTime

object DatabaseFactory {
    fun init() {
        val pool = hikari()
        Database.connect(pool)
        transaction {
            // Crear tablas y columnas necesarias si no existen en la base de datos.
            SchemaUtils.createMissingTablesAndColumns(Users, Monitors, Routines, Availabilities, Bookings, Videos)

            // Seed de videos gratuitos oficiales si la tabla esta vacia
            if (Video.count() == 0L) {
                seedFreeVideos()
            }

            // USUARIOS TEST. INABILITADOS
            /* if (User.count() == 0L) {
                seedDatabase()
            }*/
        }
    }

    // Videos gratuitos curados por FitHub Official
    private fun seedFreeVideos() {
        val freeVideos = listOf(
            Triple(
                "Calentamiento completo para principiantes",
                "Rutina de calentamiento de 10 minutos ideal para empezar cualquier entreno.",
                "https://www.youtube.com/watch?v=R0mMyV5OtcM"
            ),
            Triple(
                "Sentadillas perfectas — técnica y variantes",
                "Aprende la técnica correcta de la sentadilla y sus variaciones para todos los niveles.",
                "https://www.youtube.com/watch?v=aclHkVaku9U"
            ),
            Triple(
                "Cardio HIIT en casa — 20 minutos",
                "Entreno de alta intensidad sin necesidad de material. Quema calorías en casa.",
                "https://www.youtube.com/watch?v=ml6cT4AZdqI"
            ),
            Triple(
                "Estiramiento y vuelta a la calma",
                "Sesión de estiramientos post-entreno para recuperarte mejor y evitar lesiones.",
                "https://www.youtube.com/watch?v=sTANio_2E0Q"
            )
        )

        freeVideos.forEach { (title, desc, url) ->
            Video.new {
                this.title       = title
                this.description = desc
                this.videoUrl    = url
                this.isPremium   = false
                this.monitor     = null
            }
        }
    }



    // METODO PARA TESTEAR, AHORA INHABILITADO.
    private fun seedDatabase() {
        val user1 = User.new {
            name = "Carlos Garcia"
            email = "carlos@example.com"
            passwordHash = "hash_seed"
            role = UserRole.TRAINER
        }
        val user2 = User.new {
            name = "Ana Lopez"
            email = "ana@example.com"
            passwordHash = "hash_seed"
            role = UserRole.TRAINER
        }

        val monitor1 = Monitor.new {
            user = user1
            specialty = "Musculacion"
            hourlyRate = 25.0.toBigDecimal()
            bio = "Entrenador personal certificado con 5 años de experiencia."
        }
        val monitor2 = Monitor.new {
            user = user2
            specialty = "Yoga"
            hourlyRate = 20.0.toBigDecimal()
            bio = "Instructora experta en Yoga y Pilates."
        }

        Availability.new {
            monitor = monitor1
            dayOfWeek = DayOfWeek.MONDAY
            startTime = LocalTime.of(9, 0)
            endTime = LocalTime.of(14, 0)
            isAvailable = true
        }
        Availability.new {
            monitor = monitor2
            dayOfWeek = DayOfWeek.TUESDAY
            startTime = LocalTime.of(10, 0)
            endTime = LocalTime.of(13, 0)
            isAvailable = true
        }

        val user3 = User.new {
            name = "Usuario Prueba"
            email = "usuario@example.com"
            passwordHash = "hash_seed"
            role = UserRole.PREMIUM
        }

        Booking.new {
            user = user3
            monitor = monitor1
            date = LocalDateTime.now().plusDays(2).withHour(10).withMinute(0)
            startTime = "10:00"
            endTime = "11:00"
            status = BookingStatus.PENDING
            notes = "Quiero centrarme en pecho y triceps."
        }

        Booking.new {
            user = user3
            monitor = monitor2
            date = LocalDateTime.now().plusDays(3).withHour(11).withMinute(0)
            startTime = "11:00"
            endTime = "12:00"
            status = BookingStatus.CONFIRMED
            notes = "Mi primera clase de yoga."
        }
    }

    private fun hikari(): HikariDataSource {
        val config = HikariConfig()
        config.driverClassName = "org.postgresql.Driver"
        
        val dotenv = dotenv {
            ignoreIfMissing = true
        }

        // Configuración de conexión
        config.jdbcUrl = dotenv["JDBC_DATABASE_URL"] ?: System.getenv("JDBC_DATABASE_URL") ?: "jdbc:postgresql://aws-1-eu-west-3.pooler.supabase.com:5432/postgres"
        config.username = dotenv["JDBC_DATABASE_USERNAME"] ?: System.getenv("JDBC_DATABASE_USERNAME") ?: "postgres.faorfurslbzfgbbxmbrt"
        config.password = dotenv["JDBC_DATABASE_PASSWORD"] ?: System.getenv("JDBC_DATABASE_PASSWORD") ?: ""
        // Ajustes del pool para no saturar la conexión de Supabase
        config.maximumPoolSize = System.getenv("JDBC_MAX_POOL_SIZE")?.toIntOrNull() ?: 3
        config.isAutoCommit = false
        config.transactionIsolation = "TRANSACTION_REPEATABLE_READ"
        config.validate()
        return HikariDataSource(config)
    }
}
