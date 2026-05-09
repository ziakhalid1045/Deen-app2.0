package com.deen.app.util

import com.google.firebase.Timestamp
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

fun Timestamp?.toRelativeTime(): String {
    if (this == null) return ""
    val millis = this.toDate().time
    val now = System.currentTimeMillis()
    val diff = now - millis

    return when {
        diff < TimeUnit.MINUTES.toMillis(1) -> "Just now"
        diff < TimeUnit.HOURS.toMillis(1) -> {
            val mins = TimeUnit.MILLISECONDS.toMinutes(diff)
            "$mins${if (mins == 1L) " min" else " mins"} ago"
        }
        diff < TimeUnit.DAYS.toMillis(1) -> {
            val hours = TimeUnit.MILLISECONDS.toHours(diff)
            "$hours${if (hours == 1L) " hour" else " hours"} ago"
        }
        diff < TimeUnit.DAYS.toMillis(7) -> {
            val days = TimeUnit.MILLISECONDS.toDays(diff)
            "$days${if (days == 1L) " day" else " days"} ago"
        }
        else -> {
            SimpleDateFormat("MMM dd, yyyy", Locale.getDefault()).format(Date(millis))
        }
    }
}

fun Timestamp?.toChatTime(): String {
    if (this == null) return ""
    return SimpleDateFormat("hh:mm a", Locale.getDefault()).format(this.toDate())
}

fun Int.formatCount(): String {
    return when {
        this >= 1_000_000 -> String.format("%.1fM", this / 1_000_000.0)
        this >= 1_000 -> String.format("%.1fK", this / 1_000.0)
        else -> this.toString()
    }
}
