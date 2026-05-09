# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Data models
-keep class com.deen.app.data.model.** { *; }
-keepclassmembers class com.deen.app.data.model.** { *; }

# Kotlin coroutines
-dontwarn kotlinx.coroutines.**

# Coil
-dontwarn coil.**
