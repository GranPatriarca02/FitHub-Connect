package com.example.db

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import com.example.models.Users
import com.example.models.Monitors
import com.example.models.Routines
import com.example.models.Availabilities
import io.github.cdimascio.dotenv.dotenv

object DatabaseFactory {
    fun init() {
        val pool = hikari()
        Database.connect(pool)
        transaction {
            SchemaUtils.create(Users, Monitors, Routines, Availabilities)
        }
    }

    private fun hikari(): HikariDataSource {
        val config = HikariConfig()
        config.driverClassName = "org.postgresql.Driver"
        
        // Carga las variables del fichero .env si existe
        val dotenv = dotenv {
            ignoreIfMissing = true
        }

        config.jdbcUrl = dotenv["JDBC_DATABASE_URL"] ?: System.getenv("JDBC_DATABASE_URL") ?: "jdbc:postgresql://aws-1-eu-west-3.pooler.supabase.com:5432/postgres"
        config.username = dotenv["JDBC_DATABASE_USERNAME"] ?: System.getenv("JDBC_DATABASE_USERNAME") ?: "postgres.faorfurslbzfgbbxmbrt"
        config.password = dotenv["JDBC_DATABASE_PASSWORD"] ?: System.getenv("JDBC_DATABASE_PASSWORD") ?: ""
        config.maximumPoolSize = System.getenv("JDBC_MAX_POOL_SIZE")?.toIntOrNull() ?: 3
        config.isAutoCommit = false
        config.transactionIsolation = "TRANSACTION_REPEATABLE_READ"
        config.validate()
        return HikariDataSource(config)
    }
}
