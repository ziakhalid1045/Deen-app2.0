package com.deen.app.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deen.app.data.model.Chat
import com.deen.app.data.model.Message
import com.deen.app.data.repository.ChatRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ChatListUiState(
    val chats: List<Chat> = emptyList(),
    val isLoading: Boolean = true
)

data class ChatDetailUiState(
    val messages: List<Message> = emptyList(),
    val chat: Chat? = null,
    val isLoading: Boolean = true
)

class ChatViewModel : ViewModel() {
    private val chatRepository = ChatRepository()
    private var messagesJob: Job? = null

    private val _chatListState = MutableStateFlow(ChatListUiState())
    val chatListState: StateFlow<ChatListUiState> = _chatListState.asStateFlow()

    private val _chatDetailState = MutableStateFlow(ChatDetailUiState())
    val chatDetailState: StateFlow<ChatDetailUiState> = _chatDetailState.asStateFlow()

    val currentUserId: String get() = chatRepository.currentUserId

    init {
        loadChats()
    }

    private fun loadChats() {
        viewModelScope.launch {
            chatRepository.getUserChats().collect { chats ->
                _chatListState.value = _chatListState.value.copy(
                    chats = chats,
                    isLoading = false
                )
            }
        }
    }

    fun loadMessages(chatId: String) {
        messagesJob?.cancel()
        val chat = _chatListState.value.chats.find { it.id == chatId }
        _chatDetailState.value = _chatDetailState.value.copy(
            chat = chat,
            messages = emptyList(),
            isLoading = true
        )

        messagesJob = viewModelScope.launch {
            chatRepository.getMessages(chatId).collect { messages ->
                _chatDetailState.value = _chatDetailState.value.copy(
                    messages = messages,
                    isLoading = false
                )
            }
        }
    }

    fun sendMessage(chatId: String, content: String) {
        if (content.isBlank()) return
        viewModelScope.launch {
            chatRepository.sendMessage(chatId, content)
        }
    }

    fun createChat(otherUserId: String, onCreated: (String) -> Unit) {
        viewModelScope.launch {
            val result = chatRepository.createChat(otherUserId)
            result.getOrNull()?.let { chat ->
                onCreated(chat.id)
            }
        }
    }

    fun createGroupChat(name: String, memberIds: List<String>, onCreated: (String) -> Unit) {
        viewModelScope.launch {
            val result = chatRepository.createGroupChat(name, memberIds)
            result.getOrNull()?.let { chat ->
                onCreated(chat.id)
            }
        }
    }
}
