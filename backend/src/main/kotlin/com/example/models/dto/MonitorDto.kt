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
data class OccupiedSlotDto(
    val date: String,     // "2026-04-20"
    val startTime: String // "10:00"
)

@Serializable
data class MonitorDetailResponse(
    val id: Int,
    val name: String,
    val specialty: String?,
    val hourlyRate: Double?,
    val bio: String?,
    val availability: List<AvailabilityDto>,
    val occupiedSlots: List<OccupiedSlotDto> = emptyList()
)
