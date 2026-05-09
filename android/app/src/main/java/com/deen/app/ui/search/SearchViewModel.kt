package com.deen.app.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deen.app.data.model.Post
import com.deen.app.data.model.User
import com.deen.app.data.repository.PostRepository
import com.deen.app.data.repository.UserRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SearchUiState(
    val query: String = "",
    val users: List<User> = emptyList(),
    val posts: List<Post> = emptyList(),
    val isSearching: Boolean = false,
    val selectedTab: Int = 0
)

class SearchViewModel : ViewModel() {
    private val userRepository = UserRepository()
    private val postRepository = PostRepository()

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    fun onQueryChange(query: String) {
        _uiState.value = _uiState.value.copy(query = query)
        searchJob?.cancel()
        if (query.isBlank()) {
            _uiState.value = _uiState.value.copy(
                users = emptyList(),
                posts = emptyList(),
                isSearching = false
            )
            return
        }
        searchJob = viewModelScope.launch {
            delay(300)
            _uiState.value = _uiState.value.copy(isSearching = true)
            val users = userRepository.searchUsers(query)
            val posts = postRepository.searchPosts(query)
            _uiState.value = _uiState.value.copy(
                users = users,
                posts = posts,
                isSearching = false
            )
        }
    }

    fun onTabSelected(index: Int) {
        _uiState.value = _uiState.value.copy(selectedTab = index)
    }
}
