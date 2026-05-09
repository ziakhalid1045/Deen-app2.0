package com.deen.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

data class Notification(
    val id: String = "",
    val userId: String = "",
    val fromUserId: String = "",
    val fromUserName: String = "",
    val fromUserImage: String = "",
    val type: NotificationType = NotificationType.LIKE,
    val postId: String = "",
    val message: String = "",
    val read: Boolean = false,
    @get:ServerTimestamp
    val createdAt: Timestamp? = null
)

enum class NotificationType {
    LIKE, COMMENT, FOLLOW, MESSAGE, SHARE
}
