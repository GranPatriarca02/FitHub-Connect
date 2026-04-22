package com.example.models.dto

import kotlinx.serialization.Serializable

@Serializable
data class VideoDto(
    val id: Int,
    val title: String,
    val description: String?,
    val videoUrl: String,
    val thumbnailUrl: String?,
    val isPremium: Boolean,
    val trainerName: String?,  // null si es contenido oficial FitHub
    val monitorId: Int?,
    val createdAt: String
)

@Serializable
data class CreateVideoRequest(
    val title: String,
    val description: String? = null,
    val videoUrl: String,
    val thumbnailUrl: String? = null,
    val isPremium: Boolean = true
)
