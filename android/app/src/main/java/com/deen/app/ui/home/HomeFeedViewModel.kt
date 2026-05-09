package com.deen.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deen.app.data.model.Comment
import com.deen.app.data.model.Post
import com.deen.app.data.repository.PostRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeFeedUiState(
    val posts: List<Post> = emptyList(),
    val isLoading: Boolean = true,
    val isCreatingPost: Boolean = false,
    val comments: List<Comment> = emptyList(),
    val likedPostIds: Set<String> = emptySet(),
    val error: String? = null
)

class HomeFeedViewModel : ViewModel() {
    private val postRepository = PostRepository()
    private var commentsJob: Job? = null

    private val _uiState = MutableStateFlow(HomeFeedUiState())
    val uiState: StateFlow<HomeFeedUiState> = _uiState.asStateFlow()

    val currentUserId: String get() = postRepository.currentUserId

    init {
        loadPosts()
    }

    private fun loadPosts() {
        viewModelScope.launch {
            postRepository.getFeedPosts().collect { posts ->
                _uiState.value = _uiState.value.copy(posts = posts, isLoading = false)
                checkLikedPosts(posts)
            }
        }
    }

    private fun checkLikedPosts(posts: List<Post>) {
        viewModelScope.launch {
            val likedIds = mutableSetOf<String>()
            posts.forEach { post ->
                if (postRepository.isPostLiked(post.id)) {
                    likedIds.add(post.id)
                }
            }
            _uiState.value = _uiState.value.copy(likedPostIds = likedIds)
        }
    }

    fun likePost(post: Post) {
        val isLiked = post.id in _uiState.value.likedPostIds
        viewModelScope.launch {
            if (isLiked) {
                _uiState.value = _uiState.value.copy(
                    likedPostIds = _uiState.value.likedPostIds - post.id
                )
                postRepository.unlikePost(post.id)
            } else {
                _uiState.value = _uiState.value.copy(
                    likedPostIds = _uiState.value.likedPostIds + post.id
                )
                postRepository.likePost(post.id)
            }
        }
    }

    fun createPost(content: String, imageBytes: List<ByteArray> = emptyList()) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isCreatingPost = true)
            val result = postRepository.createPost(content, imageBytes)
            _uiState.value = _uiState.value.copy(
                isCreatingPost = false,
                error = result.exceptionOrNull()?.message
            )
        }
    }

    fun deletePost(postId: String) {
        viewModelScope.launch {
            postRepository.deletePost(postId)
        }
    }

    fun loadComments(postId: String) {
        commentsJob?.cancel()
        commentsJob = viewModelScope.launch {
            postRepository.getComments(postId).collect { comments ->
                _uiState.value = _uiState.value.copy(comments = comments)
            }
        }
    }

    fun addComment(postId: String, content: String) {
        viewModelScope.launch {
            postRepository.addComment(postId, content)
        }
    }
}
