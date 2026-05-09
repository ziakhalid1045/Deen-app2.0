package com.deen.app.data.repository

import com.deen.app.data.model.Comment
import com.deen.app.data.model.Post
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

class PostRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val storage = FirebaseStorage.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val postsCollection = firestore.collection("posts")

    val currentUserId: String get() = auth.currentUser?.uid.orEmpty()

    fun getFeedPosts(): Flow<List<Post>> = callbackFlow {
        val listener = postsCollection
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, _ ->
                val posts = snapshot?.toObjects(Post::class.java) ?: emptyList()
                trySend(posts)
            }
        awaitClose { listener.remove() }
    }

    fun getUserPosts(userId: String): Flow<List<Post>> = callbackFlow {
        val listener = postsCollection
            .whereEqualTo("authorId", userId)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, _ ->
                val posts = snapshot?.toObjects(Post::class.java) ?: emptyList()
                trySend(posts)
            }
        awaitClose { listener.remove() }
    }

    suspend fun createPost(content: String, imageBytes: List<ByteArray>): Result<Post> {
        return try {
            val postId = UUID.randomUUID().toString()
            var imageUrl = ""
            if (imageBytes.isNotEmpty()) {
                val ref = storage.reference.child("posts/$postId/image_0.jpg")
                ref.putBytes(imageBytes.first()).await()
                imageUrl = ref.downloadUrl.await().toString()
            }

            val user = firestore.collection("users").document(currentUserId).get().await()
            val postData = hashMapOf<String, Any?>(
                "id" to postId,
                "authorId" to currentUserId,
                "authorName" to (user.getString("displayName") ?: ""),
                "authorProfileImage" to (user.getString("photoURL") ?: ""),
                "content" to content,
                "imageUrl" to imageUrl,
                "videoUrl" to "",
                "mediaType" to if (imageUrl.isNotEmpty()) "image" else null,
                "privacy" to "public",
                "likesCount" to 0,
                "commentsCount" to 0,
                "viewsCount" to 0,
                "createdAt" to FieldValue.serverTimestamp()
            )
            postsCollection.document(postId).set(postData).await()
            firestore.collection("users").document(currentUserId)
                .update("postsCount", FieldValue.increment(1)).await()
            Result.success(Post(id = postId, authorId = currentUserId, content = content))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun likePost(postId: String): Result<Unit> {
        return try {
            // Write to likes subcollection as required by Firestore rules
            postsCollection.document(postId).collection("likes")
                .document(currentUserId)
                .set(mapOf("likedAt" to FieldValue.serverTimestamp())).await()
            // Increment likesCount (allowed by rules)
            postsCollection.document(postId)
                .update("likesCount", FieldValue.increment(1)).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun unlikePost(postId: String): Result<Unit> {
        return try {
            postsCollection.document(postId).collection("likes")
                .document(currentUserId).delete().await()
            postsCollection.document(postId)
                .update("likesCount", FieldValue.increment(-1)).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun isPostLiked(postId: String): Boolean {
        return try {
            val doc = postsCollection.document(postId).collection("likes")
                .document(currentUserId).get().await()
            doc.exists()
        } catch (_: Exception) { false }
    }

    suspend fun addComment(postId: String, content: String): Result<Comment> {
        return try {
            val commentId = UUID.randomUUID().toString()
            val user = firestore.collection("users").document(currentUserId).get().await()
            val commentData = hashMapOf<String, Any?>(
                "id" to commentId,
                "postId" to postId,
                "authorId" to currentUserId,
                "authorName" to (user.getString("displayName") ?: ""),
                "authorProfileImage" to (user.getString("photoURL") ?: ""),
                "content" to content,
                "createdAt" to FieldValue.serverTimestamp()
            )
            postsCollection.document(postId).collection("comments")
                .document(commentId).set(commentData).await()
            postsCollection.document(postId)
                .update("commentsCount", FieldValue.increment(1)).await()
            Result.success(Comment(id = commentId, postId = postId, authorId = currentUserId, content = content))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getComments(postId: String): Flow<List<Comment>> = callbackFlow {
        val listener = postsCollection.document(postId).collection("comments")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, _ ->
                val comments = snapshot?.toObjects(Comment::class.java) ?: emptyList()
                trySend(comments)
            }
        awaitClose { listener.remove() }
    }

    suspend fun deletePost(postId: String): Result<Unit> {
        return try {
            postsCollection.document(postId).delete().await()
            firestore.collection("users").document(currentUserId)
                .update("postsCount", FieldValue.increment(-1)).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun searchPosts(query: String): List<Post> {
        return try {
            val snapshot = postsCollection
                .orderBy("content")
                .startAt(query)
                .endAt(query + "\uf8ff")
                .limit(20)
                .get()
                .await()
            snapshot.toObjects(Post::class.java)
        } catch (_: Exception) { emptyList() }
    }
}
