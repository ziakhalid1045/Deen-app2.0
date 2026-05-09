package com.deen.app.data.repository

import com.deen.app.data.model.Chat
import com.deen.app.data.model.Message
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

class ChatRepository {
    private val firestore = FirebaseFirestore.getInstance()
    private val storage = FirebaseStorage.getInstance()
    private val auth = FirebaseAuth.getInstance()
    private val chatsCollection = firestore.collection("chats")

    val currentUserId: String get() = auth.currentUser?.uid.orEmpty()

    fun getUserChats(): Flow<List<Chat>> = callbackFlow {
        val listener = chatsCollection
            .whereArrayContains("participants", currentUserId)
            .orderBy("lastMessageAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, _ ->
                val chats = snapshot?.toObjects(Chat::class.java) ?: emptyList()
                trySend(chats)
            }
        awaitClose { listener.remove() }
    }

    fun getMessages(chatId: String): Flow<List<Message>> = callbackFlow {
        val listener = chatsCollection.document(chatId).collection("messages")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, _ ->
                val messages = snapshot?.toObjects(Message::class.java) ?: emptyList()
                trySend(messages)
            }
        awaitClose { listener.remove() }
    }

    suspend fun sendMessage(chatId: String, content: String, type: String = "text"): Result<Message> {
        return try {
            val messageId = UUID.randomUUID().toString()
            val user = firestore.collection("users").document(currentUserId).get().await()
            val messageData = hashMapOf<String, Any?>(
                "id" to messageId,
                "chatId" to chatId,
                "senderId" to currentUserId,
                "senderName" to (user.getString("displayName") ?: ""),
                "content" to content,
                "mediaUrl" to "",
                "type" to type,
                "status" to "sent",
                "createdAt" to FieldValue.serverTimestamp()
            )
            chatsCollection.document(chatId).collection("messages")
                .document(messageId).set(messageData).await()
            chatsCollection.document(chatId).update(
                mapOf(
                    "lastMessage" to content,
                    "lastMessageSenderId" to currentUserId,
                    "lastMessageAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Message(id = messageId, chatId = chatId, senderId = currentUserId, content = content))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createChat(otherUserId: String): Result<Chat> {
        return try {
            val existing = chatsCollection
                .whereArrayContains("participants", currentUserId)
                .get().await()
                .toObjects(Chat::class.java)
                .find { !it.isGroup && it.participants.contains(otherUserId) }

            if (existing != null) return Result.success(existing)

            val chatId = UUID.randomUUID().toString()
            val currentUserDoc = firestore.collection("users").document(currentUserId).get().await()
            val otherUserDoc = firestore.collection("users").document(otherUserId).get().await()

            val chatData = hashMapOf<String, Any?>(
                "id" to chatId,
                "participants" to listOf(currentUserId, otherUserId),
                "participantNames" to mapOf(
                    currentUserId to (currentUserDoc.getString("displayName") ?: ""),
                    otherUserId to (otherUserDoc.getString("displayName") ?: "")
                ),
                "participantImages" to mapOf(
                    currentUserId to (currentUserDoc.getString("photoURL") ?: ""),
                    otherUserId to (otherUserDoc.getString("photoURL") ?: "")
                ),
                "lastMessage" to "",
                "lastMessageSenderId" to "",
                "lastMessageAt" to FieldValue.serverTimestamp(),
                "isGroup" to false,
                "groupName" to "",
                "groupImageUrl" to "",
                "unreadCount" to emptyMap<String, Int>(),
                "updatedAt" to FieldValue.serverTimestamp(),
                "createdAt" to FieldValue.serverTimestamp()
            )
            chatsCollection.document(chatId).set(chatData).await()
            Result.success(Chat(id = chatId, participants = listOf(currentUserId, otherUserId)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createGroupChat(name: String, memberIds: List<String>): Result<Chat> {
        return try {
            val chatId = UUID.randomUUID().toString()
            val allParticipants = (memberIds + currentUserId).distinct()

            val names = mutableMapOf<String, String>()
            val images = mutableMapOf<String, String>()
            allParticipants.forEach { uid ->
                val doc = firestore.collection("users").document(uid).get().await()
                names[uid] = doc.getString("displayName") ?: ""
                images[uid] = doc.getString("photoURL") ?: ""
            }

            val chatData = hashMapOf<String, Any?>(
                "id" to chatId,
                "participants" to allParticipants,
                "participantNames" to names,
                "participantImages" to images,
                "lastMessage" to "",
                "lastMessageSenderId" to "",
                "lastMessageAt" to FieldValue.serverTimestamp(),
                "isGroup" to true,
                "groupName" to name,
                "groupImageUrl" to "",
                "unreadCount" to emptyMap<String, Int>(),
                "updatedAt" to FieldValue.serverTimestamp(),
                "createdAt" to FieldValue.serverTimestamp()
            )
            chatsCollection.document(chatId).set(chatData).await()
            Result.success(Chat(id = chatId, participants = allParticipants, isGroup = true, groupName = name))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendImageMessage(chatId: String, imageBytes: ByteArray): Result<Message> {
        return try {
            val imageId = UUID.randomUUID().toString()
            val ref = storage.reference.child("chat_images/$chatId/$imageId.jpg")
            ref.putBytes(imageBytes).await()
            val imageUrl = ref.downloadUrl.await().toString()

            val messageId = UUID.randomUUID().toString()
            val user = firestore.collection("users").document(currentUserId).get().await()
            val messageData = hashMapOf<String, Any?>(
                "id" to messageId,
                "chatId" to chatId,
                "senderId" to currentUserId,
                "senderName" to (user.getString("displayName") ?: ""),
                "content" to "Photo",
                "mediaUrl" to imageUrl,
                "type" to "image",
                "status" to "sent",
                "createdAt" to FieldValue.serverTimestamp()
            )
            chatsCollection.document(chatId).collection("messages")
                .document(messageId).set(messageData).await()
            chatsCollection.document(chatId).update(
                mapOf(
                    "lastMessage" to "Photo",
                    "lastMessageSenderId" to currentUserId,
                    "lastMessageAt" to FieldValue.serverTimestamp(),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(Message(id = messageId, chatId = chatId, senderId = currentUserId, content = "Photo", mediaUrl = imageUrl))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
