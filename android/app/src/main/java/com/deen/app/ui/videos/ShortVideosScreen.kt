package com.deen.app.ui.videos

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.deen.app.data.model.Video
import com.deen.app.ui.components.EmptyStateView
import com.deen.app.ui.components.LoadingScreen
import com.deen.app.ui.components.ProfileImage
import com.deen.app.util.formatCount

@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun ShortVideosScreen(
    viewModel: VideosViewModel,
    onProfileClick: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    when {
        uiState.isLoading -> LoadingScreen()
        uiState.videos.isEmpty() -> {
            EmptyStateView(
                icon = {
                    Icon(
                        Icons.Filled.VideoLibrary,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                },
                title = "No videos yet",
                subtitle = "Islamic short clips will appear here"
            )
        }
        else -> {
            val pagerState = rememberPagerState(pageCount = { uiState.videos.size })

            VerticalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                val video = uiState.videos[page]

                LaunchedEffect(page) {
                    viewModel.incrementViewCount(video.id)
                }

                VideoItem(
                    video = video,
                    isCurrentUser = false,
                    isLiked = video.id in uiState.likedVideoIds,
                    onLike = { viewModel.likeVideo(video) },
                    onComment = { },
                    onShare = { },
                    onProfileClick = { onProfileClick(video.authorId) }
                )
            }
        }
    }
}

@Composable
fun VideoItem(
    video: Video,
    isCurrentUser: Boolean,
    isLiked: Boolean,
    onLike: () -> Unit,
    onComment: () -> Unit,
    onShare: () -> Unit,
    onProfileClick: () -> Unit
) {
    var isPlaying by remember { mutableStateOf(true) }
    val likeColor by animateColorAsState(
        targetValue = if (isLiked) Color.Red else Color.White,
        label = "like_color"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .clickable { isPlaying = !isPlaying }
    ) {
        // Video placeholder with play icon
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Filled.PlayArrow,
                contentDescription = "Play",
                tint = Color.White.copy(alpha = if (!isPlaying) 0.7f else 0f),
                modifier = Modifier.size(72.dp)
            )
        }

        // Bottom gradient overlay
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))
                    )
                )
        )

        // Bottom info
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 16.dp, bottom = 80.dp, end = 80.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ProfileImage(
                    imageUrl = video.authorProfileImage,
                    size = 40.dp,
                    onClick = onProfileClick
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = video.authorName,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleSmall
                )
            }
            if (video.caption.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = video.caption,
                    color = Color.White,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 3
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.MusicNote,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "Islamic Nasheed",
                    color = Color.White,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        // Right side action buttons
        Column(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            VideoActionButton(
                icon = if (isLiked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                count = video.likesCount.formatCount(),
                tint = likeColor,
                onClick = onLike
            )
            VideoActionButton(
                icon = Icons.Filled.ChatBubble,
                count = video.commentsCount.formatCount(),
                tint = Color.White,
                onClick = onComment
            )
            VideoActionButton(
                icon = Icons.Filled.Share,
                count = video.viewsCount.formatCount(),
                tint = Color.White,
                onClick = onShare
            )
        }
    }
}

@Composable
fun VideoActionButton(
    icon: ImageVector,
    count: String,
    tint: Color,
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(Color.Black.copy(alpha = 0.3f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(28.dp)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = count,
            color = Color.White,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold
        )
    }
}
