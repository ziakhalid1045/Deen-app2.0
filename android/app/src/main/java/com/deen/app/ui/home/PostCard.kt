package com.deen.app.ui.home

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.deen.app.data.model.Post
import com.deen.app.ui.components.ProfileImage
import com.deen.app.util.formatCount
import com.deen.app.util.toRelativeTime

@Composable
fun PostCard(
    post: Post,
    currentUserId: String,
    isLiked: Boolean = false,
    onLike: () -> Unit,
    onComment: () -> Unit,
    onShare: () -> Unit,
    onProfileClick: (String) -> Unit,
    onDelete: (() -> Unit)? = null
) {
    var showMenu by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                ProfileImage(
                    imageUrl = post.authorProfileImage,
                    size = 40.dp,
                    modifier = Modifier.clickable { onProfileClick(post.authorId) }
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = post.authorName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable { onProfileClick(post.authorId) }
                    )
                    Text(
                        text = post.createdAt.toRelativeTime(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (onDelete != null) {
                    IconButton(onClick = { showMenu = true }) {
                        Icon(Icons.Filled.MoreVert, contentDescription = "More")
                    }
                    DropdownMenu(
                        expanded = showMenu,
                        onDismissRequest = { showMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Delete") },
                            onClick = {
                                showMenu = false
                                onDelete()
                            },
                            leadingIcon = { Icon(Icons.Filled.Delete, contentDescription = null) }
                        )
                    }
                }
            }

            if (post.content.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = post.content,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 10,
                    overflow = TextOverflow.Ellipsis
                )
            }

            if (post.imageUrl.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                AsyncImage(
                    model = post.imageUrl,
                    contentDescription = "Post image",
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.FillWidth
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                val likeColor by animateColorAsState(
                    if (isLiked) Color.Red else MaterialTheme.colorScheme.onSurfaceVariant,
                    label = "likeColor"
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onLike) {
                        Icon(
                            if (isLiked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                            contentDescription = "Like",
                            tint = likeColor,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Text(
                        text = post.likesCount.formatCount(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onComment) {
                        Icon(
                            Icons.Filled.ChatBubbleOutline,
                            contentDescription = "Comment",
                            modifier = Modifier.size(20.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Text(
                        text = post.commentsCount.formatCount(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                IconButton(onClick = onShare) {
                    Icon(
                        Icons.Filled.Share,
                        contentDescription = "Share",
                        modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
