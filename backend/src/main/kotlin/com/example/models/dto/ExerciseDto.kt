package com.example.models.dto

import kotlinx.serialization.Serializable

// Ejercicio tal y como se devuelve al cliente
@Serializable
data class ExerciseDto(
    val id: Int,
    val name: String,
    val description: String?,
    val muscleGroup: String?,
    val difficulty: String?,
    val equipment: String?,
    val videoUrl: String?,
    val creatorId: Int?,
    val creatorName: String?, // null = ejercicio oficial FitHub
    val createdAt: String
)

// Alta de un nuevo ejercicio (solo TRAINER puede crear fuera del catálogo oficial)
@Serializable
data class CreateExerciseRequest(
    val name: String,
    val description: String? = null,
    val muscleGroup: String? = null,
    val difficulty: String? = null,
    val equipment: String? = null,
    val videoUrl: String? = null
)
