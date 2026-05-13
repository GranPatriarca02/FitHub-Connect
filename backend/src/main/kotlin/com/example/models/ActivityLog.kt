package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object ActivityLogs : IntIdTable("activity_logs") {
    val user = reference("user_id", Users)
    val category = varchar("category", 50)  // Tipo de categoría
    val device = varchar("device", 255)      // Dispositivo
    val ipAddress = varchar("ip_address", 50)
    val status = varchar("status", 50)       // Estados: "Success", "Warning", "Failed"
    val createdAt = datetime("created_at").default(LocalDateTime.now())
}

class ActivityLog(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<ActivityLog>(ActivityLogs)
    var user by User referencedOn ActivityLogs.user
    var category by ActivityLogs.category
    var device by ActivityLogs.device
    var ipAddress by ActivityLogs.ipAddress
    var status by ActivityLogs.status
    var createdAt by ActivityLogs.createdAt
}