package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.javatime.CurrentDateTime
import org.jetbrains.exposed.sql.javatime.datetime

// Grupos musculares admitidos por la aplicación.
// Se guardan como cadena para poder ampliarlos sin migrar la BD.
// Ejemplos: PECHO, ESPALDA, PIERNAS, HOMBROS, BRAZOS, CORE, CARDIO, FULL_BODY
object Exercises : IntIdTable("exercises") {
    val name        = varchar("name", 150)
    val description = text("description").nullable()
    val muscleGroup = varchar("muscle_group", 60).nullable()
    val difficulty  = varchar("difficulty", 50).nullable() // Beginner / Intermediate / Advanced
    val equipment   = varchar("equipment", 120).nullable() // barra, mancuernas, máquina, peso corporal...
    val videoUrl    = varchar("video_url", 1000).nullable()
    // null = ejercicio oficial del catálogo de FitHub; si no, lo creó un monitor
    val creatorId   = reference("creator_id", Users, onDelete = ReferenceOption.SET_NULL).nullable()
    val createdAt   = datetime("created_at").defaultExpression(CurrentDateTime)
}

class Exercise(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Exercise>(Exercises)

    var name        by Exercises.name
    var description by Exercises.description
    var muscleGroup by Exercises.muscleGroup
    var difficulty  by Exercises.difficulty
    var equipment   by Exercises.equipment
    var videoUrl    by Exercises.videoUrl
    var creator     by User optionalReferencedOn Exercises.creatorId
    var createdAt   by Exercises.createdAt
}
