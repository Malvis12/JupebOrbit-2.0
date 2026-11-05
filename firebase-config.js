import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// Firebase Configuration - try to get from environment variables first, then fall back to global config
const getFirebaseConfig = () => {
    // Try to get from import.meta.env (when processed by Vite)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID
        };
    }

    // Fall back to global config (set by HTML or JS)
    if (window.FIREBASE_CONFIG) {
        return window.FIREBASE_CONFIG;
    }

    // Return empty object - will cause Firebase to throw an error, which is better than hardcoded keys
    console.warn('Firebase configuration not found. Please set window.FIREBASE_CONFIG or ensure env vars are available.');
    return {};
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase only if we have a config
let app, auth, db;
if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    console.error('Firebase initialization failed: missing configuration');
}

// Export what we have (may be undefined)
export { app, auth, db };
// Export the config getter for debugging if needed
export { getFirebaseConfig };
