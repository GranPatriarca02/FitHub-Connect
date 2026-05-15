package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.javatime.datetime
import org.jetbrains.exposed.sql.javatime.CurrentDateTime
import java.time.LocalDateTime

// FREE: Modo lectura
// MEMBER: Modo cliente
// TRAINER: Modo entrenador
enum class UserRole {
    FREE,
    TRAINER
}

object Users : IntIdTable("users") {
    val name = varchar("name", 100)
    val email = varchar("email", 255).uniqueIndex()
    val passwordHash = varchar("password_hash", 255)
    val role = enumerationByName("role", 50, UserRole::class).default(UserRole.FREE)
    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
    // Campos de verificación (sistema de email)
    val isVerified = bool("is_verified").default(false)
    val verificationToken = varchar("verification_token", 255).nullable()
    val isOnline = bool("is_online").default(false)
}

class User(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<User>(Users)

    var name by Users.name
    var email by Users.email
    var passwordHash by Users.passwordHash
    var role by Users.role
    var createdAt by Users.createdAt
    var isVerified by Users.isVerified
    var verificationToken by Users.verificationToken
    var isOnline by Users.isOnline
}
