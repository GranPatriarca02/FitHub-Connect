package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.ReferenceOption

object Monitors : IntIdTable("monitors") {
    // Relacion 1 a 1 con la tabla Users
    val userId = reference("user_id", Users, onDelete = ReferenceOption.CASCADE).uniqueIndex()
    val specialty = varchar("specialty", 100).nullable()
    val hourlyRate = decimal("hourly_rate", precision = 10, scale = 2).nullable()
    val bio = text("bio").nullable()
}

class Monitor(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Monitor>(Monitors)

    var user by User referencedOn Monitors.userId
    var specialty by Monitors.specialty
    var hourlyRate by Monitors.hourlyRate
    var bio by Monitors.bio
}
