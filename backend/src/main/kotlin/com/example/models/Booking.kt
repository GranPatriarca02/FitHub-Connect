package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.ReferenceOption
import org.jetbrains.exposed.sql.javatime.datetime
import org.jetbrains.exposed.sql.javatime.CurrentDateTime
import java.time.LocalDateTime

// Estados de reserva
enum class BookingStatus {
    PENDING,    // Solicitada
    CONFIRMED,  // Aceptada
    CANCELLED,  // Cancelada
    COMPLETED   // Terminada
}

object Bookings : IntIdTable("bookings") {
    val userId = reference("user_id", Users, onDelete = ReferenceOption.CASCADE)
    val monitorId = reference("monitor_id", Monitors, onDelete = ReferenceOption.CASCADE)
    val date = datetime("date")
    val startTime = varchar("start_time", 5)
    val endTime = varchar("end_time", 5)
    val status = enumerationByName("status", 20, BookingStatus::class).default(BookingStatus.PENDING)
    val notes = text("notes").nullable()
    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
}

class Booking(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Booking>(Bookings)

    var user by User referencedOn Bookings.userId
    var monitor by Monitor referencedOn Bookings.monitorId
    var date by Bookings.date
    var startTime by Bookings.startTime
    var endTime by Bookings.endTime
    var status by Bookings.status
    var notes by Bookings.notes
    var createdAt by Bookings.createdAt
}
