package com.example.models

import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IntIdTable
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime
import java.time.ZoneOffset

// Tabla para la base de datos
object ChatMessages : IntIdTable("chat_messages") {
    val senderId = reference("sender_id", Users)
    val receiverId = reference("receiver_id", Users)
    val content = text("content")
    // Usamos datetime para ser consistentes con calculateTimeAgo de tus rutas
    val createdAt = datetime("created_at").default(LocalDateTime.now(ZoneOffset.UTC))
    val isRead = bool("is_read").default(false)
}

// Entidad DAO
class ChatMessage(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<ChatMessage>(ChatMessages)

    var sender by User referencedOn ChatMessages.senderId
    var receiver by User referencedOn ChatMessages.receiverId
    var content by ChatMessages.content
    var createdAt by ChatMessages.createdAt
    var isRead by ChatMessages.isRead
}