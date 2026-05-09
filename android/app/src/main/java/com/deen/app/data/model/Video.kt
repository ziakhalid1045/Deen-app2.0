package com.deen.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

data class Video(
    val id: String = "",
    val authorId: String = "",
    val authorName: String = "",
    val authorProfileImage: String = "",
    val videoUrl: String = "",
    val thumbnailUrl: String = "",
    val caption: String = "",
    val likesCount: Int = 0,
    val commentsCount: Int = 0,
    val viewsCount: Int = 0,
    val isShort: Boolean = true,
    @get:ServerTimestamp
    val createdAt: Timestamp? = null
)
