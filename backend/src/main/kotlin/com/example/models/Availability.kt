package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import java.time.LocalTime
import java.time.DayOfWeek
import org.jetbrains.exposed.sql.javatime.time

object Availabilities : IntIdTable("availabilities") {
    val monitorId = reference("monitor_id", Monitors)
    // Dia de la semana
    val dayOfWeek = enumeration("day_of_week", DayOfWeek::class)
    val startTime = time("start_time")
    val endTime = time("end_time")
    val isAvailable = bool("is_available").default(true)
}

class Availability(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Availability>(Availabilities)

    var monitor by Monitor referencedOn Availabilities.monitorId
    var dayOfWeek by Availabilities.dayOfWeek
    var startTime by Availabilities.startTime
    var endTime by Availabilities.endTime
    var isAvailable by Availabilities.isAvailable
}
