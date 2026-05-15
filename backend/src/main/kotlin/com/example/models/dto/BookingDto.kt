package com.example.models.dto

import kotlinx.serialization.Serializable


@Serializable
data class CheckoutResponse(
    val bookingId: Int,
    val clientSecret: String?,  // Llave que usa Stripe en la app movil
    val amount: Double
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

// Vista de la reserva desde el lado del entrenador.
// Incluye los datos del cliente para poder mostrarlos en el dashboard.
@Serializable
data class TrainerSessionResponse(
    val bookingId: Int,
    val clientId: Int,
    val clientName: String,
    val clientEmail: String,
    val date: String,
    val startTime: String,
    val endTime: String,
    val status: String,
    val notes: String?
)