package com.example.models.dto

import kotlinx.serialization.Serializable

@Serializable
data class AvailabilityDto(
    val id: Int,
    val monitorId: Int,
    val dayOfWeek: String, // String representation e.g. "MONDAY"
    val startTime: String, // "HH:mm"
    val endTime: String,   // "HH:mm"
    val isAvailable: Boolean
)

@Serializable
data class UpdateAvailabilityRequest(
    val dayOfWeek: String,
    val startTime: String,
    val endTime: String,
    val isAvailable: Boolean = true
)
