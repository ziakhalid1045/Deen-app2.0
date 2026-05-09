package com.deen.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.deen.app.navigation.Screen
import com.deen.app.navigation.bottomNavItems
import com.deen.app.ui.auth.AuthViewModel
import com.deen.app.ui.auth.ForgotPasswordScreen
import com.deen.app.ui.auth.LoginScreen
import com.deen.app.ui.auth.RegisterScreen
import com.deen.app.ui.chat.ChatListScreen
import com.deen.app.ui.chat.ChatScreen
import com.deen.app.ui.chat.ChatViewModel
import com.deen.app.ui.home.CommentsScreen
import com.deen.app.ui.home.CreatePostScreen
import com.deen.app.ui.home.HomeFeedScreen
import com.deen.app.ui.home.HomeFeedViewModel
import com.deen.app.ui.notifications.NotificationsScreen
import com.deen.app.ui.notifications.NotificationsViewModel
import com.deen.app.ui.profile.EditProfileScreen
import com.deen.app.ui.profile.ProfileScreen
import com.deen.app.ui.profile.ProfileViewModel
import com.deen.app.ui.search.SearchScreen
import com.deen.app.ui.search.SearchViewModel
import com.deen.app.ui.theme.DeenAppTheme
import com.deen.app.ui.videos.ShortVideosScreen
import com.deen.app.ui.videos.VideosViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DeenAppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    DeenAppContent()
                }
            }
        }
    }
}

@Composable
fun DeenAppContent() {
    val authViewModel: AuthViewModel = viewModel()
    val authState by authViewModel.uiState.collectAsState()

    if (authState.isLoggedIn) {
        MainAppContent(authViewModel = authViewModel)
    } else {
        AuthContent(authViewModel = authViewModel)
    }
}

@Composable
fun MainAppContent(authViewModel: AuthViewModel) {
    val navController = rememberNavController()

    val homeFeedViewModel: HomeFeedViewModel = viewModel()
    val videosViewModel: VideosViewModel = viewModel()
    val chatViewModel: ChatViewModel = viewModel()
    val notificationsViewModel: NotificationsViewModel = viewModel()
    val profileViewModel: ProfileViewModel = viewModel()
    val searchViewModel: SearchViewModel = viewModel()

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val showBottomBar = currentRoute in bottomNavItems.map { it.route }

    Scaffold(
        bottomBar = {
            AnimatedVisibility(
                visible = showBottomBar,
                enter = slideInVertically(initialOffsetY = { it }),
                exit = slideOutVertically(targetOffsetY = { it })
            ) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 2.dp
                ) {
                    bottomNavItems.forEach { item ->
                        val isSelected = currentRoute == item.route
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                                    contentDescription = item.label
                                )
                            },
                            label = { Text(item.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) {
                HomeFeedScreen(
                    viewModel = homeFeedViewModel,
                    onCreatePost = { navController.navigate(Screen.CreatePost.route) },
                    onSearch = { navController.navigate(Screen.Search.route) },
                    onCommentClick = { postId ->
                        navController.navigate(Screen.Comments.createRoute(postId))
                    },
                    onProfileClick = { userId ->
                        navController.navigate(Screen.UserProfile.createRoute(userId))
                    }
                )
            }

            composable(Screen.Videos.route) {
                ShortVideosScreen(
                    viewModel = videosViewModel,
                    onProfileClick = { userId ->
                        navController.navigate(Screen.UserProfile.createRoute(userId))
                    }
                )
            }

            composable(Screen.Chat.route) {
                ChatListScreen(
                    viewModel = chatViewModel,
                    onChatClick = { chatId ->
                        navController.navigate(Screen.ChatDetail.createRoute(chatId))
                    },
                    onCreateGroup = {
                        navController.navigate(Screen.CreateGroupChat.route)
                    },
                    onSearch = { navController.navigate(Screen.Search.route) }
                )
            }

            composable(Screen.Notifications.route) {
                NotificationsScreen(
                    viewModel = notificationsViewModel,
                    onProfileClick = { userId ->
                        navController.navigate(Screen.UserProfile.createRoute(userId))
                    }
                )
            }

            composable(Screen.Profile.route) {
                ProfileScreen(
                    userId = null,
                    profileViewModel = profileViewModel,
                    homeFeedViewModel = homeFeedViewModel,
                    onEditProfile = { navController.navigate(Screen.EditProfile.route) },
                    onSignOut = {
                        authViewModel.signOut()
                    },
                    onNavigateBack = null,
                    onCommentClick = { postId ->
                        navController.navigate(Screen.Comments.createRoute(postId))
                    },
                    onProfileClick = { userId ->
                        navController.navigate(Screen.UserProfile.createRoute(userId))
                    }
                )
            }

            composable(Screen.CreatePost.route) {
                CreatePostScreen(
                    viewModel = homeFeedViewModel,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable(Screen.Search.route) {
                SearchScreen(
                    viewModel = searchViewModel,
                    onNavigateBack = { navController.popBackStack() },
                    onProfileClick = { userId ->
                        navController.navigate(Screen.UserProfile.createRoute(userId))
                    }
                )
            }

            composable(Screen.EditProfile.route) {
                EditProfileScreen(
                    viewModel = profileViewModel,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable("chat_detail/{chatId}") { backStackEntry ->
                val chatId = backStackEntry.arguments?.getString("chatId") ?: return@composable
                ChatScreen(
                    chatId = chatId,
                    viewModel = chatViewModel,
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable("user_profile/{userId}") { backStackEntry ->
                val userId = backStackEntry.arguments?.getString("userId") ?: return@composable
                val userProfileViewModel: ProfileViewModel = viewModel(
                    key = "profile_$userId"
                )
                ProfileScreen(
                    userId = userId,
                    profileViewModel = userProfileViewModel,
                    homeFeedViewModel = homeFeedViewModel,
                    onEditProfile = { },
                    onSignOut = { },
                    onNavigateBack = { navController.popBackStack() },
                    onCommentClick = { postId ->
                        navController.navigate(Screen.Comments.createRoute(postId))
                    },
                    onProfileClick = { uid ->
                        navController.navigate(Screen.UserProfile.createRoute(uid))
                    },
                    onMessageUser = { uid ->
                        chatViewModel.createChat(uid) { chatId ->
                            navController.navigate(Screen.ChatDetail.createRoute(chatId))
                        }
                    }
                )
            }

            composable("comments/{postId}") { backStackEntry ->
                val postId = backStackEntry.arguments?.getString("postId") ?: return@composable
                CommentsScreen(
                    postId = postId,
                    viewModel = homeFeedViewModel,
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}

@Composable
fun AuthContent(authViewModel: AuthViewModel) {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.Login.route
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                viewModel = authViewModel,
                onNavigateToRegister = {
                    navController.navigate(Screen.Register.route)
                },
                onNavigateToForgotPassword = {
                    navController.navigate(Screen.ForgotPassword.route)
                }
            )
        }
        composable(Screen.Register.route) {
            RegisterScreen(
                viewModel = authViewModel,
                onNavigateToLogin = {
                    navController.popBackStack()
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        composable(Screen.ForgotPassword.route) {
            ForgotPasswordScreen(
                viewModel = authViewModel,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}
