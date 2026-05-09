package com.deen.app.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
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
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.deen.app.data.model.Message
import com.deen.app.ui.components.ProfileImage
import com.deen.app.util.toChatTime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    chatId: String,
    viewModel: ChatViewModel,
    onNavigateBack: () -> Unit
) {
    val chatDetailState by viewModel.chatDetailState.collectAsState()
    var messageText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(chatId) {
        viewModel.loadMessages(chatId)
    }

    LaunchedEffect(chatDetailState.messages.size) {
        if (chatDetailState.messages.isNotEmpty()) {
            listState.animateScrollToItem(chatDetailState.messages.size - 1)
        }
    }

    val chat = chatDetailState.chat
    val otherUserId = chat?.participants?.firstOrNull { it != viewModel.currentUserId } ?: ""
    val displayName = if (chat?.isGroup == true) chat.groupName
        else chat?.participantNames?.get(otherUserId) ?: "Chat"
    val displayImage = if (chat?.isGroup == true) chat.groupImageUrl
        else chat?.participantImages?.get(otherUserId) ?: ""

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        ProfileImage(imageUrl = displayImage, size = 36.dp)
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = displayName,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = if (chat?.isGroup == true) "${chat.participants.size} members" else "Online",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { }) {
                    Icon(
                        Icons.Filled.AttachFile,
                        contentDescription = "Attach",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                OutlinedTextField(
                    value = messageText,
                    onValueChange = { messageText = it },
                    placeholder = { Text("Type a message...") },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(24.dp),
                    singleLine = false,
                    maxLines = 4,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary
                    )
                )
                Spacer(modifier = Modifier.width(4.dp))
                IconButton(
                    onClick = {
                        if (messageText.isNotBlank()) {
                            viewModel.sendMessage(chatId, messageText)
                            messageText = ""
                        }
                    }
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Send",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 8.dp),
            state = listState,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            items(chatDetailState.messages, key = { it.id }) { message ->
                MessageBubble(
                    message = message,
                    isCurrentUser = message.senderId == viewModel.currentUserId
                )
            }
        }
    }
}

@Composable
fun MessageBubble(
    message: Message,
    isCurrentUser: Boolean
) {
    val screenWidth = LocalConfiguration.current.screenWidthDp.dp

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        contentAlignment = if (isCurrentUser) Alignment.CenterEnd else Alignment.CenterStart
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = screenWidth * 0.75f)
                .clip(
                    RoundedCornerShape(
                        topStart = 16.dp,
                        topEnd = 16.dp,
                        bottomStart = if (isCurrentUser) 16.dp else 4.dp,
                        bottomEnd = if (isCurrentUser) 4.dp else 16.dp
                    )
                )
                .background(
                    if (isCurrentUser) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.surfaceVariant
                )
                .padding(horizontal = 12.dp, vertical = 8.dp)
        ) {
            if (!isCurrentUser && message.senderName.isNotBlank()) {
                Text(
                    text = message.senderName,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            Text(
                text = message.content,
                style = MaterialTheme.typography.bodyMedium,
                color = if (isCurrentUser) MaterialTheme.colorScheme.onPrimary
                    else MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = message.createdAt.toChatTime(),
                style = MaterialTheme.typography.labelSmall,
                color = if (isCurrentUser) MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.7f)
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.End)
            )
        }
    }
}
