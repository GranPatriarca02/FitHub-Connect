package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object Notifications : IntIdTable("notifications") {
    val user = reference("user_id", Users)
    val title = varchar("title", 255)
    val message = text("message")
    val type = varchar("type", 50)          //TIPO: "CHAT", "SYSTEM", "BOOKING"
    val isRead = bool("is_read").default(false)
    val createdAt = datetime("created_at").default(LocalDateTime.now())
}

class Notification(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<Notification>(Notifications)
    var user by User referencedOn Notifications.user
    var title by Notifications.title
    var message by Notifications.message
    var type by Notifications.type
    var isRead by Notifications.isRead
    var createdAt by Notifications.createdAt
}