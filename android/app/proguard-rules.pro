# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Google Sign-In
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }

# Data models (Firestore deserialization)
-keep class com.deen.app.data.model.** { *; }
-keepclassmembers class com.deen.app.data.model.** { *; }

# Kotlin
-dontwarn kotlinx.coroutines.**
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlin.**

# Coil image loading
-dontwarn coil.**
-keep class coil.** { *; }

# OkHttp / Okio
-dontwarn okhttp3.**
-dontwarn okio.**

# Keep Compose classes
-dontwarn androidx.compose.**

# Keep enum classes
-keepclassmembers enum * { *; }

# Keep Parcelable
-keep class * implements android.os.Parcelable { *; }

# Keep Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
