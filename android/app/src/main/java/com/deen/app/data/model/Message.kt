package com.deen.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ServerTimestamp

data class Message(
    val id: String = "",
    val chatId: String = "",
    val senderId: String = "",
    val senderName: String = "",
    val content: String = "",
    val mediaUrl: String = "",
    val type: String = "text", // text, image, video, voice
    val status: String = "sent", // sent, delivered, read
    @get:ServerTimestamp
    val createdAt: Timestamp? = null
)

data class Chat(
    val id: String = "",
    val participants: List<String> = emptyList(),
    val participantNames: Map<String, String> = emptyMap(),
    val participantImages: Map<String, String> = emptyMap(),
    val lastMessage: String = "",
    val lastMessageSenderId: String = "",
    val lastMessageAt: Timestamp? = null,
    val isGroup: Boolean = false,
    val groupName: String = "",
    val groupImageUrl: String = "",
    val unreadCount: Map<String, Int> = emptyMap(),
    @get:ServerTimestamp
    val updatedAt: Timestamp? = null,
    @get:ServerTimestamp
    val createdAt: Timestamp? = null
)
