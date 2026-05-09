package com.deen.app.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.ServerTimestamp

data class User(
    val uid: String = "",
    val displayName: String = "",
    val username: String = "",
    val email: String = "",
    val bio: String = "",
    val photoURL: String = "",
    val coverURL: String = "",
    val followersCount: Int = 0,
    val followingCount: Int = 0,
    val postsCount: Int = 0,
    val country: String = "",
    val isPrivate: Boolean = false,
    @get:ServerTimestamp
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)
