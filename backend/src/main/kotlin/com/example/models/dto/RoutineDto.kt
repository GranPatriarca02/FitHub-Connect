package com.example.models.dto

import kotlinx.serialization.Serializable

// Resumen de rutina (para listas)
@Serializable
data class RoutineDto(
    val id: Int,
    val title: String,
    val description: String?,
    val difficulty: String?,
    val goal: String?,
    val isPublic: Boolean,
    val isPremium: Boolean,
    val creatorId: Int,
    val creatorName: String,
    val exerciseCount: Int,
    val createdAt: String
)

// Ejercicio ya incorporado a una rutina (incluye series, reps, etc.)
@Serializable
data class RoutineExerciseDto(
    val id: Int,            // id de la fila routine_exercises
    val exerciseId: Int,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
    val videoUrl: String?,
    val sets: Int,
    val reps: String,
    val restSeconds: Int,
    val orderIndex: Int,
    val notes: String?
)

// Detalle completo de la rutina con sus ejercicios
@Serializable
data class RoutineDetailDto(
    val id: Int,
    val title: String,
    val description: String?,
    val difficulty: String?,
    val goal: String?,
    val isPublic: Boolean,
    val isPremium: Boolean,
    val creatorId: Int,
    val creatorName: String,
    val createdAt: String,
    val exercises: List<RoutineExerciseDto>
)

// Alta de una nueva rutina
@Serializable
data class CreateRoutineRequest(
    val title: String,
    val description: String? = null,
    val difficulty: String? = null,
    val goal: String? = null,
    val isPublic: Boolean = false,
    val isPremium: Boolean = false
)

// Añadir un ejercicio existente a una rutina
@Serializable
data class AddExerciseToRoutineRequest(
    val exerciseId: Int,
    val sets: Int = 3,
    val reps: String = "10",
    val restSeconds: Int = 60,
    val orderIndex: Int? = null,
    val notes: String? = null
)

// Editar parámetros de un ejercicio dentro de la rutina
@Serializable
data class UpdateRoutineExerciseRequest(
    val sets: Int? = null,
    val reps: String? = null,
    val restSeconds: Int? = null,
    val orderIndex: Int? = null,
    val notes: String? = null
)
