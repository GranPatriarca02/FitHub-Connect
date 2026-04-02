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
data class BookingRequest(
    val monitorId: Int,
    val date: String,        // formato: "2026-04-15"
    val startTime: String,   // formato: "09:00"
    val endTime: String,     // formato: "10:00"
    val notes: String? = null
)

@Serializable
data class BookingResponse(
    val bookingId: Int,
    val monitorId: Int,
    val monitorName: String,
    val date: String,
    val startTime: String,
    val endTime: String,
    val status: String,
    val notes: String?
)

@Serializable
data class UpgradeRoleRequest(
    val newRole: String // MEMBER o TRAINER
)
