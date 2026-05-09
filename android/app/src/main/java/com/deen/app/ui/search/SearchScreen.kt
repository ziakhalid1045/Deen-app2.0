package com.deen.app.ui.search

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.deen.app.data.model.User
import com.deen.app.ui.components.EmptyStateView
import com.deen.app.ui.components.LoadingScreen
import com.deen.app.ui.components.ProfileImage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    onNavigateBack: () -> Unit,
    onProfileClick: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val tabs = listOf("Users", "Posts")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Search", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            OutlinedTextField(
                value = uiState.query,
                onValueChange = { viewModel.onQueryChange(it) },
                placeholder = { Text("Search users, posts...") },
                leadingIcon = {
                    Icon(Icons.Filled.Search, contentDescription = null)
                },
                trailingIcon = {
                    if (uiState.query.isNotBlank()) {
                        IconButton(onClick = { viewModel.onQueryChange("") }) {
                            Icon(Icons.Filled.Clear, contentDescription = "Clear")
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                shape = RoundedCornerShape(16.dp),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary
                )
            )

            Spacer(modifier = Modifier.height(8.dp))

            TabRow(selectedTabIndex = uiState.selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = uiState.selectedTab == index,
                        onClick = { viewModel.onTabSelected(index) },
                        text = { Text(title) }
                    )
                }
            }

            when {
                uiState.isSearching -> LoadingScreen()
                uiState.query.isBlank() -> {
                    EmptyStateView(
                        icon = {
                            Icon(
                                Icons.Filled.Search,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        },
                        title = "Search the community",
                        subtitle = "Find users, posts, and more"
                    )
                }
                else -> {
                    when (uiState.selectedTab) {
                        0 -> UserSearchResults(
                            users = uiState.users,
                            onProfileClick = onProfileClick
                        )
                        1 -> PostSearchResults(posts = uiState.posts)
                    }
                }
            }
        }
    }
}

@Composable
fun UserSearchResults(
    users: List<User>,
    onProfileClick: (String) -> Unit
) {
    if (users.isEmpty()) {
        EmptyStateView(
            icon = {
                Icon(
                    Icons.Filled.Search,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            title = "No users found"
        )
    } else {
        LazyColumn {
            items(users, key = { it.uid }) { user ->
                UserSearchItem(
                    user = user,
                    onClick = { onProfileClick(user.uid) }
                )
            }
        }
    }
}

@Composable
fun UserSearchItem(user: User, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            ProfileImage(imageUrl = user.photoURL, size = 48.dp)
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = user.displayName,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "@${user.username}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (user.bio.isNotBlank()) {
                    Text(
                        text = user.bio,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = "${user.followersCount} followers",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun PostSearchResults(posts: List<com.deen.app.data.model.Post>) {
    if (posts.isEmpty()) {
        EmptyStateView(
            icon = {
                Icon(
                    Icons.Filled.Search,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            title = "No posts found"
        )
    } else {
        LazyColumn {
            items(posts, key = { it.id }) { post ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ProfileImage(imageUrl = post.authorProfileImage, size = 36.dp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = post.authorName,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = post.content,
                            style = MaterialTheme.typography.bodyMedium,
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}
