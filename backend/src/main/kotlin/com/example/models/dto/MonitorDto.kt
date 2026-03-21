package com.example.models.dto

import kotlinx.serialization.Serializable

@Serializable
data class MonitorListItem(
    val id: Int,
    val name: String,
    val specialty: String?,
    val hourlyRate: Double?
)

@Serializable
data class MonitorDetailResponse(
    val id: Int,
    val name: String,
    val specialty: String?,
    val hourlyRate: Double?,
    val bio: String?,
    val availability: List<AvailabilityDto>
)
