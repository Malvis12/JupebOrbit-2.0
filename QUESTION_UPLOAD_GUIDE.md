# JUPEB ORBIT Question Upload Guide

This document explains how to use the question upload functionality that has been added to the JUPEB ORBIT application.

## Overview

Two methods are available for uploading questions:
1. **Node.js Bulk Upload Script** - For efficiently uploading large collections of past questions
2. **Admin Interface** - For manual entry and smaller batch uploads through the web interface

## Method 1: Node.js Bulk Upload Script (Recommended for Large Collections)

### Prerequisites
1. Node.js installed (v16+ recommended)
2. Firebase service account key (download from Firebase Console)
3. Questions in JSON format (see template below)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Download your Firebase service account key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the file as `firebase-service-account.json` in the project root

3. Prepare your questions file:
   - Use the provided template: `questions-template.json`
   - Or create your own JSON file following the format below

### Question Format
Each question should follow this structure:
```json
{
  "questionText": "Your question here (use $...$ for LaTeX math)",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswerIndex": 0,
  "explanation": {
    "coreConcept": "Main concept being tested",
    "steps": "Step-by-step solution explanation",
    "pitfall": "Common mistakes to avoid"
  },
  "syllabusTopic": "Topic from syllabus (e.g., Kinematics & Motion)",
  "subject": "physics|mathematics|chemistry|biology",
  "year": "2025|2024|2023|2022"
}
```

### Usage
Run the upload script:
```bash
# Default (uses questions.json in current directory)
node upload-questions.js

# Specify a different file
node upload-questions.js ./path/to/your-questions.json
```

### Example
```bash
node upload-questions.js ./questions-template.json
```

The script will:
1. Validate all questions for correct format
2. Normalize data (strip option prefixes, etc.)
3. Upload to Firebase Firestore under: `subjects/{subject}/years/{year}/questions`
4. Provide detailed progress reporting
5. Handle errors gracefully

### Notes
- The script uses Firebase Admin SDK for secure server-to-server communication
- Questions are uploaded in batches of 500 for efficiency
- Existing questions with matching IDs will be overwritten
- New questions will get auto-generated Firebase document IDs

## Method 2: Admin Interface (Web-Based)

### Accessing the Admin Panel
1. Log in to the JUPEB ORBIT application
2. Navigate to: `/admin/questions/upload`
   - Or click any admin links if available in the UI
3. Only users with `role: "admin"` can access this page

### Features
#### Individual Question Entry
- Fill out the form to add/edit questions
- Real-time preview of LaTeX/MathJax rendering
- Save questions directly to Firebase

#### Bulk Upload via Interface
- Click the upload area or drag & drop a JSON file
- Supports both array format `[{...}, {...}]` and object format `{ "questions": [{...}, {...}] }`
- Progress tracking during upload
- Validation feedback before upload

#### Question Management
- View all questions in the system
- Filter by subject and year
- Edit existing questions inline
- Delete questions (with confirmation)

### Security
- Access restricted to users with admin role (`role: "admin"` in their user profile)
- All data validation performed client-side and server-side
- Firebase security rules should restrict question writes to authenticated users

## Setting Up Admin Users

To grant a user admin access:
1. Ensure the user has an account in the system
2. Add/update their user profile in Firestore to include: `"role": "admin"`
   - This can be done through Firebase Console or by running a script
   - Example update: `{ "role": "admin" }`

## Troubleshooting

### Common Issues

**Authentication Errors**
- Make sure you're logged in as an admin user
- Check that your user profile has `"role": "admin"`

**Firebase Errors**
- Verify your service account key is valid and not expired
- Ensure your Firebase project has Firestore enabled in test mode or with appropriate rules

**Validation Errors**
- Check that all required fields are present
- Ensure options array has exactly 4 elements
- Confirm correctAnswerIndex is between 0-3
- Verify subject and year values are valid

**Large Upload Failures**
- Try reducing batch size in the script if encountering timeouts
- Check network connectivity and Firebase quota limits

## File Structure Summary

### New Files Created
- `src/lib/admin.ts` - Admin role checking utilities
- `src/pages/admin/QuestionUploadPage.tsx` - Admin upload interface
- `scripts/upload-questions.js` - Node.js bulk upload script
- `questions-template.json` - Example question format
- `QUESTION_UPLOAD_GUIDE.md` - This documentation

### Modified Files
- `src/types/index.ts` - Added role field to UserProfile interface
- `src/contexts/AuthContext.tsx` - Added admin role checking
- `src/App.tsx` - Added admin route

## Next Steps

1. **Test with sample data**: Start by uploading the questions-template.json to verify everything works
2. **Prepare your data**: Convert your past questions to the expected JSON format
3. **Upload in batches**: For very large collections, consider splitting into smaller files
4. **Verify in-app**: Check that uploaded questions appear correctly in Practice and Exam modes
5. **Set up regular admins**: Grant appropriate team members admin access as needed

## Support

For issues or questions, refer to:
- Firebase documentation: https://firebase.google.com/docs
- React/Vite documentation for frontend questions
- The existing JUPEB ORBIT codebase for patterns and conventions