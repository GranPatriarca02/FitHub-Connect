package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable

object Routines : IntIdTable("routines") {
    val title = varchar("title", 200)
    val description = text("description").nullable()
    val creatorId = reference("creator_id", Users)
    val difficulty = varchar("difficulty", 50).nullable() // e.g., Beginner, Intermediate, Advanced
}

class Routine(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Routine>(Routines)

    var title by Routines.title
    var description by Routines.description
    var creator by User referencedOn Routines.creatorId
    var difficulty by Routines.difficulty
}
