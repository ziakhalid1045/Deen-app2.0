package com.deen.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

data class Post(
    val id: String = "",
    val authorId: String = "",
    val authorName: String = "",
    val authorProfileImage: String = "",
    val content: String = "",
    val imageUrl: String = "",
    val videoUrl: String = "",
    val mediaType: String? = null, // image, video, raw
    val isShort: Boolean? = null,
    val privacy: String = "public",
    val likesCount: Int = 0,
    val commentsCount: Int = 0,
    val viewsCount: Int = 0,
    @get:ServerTimestamp
    val createdAt: Timestamp? = null
)

data class Comment(
    val id: String = "",
    val postId: String = "",
    val authorId: String = "",
    val authorName: String = "",
    val authorProfileImage: String = "",
    val content: String = "",
    @get:ServerTimestamp
    val createdAt: Timestamp? = null
)
