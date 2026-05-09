package com.deen.app.ui.videos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deen.app.data.model.Video
import com.deen.app.data.repository.VideoRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class VideosUiState(
    val videos: List<Video> = emptyList(),
    val isLoading: Boolean = true,
    val likedVideoIds: Set<String> = emptySet(),
    val error: String? = null
)

class VideosViewModel : ViewModel() {
    private val videoRepository = VideoRepository()

    private val _uiState = MutableStateFlow(VideosUiState())
    val uiState: StateFlow<VideosUiState> = _uiState.asStateFlow()

    init {
        loadVideos()
    }

    private fun loadVideos() {
        viewModelScope.launch {
            videoRepository.getVideos().collect { videos ->
                _uiState.value = _uiState.value.copy(videos = videos, isLoading = false)
                checkLikedVideos(videos)
            }
        }
    }

    private fun checkLikedVideos(videos: List<Video>) {
        viewModelScope.launch {
            val likedIds = mutableSetOf<String>()
            videos.forEach { video ->
                if (videoRepository.isVideoLiked(video.id)) {
                    likedIds.add(video.id)
                }
            }
            _uiState.value = _uiState.value.copy(likedVideoIds = likedIds)
        }
    }

    fun likeVideo(video: Video) {
        val isLiked = video.id in _uiState.value.likedVideoIds
        viewModelScope.launch {
            if (isLiked) {
                _uiState.value = _uiState.value.copy(
                    likedVideoIds = _uiState.value.likedVideoIds - video.id
                )
                videoRepository.unlikeVideo(video.id)
            } else {
                _uiState.value = _uiState.value.copy(
                    likedVideoIds = _uiState.value.likedVideoIds + video.id
                )
                videoRepository.likeVideo(video.id)
            }
        }
    }

    fun incrementViewCount(videoId: String) {
        viewModelScope.launch {
            videoRepository.incrementViewCount(videoId)
        }
    }
}
