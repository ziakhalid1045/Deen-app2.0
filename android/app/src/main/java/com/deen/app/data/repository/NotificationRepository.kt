package com.deen.app.data.repository

import com.deen.app.data.model.Notification
import com.deen.app.data.model.NotificationType
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.UUID

class NotificationRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val auth = FirebaseAuth.getInstance()

    val currentUserId: String get() = auth.currentUser?.uid.orEmpty()

    private fun userNotificationsCollection(userId: String) =
        firestore.collection("users").document(userId).collection("notifications")

    fun getNotifications(): Flow<List<Notification>> = callbackFlow {
        val listener = userNotificationsCollection(currentUserId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, _ ->
                val notifications = snapshot?.toObjects(Notification::class.java) ?: emptyList()
                trySend(notifications)
            }
        awaitClose { listener.remove() }
    }

    suspend fun createNotification(
        targetUserId: String,
        type: NotificationType,
        postId: String = "",
        message: String = ""
    ): Result<Unit> {
        return try {
            if (targetUserId == currentUserId) return Result.success(Unit)

            val notificationId = UUID.randomUUID().toString()
            val user = firestore.collection("users").document(currentUserId).get().await()
            val notificationData = hashMapOf<String, Any?>(
                "id" to notificationId,
                "userId" to targetUserId,
                "fromUserId" to currentUserId,
                "fromUserName" to (user.getString("displayName") ?: ""),
                "fromUserImage" to (user.getString("photoURL") ?: ""),
                "type" to type.name,
                "postId" to postId,
                "message" to message,
                "read" to false,
                "createdAt" to FieldValue.serverTimestamp()
            )
            userNotificationsCollection(targetUserId)
                .document(notificationId).set(notificationData).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markAsRead(notificationId: String): Result<Unit> {
        return try {
            userNotificationsCollection(currentUserId)
                .document(notificationId)
                .update("read", true).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markAllAsRead(): Result<Unit> {
        return try {
            val unread = userNotificationsCollection(currentUserId)
                .whereEqualTo("read", false)
                .get().await()
            val batch = firestore.batch()
            unread.documents.forEach { doc ->
                batch.update(doc.reference, "read", true)
            }
            batch.commit().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
