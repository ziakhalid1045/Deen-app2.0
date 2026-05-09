package com.deen.app.data.repository

import com.deen.app.data.model.Video
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.UUID

class VideoRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val storage = FirebaseStorage.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val postsCollection = firestore.collection("posts")

    val currentUserId: String get() = auth.currentUser?.uid.orEmpty()

    fun getVideos(): Flow<List<Video>> = callbackFlow {
        val listener = postsCollection
            .whereEqualTo("isShort", true)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, _ ->
                val videos = snapshot?.documents?.mapNotNull { doc ->
                    doc.toObject(Video::class.java)
                } ?: emptyList()
                trySend(videos)
            }
        awaitClose { listener.remove() }
    }

    suspend fun uploadVideo(videoBytes: ByteArray, caption: String): Result<Video> {
        return try {
            val videoId = UUID.randomUUID().toString()
            val ref = storage.reference.child("videos/$videoId.mp4")
            ref.putBytes(videoBytes).await()
            val videoUrl = ref.downloadUrl.await().toString()

            val user = firestore.collection("users").document(currentUserId).get().await()
            val videoData = hashMapOf<String, Any?>(
                "id" to videoId,
                "authorId" to currentUserId,
                "authorName" to (user.getString("displayName") ?: ""),
                "authorProfileImage" to (user.getString("photoURL") ?: ""),
                "videoUrl" to videoUrl,
                "content" to caption,
                "isShort" to true,
                "mediaType" to "video",
                "privacy" to "public",
                "likesCount" to 0,
                "commentsCount" to 0,
                "viewsCount" to 0,
                "createdAt" to FieldValue.serverTimestamp()
            )
            postsCollection.document(videoId).set(videoData).await()
            Result.success(Video(id = videoId, authorId = currentUserId, videoUrl = videoUrl, caption = caption))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun likeVideo(videoId: String): Result<Unit> {
        return try {
            postsCollection.document(videoId).collection("likes")
                .document(currentUserId)
                .set(mapOf("likedAt" to FieldValue.serverTimestamp())).await()
            postsCollection.document(videoId)
                .update("likesCount", FieldValue.increment(1)).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun unlikeVideo(videoId: String): Result<Unit> {
        return try {
            postsCollection.document(videoId).collection("likes")
                .document(currentUserId).delete().await()
            postsCollection.document(videoId)
                .update("likesCount", FieldValue.increment(-1)).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun isVideoLiked(videoId: String): Boolean {
        return try {
            val doc = postsCollection.document(videoId).collection("likes")
                .document(currentUserId).get().await()
            doc.exists()
        } catch (_: Exception) { false }
    }

    suspend fun incrementViewCount(videoId: String) {
        try {
            postsCollection.document(videoId)
                .update("viewsCount", FieldValue.increment(1)).await()
        } catch (_: Exception) { }
    }
}
