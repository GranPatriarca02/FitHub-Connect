package com.example.models.dto

import kotlinx.serialization.Serializable

@Serializable
data class ActivityLogResponse(
    val id: String,
    val logCode: String, // IDENTIFICADOR ÚNICO VISUAL para el usuario.
    val category: String,
    val device: String,
    val timestamp: String,
    val ipAddress: String,
    val status: String,
    val statusClass: String 
)