package com.deen.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deen.app.data.model.User
import com.deen.app.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val isLoading: Boolean = false,
    val isLoggedIn: Boolean = false,
    val error: String? = null,
    val user: User? = null,
    val resetEmailSent: Boolean = false
)

class AuthViewModel : ViewModel() {
    private val authRepository = AuthRepository()

    private val _uiState = MutableStateFlow(AuthUiState(isLoggedIn = authRepository.isLoggedIn))
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.authStateFlow().collect { user ->
                _uiState.value = _uiState.value.copy(isLoggedIn = user != null)
            }
        }
    }

    fun signIn(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Please fill in all fields")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = authRepository.signIn(email, password)
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isLoggedIn = result.isSuccess,
                error = result.exceptionOrNull()?.message
            )
        }
    }

    fun signUp(email: String, password: String, displayName: String) {
        if (email.isBlank() || password.isBlank() || displayName.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Please fill in all fields")
            return
        }
        if (password.length < 6) {
            _uiState.value = _uiState.value.copy(error = "Password must be at least 6 characters")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = authRepository.signUp(email, password, displayName)
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isLoggedIn = result.isSuccess,
                error = result.exceptionOrNull()?.message
            )
        }
    }

    fun signInWithGoogle(idToken: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = authRepository.signInWithGoogle(idToken)
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                isLoggedIn = result.isSuccess,
                error = result.exceptionOrNull()?.message
            )
        }
    }

    fun signOut() {
        viewModelScope.launch {
            authRepository.signOut()
            _uiState.value = AuthUiState(isLoggedIn = false)
        }
    }

    fun resetPassword(email: String) {
        if (email.isBlank()) {
            _uiState.value = _uiState.value.copy(error = "Please enter your email")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            val result = authRepository.resetPassword(email)
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                resetEmailSent = result.isSuccess,
                error = result.exceptionOrNull()?.message
            )
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    fun setError(message: String) {
        _uiState.value = _uiState.value.copy(error = message)
    }
}
