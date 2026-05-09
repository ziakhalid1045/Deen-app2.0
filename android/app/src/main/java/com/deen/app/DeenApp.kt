package com.deen.app

import android.app.Application
import com.google.firebase.FirebaseApp

class DeenApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
    }
}
