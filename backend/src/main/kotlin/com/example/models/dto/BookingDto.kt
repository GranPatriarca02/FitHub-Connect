package com.example.models.dto

import kotlinx.serialization.Serializable

@Serializable
data class CheckoutRequest(
    val monitorId: Int,
    val date: String,      // Formato "2026-04-15"
    val startTime: String, // "10:00"
    val endTime: String,   // "11:00"
    val notes: String? = null
)

@Serializable
data class CheckoutResponse(
    val bookingId: Int,
    val clientSecret: String,  // Llave que usa Stripe en la app movil
    val amount: Double
)