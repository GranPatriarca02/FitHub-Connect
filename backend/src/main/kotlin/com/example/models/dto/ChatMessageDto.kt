package com.example.models.dto

import kotlinx.serialization.Serializable

@Serializable
data class ChatMessageDto(
    val senderId: Int? = null, 
    val receiverId: Int,
    val content: String,
    val timestamp: Long? = null
)