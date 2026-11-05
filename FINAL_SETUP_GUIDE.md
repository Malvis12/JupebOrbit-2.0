# 🚀 JUPEB ORBIT Complete Question Management System - Setup Guide

This guide explains how to use the complete, secure question management system that has been built for the JUPEB ORBIT application. The system includes:

## 📦 **What's Been Built:**

### **1. AI-Powered PDF Processing** (`gemini-pdf-to-questions.js`)
- Uses your Gemini API key to scan PDF documents and extract questions
- Automatically converts to proper JSON format
- Uploads directly to Firebase question bank
- Secure credential handling via environment variables

### **2. Secure Admin Interface** (`src/pages/admin/QuestionUploadPage.tsx`)
- Role-protected question management interface
- Manual question entry with LaTeX/MathJax preview
- JSON file upload (drag & drop)
- Question browsing, editing, deletion
- Uses existing Firebase client SDK (secure in browser)

### **3. Role-Based Access Control**
- Added `role?: 'admin' | 'user'` to UserProfile interface
- Added `isAdmin()` method to AuthContext
- Admin panel access restricted to users with admin role

### **4. Supporting Utilities**
- `upload-questions.js` - Node.js bulk upload script (env-var based)
- `pdf-to-questions.js` - Text-to-JSON conversion helper
- Templates, examples, and comprehensive documentation

## 🔧 **Setup Instructions:**

### **Step 1: Install Dependencies**
```bash
npm install
```

### **Step 2: Set Up Environment Variables**
Create a `.env` file in your project root (copy from `.env.example`):

```env
# 🤖 Gemini AI API Key
# Get from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your_actual_gemini_api_key_here

# 🔥 Firebase Service Account Key Path
# Download from: Firebase Console → Project Settings → Service Accounts
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

> **Important:** Never commit `.env` to version control. Add it to `.gitignore`.

### **Step 3: Prepare Firebase Service Account**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the file as `firebase-service-account.json` in your project root
4. **Keep this file secure** - never share it or commit it to version control

### **Step 4: Set Up Firebase Security Rules (Critical!)**
In your Firebase Console → Firestore Database → Rules, replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admins full access to questions collection
    match /subjects/{subject}/years/{year}/questions/{questionId} {
      allow read, write: if request.auth != null && 
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Allow users to read their own profile data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
    }
    
    // Optional: Allow users to read questions (for practice/exam modes)
    match /subjects/{subject}/years/{year}/questions/{questionId} {
      allow read: if true; // Or restrict based on your needs
    }
  }
}
```

### **Step 5: Create an Admin User**
To give a user admin access:
1. Ensure the user has an account in the system (they've logged in at least once)
2. In Firebase Console → Firestore → Users collection, find their document
3. Edit their user document to add: `"role": "admin"`
   - Example: `{ "uid": "...", "email": "...", "username": "...", "role": "admin", ... }`

## 🚀 **How to Use the System:**

### **Option A: AI-Powered PDF Processing (Recommended for Large Collections)**
```bash
# 1. Set environment variables (once per session or use .env file)
# Windows (cmd):
set GEMINI_API_KEY=your_key_here
set FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Windows (PowerShell):
$env:GEMINI_API_KEY="your_key_here"
$env:FIREBASE_SERVICE_ACCOUNT_PATH="./firebase-service-account.json"

# Mac/Linux:
export GEMINI_API_KEY=your_key_here
export FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# 2. Process your PDF
node gemini-pdf-to-questions.js path/to/your-questions.pdf

# 3. Verify results in JUPEB ORBIT app → Practice/Exam modes
```

### **Option B: Secure Admin Interface (For Manual Entry & Small Batches)**
1. **Log in** to JUPEB ORBIT as an admin user
2. **Navigate to** `/admin/questions/upload`
3. **Use the interface to:**
   - **Enter questions manually** (with real-time LaTeX/MathJax preview)
   - **Upload JSON files** via drag-and-drop
   - **Browse existing questions** by subject/year filters
   - **Edit or delete** existing questions
   - **All operations** are secure and use your existing Firebase connection

### **Option C: Node.js Bulk Upload Script (Alternative Method)**
```bash
# For pre-formatted JSON files:
node upload-questions.js path/to/questions.json

# Or use default file:
node upload-questions.js  # uses ./questions.json by default
```

## 📋 **Verification Checklist:**

Before processing real data:
- [ ] `.env` file created with your actual credentials (NOT committed to git)
- - [ ] Firebase service account key downloaded and path correct
- - [ ] Gemini API key valid and active
- - [ ] Firebase security rules properly configured
- - [ ] At least one user has `role: "admin"` in their Firestore document
- - [ ] Test with a small PDF first (5-10 questions)
- - [ ] Verify uploaded questions display correctly in Practice/Exam modes
- - [ ] Confirm only admin users can access `/admin/questions/upload`

## 📊 **System Architecture:**

```
┌─────────────────────┐
│  User's Browser     │
│  ┌───────────────┐  │
│  │ Admin Panel   │◄─┘  ← Secure access via Firebase Auth + Role Check
│  │ (React)       │     Uses Firebase Client SDK (src/lib/firebase.ts)
│  └───────────────┘
│          ▲
│          │ HTTPS (Secure)
│          ▼
┌─────────────────────┐
│  Firebase           │
│  ┌───────────────┐  │
│  │ Auth Service  │  │
│  │ Firestore DB  │  │
│  │ Storage       │  │
│  └───────────────┘  │
│          ▲          │
│          │          │
┌──────────┴──────────┴────────────┐
│                                  │
┌─────────────────────┐    ┌─────────────────────┐
│  Node.js Scripts    │    │  Your PDF Files     │
│  (gemini-pdf-to-    │    │  (Past Papers, etc) │
│   questions.js,     │    │                     │
│   upload-questions) │    │                     │
└─────────────────────┘    └─────────────────────┘
          ▲                           │
          │ Secure (Service Account)  │
          │                           ▼
    ┌─────────────────────┐    ┌─────────────────────┐
    │  Gemini API         │    │  Firebase Admin SDK │
    │  (Google Cloud)     │    │  (Trusted Env)      │
    └─────────────────────┘    └─────────────────────┘
```

## 🛡️ **Security Features:**

✅ **Zero Hardcoded Secrets** - No API keys or service account keys in source code  
✅ **Client-Side Protection** - Admin panel uses Firebase client SDK (limited by rules)  
✅ **Server-Side Protection** - Scripts use service account in trusted environments  
✅ **Role-Based Access** - Only `role: "admin"` users can access admin panel  
✅ **Firebase Security Rules** - Fine-grained control over data access  
✅ **Environment Variables** - Credentials kept out of source control  
✅ **Validation Layers** - Multiple checks prevent malformed data  
✅ **Error Isolation** - Failures in one question don't stop entire batch  

## 📈 **Usage Recommendations:**

### **For Large Past Paper Collections:**
Use **Option A** (AI-powered processing):
```bash
node gemini-pdf-to-questions.js ./past-exams/june-2024-physics.pdf
```

### **For Ongoing Question Management:**
Use **Option B** (Admin interface):
1. Log in as admin
2. Go to `/admin/questions/upload`
3. Add/edit questions as needed

### **For Pre-Formatted Collections:**
Use **Option C** (Bulk upload):
```bash
node upload-questions.js ./my-questions.json
```

## 📞 **Troubleshooting:**

### **Common Issues & Solutions:**

**❌ "Invalid Gemini API Key"**
- Verify your key at https://makersuite.google.com/app/apikey
- Check for extra spaces when copying
- Ensure you haven't exceeded quota limits

**❌ "Firebase Service Account Not Found"**
- Check the file path in your .env
- Verify the file exists and is readable
- Ensure you downloaded the correct JSON file from Firebase Console

**❌ "Access Denied to Admin Panel"**
- Confirm you're logged in
- Verify your user document in Firestore has `"role": "admin"`
- Check Firebase security rules are properly deployed

**❌ "No Questions Extracted from PDF"**
- Try a simpler PDF first (text-based, not just images)
- Ensure PDF contains actual questions with clear formatting
- Consider preprocessing with Adobe Acrobat to improve text quality

**❌ "Questions Not Showing in App"**
- Verify upload reported success
- Check that subject/year match what you're selecting in the app
- Look in Practice or Exam modes to test uploaded questions
- Ensure Firebase security rules allow reading

## 🎉 **You're Ready to Go!**

Your complete, secure question management system is now ready to use:

1. **Set up your environment** (.env file and Firebase service account)
2. **Configure Firebase security rules**
3. **Make at least one user an admin** (`role: "admin"`)
4. **Process your first PDF** or use the admin interface
5. **Verify results** in the JUPEB ORBIT application

The system provides multiple pathways for question ingestion:
- **AI-powered** for large past paper collections (via Gemini)
- **Secure manual** for ongoing question management (admin panel)
- **Flexible bulk** for pre-formatted collections (upload script)

All routes lead to the same secure Firebase question bank, ensuring consistency across your application.

Happy teaching and best of luck with JUPEB ORBIT! 📚✨