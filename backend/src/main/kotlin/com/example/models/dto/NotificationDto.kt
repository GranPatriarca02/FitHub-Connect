package com.example.models.dto

import kotlinx.serialization.Serializable

@Serializable
data class NotificationResponse(
    val id: Int,
    val title: String,
    val message: String,
    val type: String,
    val isRead: Boolean,
    val createdAt: String
)

@Serializable
data class SendChatRequest(
    val receiverId: Int,
    val message: String
)