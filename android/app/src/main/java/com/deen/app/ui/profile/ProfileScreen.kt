package com.deen.app.ui.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.deen.app.ui.components.DeenButton
import com.deen.app.ui.components.DeenOutlinedButton
import com.deen.app.ui.components.LoadingScreen
import com.deen.app.ui.components.ProfileImage
import com.deen.app.ui.components.StatItem
import com.deen.app.ui.home.HomeFeedViewModel
import com.deen.app.ui.home.PostCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    userId: String?,
    profileViewModel: ProfileViewModel,
    homeFeedViewModel: HomeFeedViewModel,
    onEditProfile: () -> Unit,
    onSignOut: () -> Unit,
    onNavigateBack: (() -> Unit)?,
    onCommentClick: (String) -> Unit,
    onProfileClick: (String) -> Unit,
    onMessageUser: ((String) -> Unit)? = null
) {
    val uiState by profileViewModel.uiState.collectAsState()
    val feedState by homeFeedViewModel.uiState.collectAsState()
    val targetUserId = userId ?: profileViewModel.currentUserId
    val isOwnProfile = targetUserId == profileViewModel.currentUserId

    LaunchedEffect(targetUserId) {
        profileViewModel.loadProfile(targetUserId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = uiState.user?.displayName ?: "Profile",
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    if (onNavigateBack != null) {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    }
                },
                actions = {
                    if (isOwnProfile) {
                        IconButton(onClick = onSignOut) {
                            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign Out")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            LoadingScreen()
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                item {
                    ProfileHeader(
                        user = uiState.user,
                        isOwnProfile = isOwnProfile,
                        isFollowing = uiState.isFollowing,
                        onEditProfile = onEditProfile,
                        onFollow = { profileViewModel.followUser(targetUserId) },
                        onMessage = { onMessageUser?.invoke(targetUserId) }
                    )
                }
                item {
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    Text(
                        text = "Posts",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
                items(uiState.posts, key = { it.id }) { post ->
                    PostCard(
                        post = post,
                        currentUserId = profileViewModel.currentUserId,
                        isLiked = post.id in feedState.likedPostIds,
                        onLike = { homeFeedViewModel.likePost(post) },
                        onComment = { onCommentClick(post.id) },
                        onShare = { },
                        onProfileClick = { onProfileClick(post.authorId) },
                        onDelete = if (post.authorId == profileViewModel.currentUserId) {
                            { homeFeedViewModel.deletePost(post.id) }
                        } else null
                    )
                }
            }
        }
    }
}

@Composable
fun ProfileHeader(
    user: com.deen.app.data.model.User?,
    isOwnProfile: Boolean,
    isFollowing: Boolean,
    onEditProfile: () -> Unit,
    onFollow: () -> Unit,
    onMessage: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        ProfileImage(
            imageUrl = user?.photoURL,
            size = 96.dp
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = user?.displayName ?: "",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )

        if (!user?.username.isNullOrBlank()) {
            Text(
                text = "@${user?.username}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (!user?.bio.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = user?.bio ?: "",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StatItem(
                count = "${user?.postsCount ?: 0}",
                label = "Posts"
            )
            StatItem(
                count = "${user?.followersCount ?: 0}",
                label = "Followers"
            )
            StatItem(
                count = "${user?.followingCount ?: 0}",
                label = "Following"
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (isOwnProfile) {
            DeenOutlinedButton(
                text = "Edit Profile",
                onClick = onEditProfile,
                modifier = Modifier.fillMaxWidth(0.6f)
            )
        } else {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                if (isFollowing) {
                    DeenOutlinedButton(
                        text = "Following",
                        onClick = onFollow,
                        modifier = Modifier.weight(1f)
                    )
                } else {
                    DeenButton(
                        text = "Follow",
                        onClick = onFollow,
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                DeenOutlinedButton(
                    text = "Message",
                    onClick = onMessage,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}
