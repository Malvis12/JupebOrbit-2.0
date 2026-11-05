import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

/**
 * Standardized Auth Guard for JUPEB Orbit.
 * Handles redirection, session persistence, and global navbar data syncing.
 */
export function initAuthGuard(options = { requiresAuth: true, checkOnboarding: true }) {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                if (options.requiresAuth) window.location.href = "auth.html";
                resolve(null);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                
                if (!userDoc.exists()) {
                    // Critical fallback: User exists in Auth but no Firestore record
                    if (window.location.pathname.indexOf("onboarding.html") === -1) {
                        window.location.href = "onboarding.html";
                    }
                    resolve(user);
                    return;
                }

                const userData = userDoc.data();

                // Check onboarding status
                if (options.checkOnboarding && !userData.onboardingComplete) {
                    if (window.location.pathname.indexOf("onboarding.html") === -1) {
                        window.location.href = "onboarding.html";
                    }
                }

                // Setup global navbar sync if elements exist
                setupNavbarSync(user.uid);
                
                resolve({ user, userData });

            } catch (e) {
                console.error("Auth Guard Error:", e);
                resolve({ user });
            }
        });
    });
}

function setupNavbarSync(uid) {
    const nameEl = document.getElementById('nav-user-name');
    if (!nameEl) return; // Not on a page with a navbar

    onSnapshot(doc(db, "users", uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const avatarEl = document.getElementById('nav-user-avatar');
            const taglineEl = document.getElementById('nav-user-tagline');
            const streakEl = document.getElementById('streak-display');

            if (nameEl) nameEl.innerText = data.username || "Student";
            if (taglineEl) taglineEl.innerText = data.tagline || "Candidate";
            if (streakEl) streakEl.innerText = `${data.dailyStreak || 0} Day Streak`;
            if (avatarEl) avatarEl.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username || uid}`;
        }
    });
}

window.toggleDropdown = function() {
    const drop = document.getElementById('profile-dropdown');
    if (drop) drop.classList.toggle('hidden');
}
