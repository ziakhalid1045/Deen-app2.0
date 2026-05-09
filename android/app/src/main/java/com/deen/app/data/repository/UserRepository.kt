package com.deen.app.data.repository

import com.deen.app.data.model.User
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class UserRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val storage = FirebaseStorage.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val usersCollection = firestore.collection("users")

    val currentUserId: String get() = auth.currentUser?.uid.orEmpty()

    fun getUserFlow(userId: String): Flow<User?> = callbackFlow {
        val listener = usersCollection.document(userId)
            .addSnapshotListener { snapshot, _ ->
                trySend(snapshot?.toObject(User::class.java))
            }
        awaitClose { listener.remove() }
    }

    suspend fun getUser(userId: String): User? {
        return try {
            usersCollection.document(userId).get().await().toObject(User::class.java)
        } catch (_: Exception) { null }
    }

    suspend fun updateProfile(updates: Map<String, Any>): Result<Unit> {
        return try {
            usersCollection.document(currentUserId).update(updates).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadProfileImage(imageBytes: ByteArray): Result<String> {
        return try {
            val ref = storage.reference.child("profile_images/$currentUserId.jpg")
            ref.putBytes(imageBytes).await()
            val url = ref.downloadUrl.await().toString()
            usersCollection.document(currentUserId).update("photoURL", url).await()
            Result.success(url)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun followUser(targetUserId: String): Result<Unit> {
        return try {
            // Write to subcollections as required by Firestore rules
            usersCollection.document(currentUserId)
                .collection("following").document(targetUserId)
                .set(mapOf("followedAt" to FieldValue.serverTimestamp())).await()
            usersCollection.document(targetUserId)
                .collection("followers").document(currentUserId)
                .set(mapOf("followedAt" to FieldValue.serverTimestamp())).await()

            // Update numeric counters (allowed by rules)
            usersCollection.document(currentUserId)
                .update("followingCount", FieldValue.increment(1)).await()
            usersCollection.document(targetUserId)
                .update("followersCount", FieldValue.increment(1)).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun unfollowUser(targetUserId: String): Result<Unit> {
        return try {
            usersCollection.document(currentUserId)
                .collection("following").document(targetUserId).delete().await()
            usersCollection.document(targetUserId)
                .collection("followers").document(currentUserId).delete().await()

            usersCollection.document(currentUserId)
                .update("followingCount", FieldValue.increment(-1)).await()
            usersCollection.document(targetUserId)
                .update("followersCount", FieldValue.increment(-1)).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun isFollowing(targetUserId: String): Boolean {
        return try {
            val doc = usersCollection.document(currentUserId)
                .collection("following").document(targetUserId).get().await()
            doc.exists()
        } catch (_: Exception) { false }
    }

    suspend fun searchUsers(query: String): List<User> {
        return try {
            val snapshot = usersCollection
                .orderBy("displayName")
                .startAt(query)
                .endAt(query + "\uf8ff")
                .limit(20)
                .get()
                .await()
            snapshot.toObjects(User::class.java)
        } catch (_: Exception) { emptyList() }
    }
}
