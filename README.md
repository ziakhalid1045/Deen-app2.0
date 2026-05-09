# Deen App 2.0

A modern Islamic social media platform built with Kotlin and Jetpack Compose.

## Features

- **Home Feed** — Facebook-like posts with likes, comments, shares, infinite scroll
- **Short Videos** — TikTok-style vertical swipe feed with action buttons
- **Chat System** — WhatsApp-like 1-to-1 and group messaging with real-time updates
- **User Profile** — Profile page, edit profile, followers/following, user posts
- **Notifications** — Real-time alerts for likes, comments, follows, messages
- **Search** — Search users and posts with debounced queries

## Technical Stack

- **Language:** Kotlin
- **UI:** Jetpack Compose + Material 3
- **Architecture:** MVVM with Repository pattern
- **Backend:** Firebase (Auth, Firestore, Storage, Cloud Messaging)
- **Design:** Islamic-themed green/gold color palette with full dark/light mode
- **Min SDK:** 26 (Android 8.0+)

## Setup

1. Clone this repository
2. Open the `android/` folder in Android Studio
3. Replace `android/app/google-services.json` with your Firebase project config from the [Firebase Console](https://console.firebase.google.com/)
4. Build and run the app

## Firestore Security Rules

The app's data operations are fully aligned with the security rules defined in `firestore.rules`:

- Subcollection-based likes, follows, and notifications
- Server-side timestamps for all `createdAt` fields
- Strict field-name allowlists for user and post updates
