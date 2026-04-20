package com.example.models.dto

import kotlinx.serialization.Serializable

@Serializable
data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val role: String = "FREE" // FREE, MEMBER o TRAINER
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class AuthResponse(
    val userId: Int,
    val name: String,
    val email: String,
    val role: String,
    val token: String // por ahora es un token simple, mas adelante sera JWT
)


@Serializable
data class UpgradeRoleRequest(
    val newRole: String // MEMBER o TRAINER
)
