package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.javatime.CurrentDateTime
import org.jetbrains.exposed.sql.javatime.datetime

// Tabla principal de rutinas
object Routines : IntIdTable("routines") {
    val title       = varchar("title", 200)
    val description = text("description").nullable()
    val creatorId   = reference("creator_id", Users, onDelete = ReferenceOption.CASCADE)
    val difficulty  = varchar("difficulty", 50).nullable() // Beginner / Intermediate / Advanced
    val goal        = varchar("goal", 100).nullable()      // Fuerza, Hipertrofia, Pérdida de peso, Resistencia...
    // Si es null la rutina es privada del creador;
    // si es TRAINER y la marca pública, cualquiera puede verla/copiarla.
    val isPublic    = bool("is_public").default(false)
    val isPremium   = bool("is_premium").default(false)
    val createdAt   = datetime("created_at").defaultExpression(CurrentDateTime)
}

class Routine(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Routine>(Routines)

    var title       by Routines.title
    var description by Routines.description
    var creator     by User referencedOn Routines.creatorId
    var difficulty  by Routines.difficulty
    var goal        by Routines.goal
    var isPublic    by Routines.isPublic
    var isPremium   by Routines.isPremium
    var createdAt   by Routines.createdAt
}

// Tabla intermedia: ejercicios dentro de una rutina con sus parámetros (series, reps...)
object RoutineExercises : IntIdTable("routine_exercises") {
    val routineId  = reference("routine_id", Routines, onDelete = ReferenceOption.CASCADE)
    val exerciseId = reference("exercise_id", Exercises, onDelete = ReferenceOption.CASCADE)
    val sets       = integer("sets").default(3)
    val reps       = varchar("reps", 30).default("10")   // puede ser "10", "8-12", "AMRAP", "30s"
    val restSeconds = integer("rest_seconds").default(60)
    val orderIndex = integer("order_index").default(0)   // orden en el que aparece el ejercicio
    val notes      = text("notes").nullable()
}

class RoutineExercise(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<RoutineExercise>(RoutineExercises)

    var routine     by Routine referencedOn RoutineExercises.routineId
    var exercise    by Exercise referencedOn RoutineExercises.exerciseId
    var sets        by RoutineExercises.sets
    var reps        by RoutineExercises.reps
    var restSeconds by RoutineExercises.restSeconds
    var orderIndex  by RoutineExercises.orderIndex
    var notes       by RoutineExercises.notes
}
