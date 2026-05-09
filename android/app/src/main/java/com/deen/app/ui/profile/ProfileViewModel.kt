package com.deen.app.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deen.app.data.model.Post
import com.deen.app.data.model.User
import com.deen.app.data.repository.PostRepository
import com.deen.app.data.repository.UserRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ProfileUiState(
    val user: User? = null,
    val posts: List<Post> = emptyList(),
    val isLoading: Boolean = true,
    val isUpdating: Boolean = false,
    val isFollowing: Boolean = false,
    val error: String? = null
)

class ProfileViewModel : ViewModel() {
    private val userRepository = UserRepository()
    private val postRepository = PostRepository()

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    val currentUserId: String get() = userRepository.currentUserId

    fun loadProfile(userId: String = userRepository.currentUserId) {
        viewModelScope.launch {
            userRepository.getUserFlow(userId).collect { user ->
                _uiState.value = _uiState.value.copy(user = user, isLoading = false)
            }
        }
        viewModelScope.launch {
            postRepository.getUserPosts(userId).collect { posts ->
                _uiState.value = _uiState.value.copy(posts = posts)
            }
        }
        if (userId != currentUserId) {
            viewModelScope.launch {
                val following = userRepository.isFollowing(userId)
                _uiState.value = _uiState.value.copy(isFollowing = following)
            }
        }
    }

    fun updateProfile(displayName: String, bio: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isUpdating = true)
            val updates = mutableMapOf<String, Any>()
            if (displayName.isNotBlank()) updates["displayName"] = displayName
            updates["bio"] = bio

            val result = userRepository.updateProfile(updates)
            _uiState.value = _uiState.value.copy(
                isUpdating = false,
                error = result.exceptionOrNull()?.message
            )
        }
    }

    fun followUser(userId: String) {
        viewModelScope.launch {
            val isFollowing = _uiState.value.isFollowing
            _uiState.value = _uiState.value.copy(isFollowing = !isFollowing)
            if (isFollowing) {
                userRepository.unfollowUser(userId)
            } else {
                userRepository.followUser(userId)
            }
        }
    }

    fun uploadProfileImage(imageBytes: ByteArray) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isUpdating = true)
            val result = userRepository.uploadProfileImage(imageBytes)
            _uiState.value = _uiState.value.copy(
                isUpdating = false,
                error = result.exceptionOrNull()?.message
            )
        }
    }
}
