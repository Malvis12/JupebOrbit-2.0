# 🚀 Gemini AI Powered PDF Question Upload - Quick Start

This guide explains how to use the `gemini-pdf-to-questions.js` script to automatically extract questions from PDF files using your Gemini API key and upload them directly to the JUPEB ORBIT question bank.

## 📋 **What This Script Does**

The `gemini-pdf-to-questions.js` script provides **end-to-end automation**:
1. 📄 **Reads your PDF file** (past exam papers, study guides, etc.)
2. 🤖 **Uses Gemini AI** to understand the document structure and extract questions
3. 🔧 **Converts questions** to the required JSON format for JUPEB ORBIT
4. ✅ **Validates** each question for correctness
5. 📤 **Uploads directly** to Firebase Firestore question bank
6. 📊 **Provides detailed reporting** on success/failure

## 🔧 **Setup Instructions**

### **1. Install Required Dependencies**
```bash
npm install @google/generative-ai firebase-admin
```

### **2. Prepare Your Credentials**

#### **Gemini API Key**
- Get your API key from: https://makersuite.google.com/app/apikey
- You can provide it in one of these ways:
  - **Environment variable** (recommended): `set GEMINI_API_KEY=your_key_here` (Windows) or `export GEMINI_API_KEY=your_key_here` (Mac/Linux)
  - **Command line argument**: Provide as third parameter when running the script

#### **Firebase Service Account**
- Download from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key
- Save as `firebase-service-account.json` in your project root (or provide path as argument)

### **3. Prepare Your PDF**
- Ensure your PDF contains educational questions (past exam papers work best)
- The script works best with text-based PDFs (not just image scans)
- For scanned PDFs, Gemini's OCR capabilities will still work but may be less accurate

## 🚀 **Usage Examples**

### **Basic Usage (Environment Variables)**
```bash
# Set your credentials once (per terminal session)
set GEMINI_API_KEY=your_gemini_api_key_here
set FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json

# Run the script
node gemini-pdf-to-questions.js path/to/your-questions.pdf
```

### **Usage with Command Line Arguments**
```bash
node gemini-pdf-to-questions.js path/to/your-questions.pdf ./firebase-service-account.json your_gemini_api_key_here
```

### **Usage with Custom Paths**
```bash
# Using environment variables for credentials
set GEMINI_API_KEY=your_gemini_api_key_here
set FIREBASE_SERVICE_ACCOUNT=./keys/my-firebase-key.json

node gemini-pdf-to-questions.js ./past-exams/june-2024-physics.pdf
```

## 📊 **What to Expect**

### **During Processing**
You'll see progress indicators showing:
- 📄 PDF loading status
- 🤖 Gemini API communication
- ✅ Question extraction count
- 🔍 Validation results
- 📤 Upload progress by batch
- 📊 Final summary

### **Sample Output**
```
🚀 Starting Gemini AI Powered PDF Question Extraction & Upload
======================================================================
📄 PDF File: ./past-exams/june-2024-physics.pdf
🔐 Firebase Service Account: ./firebase-service-account.json
🔑 Gemini API Key: AIza...bcd
======================================================================
🤖 Sending PDF to Gemini API for question extraction...
📥 Received response from Gemini (8452 characters)
✅ Successfully extracted 42 questions from PDF

🔍 Validating questions...
✅ Validation complete: 40 valid, 2 invalid

⚠️  Validation Errors (showing first 10):
   1. Missing or invalid questionText (string required)
   2. Missing or invalid options (array of exactly 4 strings required)
   ... and 0 more errors

✅ Proceeding with 40 valid questions (2 invalid questions skipped)

📋 Sample of questions to be uploaded (first 3):
   1. [physics/2024] A body starts from rest and accelerates uniformly at $2\\text{ m/s}^2$ for $10\\text{ s}$. Calculate the total distance covered....
   2. [physics/2024] Which of the following physical quantities has the same dimensions as work?....
   3. [mathematics/2024] Evaluate $\\lim_{x \\to 0} \\frac{\\sin 3x}{x}$....

📤 Starting upload to Firebase Firestore...
📦 Batch 1 completed: 40 successful, 0 failed

======================================================================
📊 Upload Summary:
   ✅ Successful: 40
   ❌ Failed: 0
   ⏱️  Duration: 12.34 seconds

🎉 Upload completed! Questions are now available in the JUPEB ORBIT app.
   Access path in Firebase: subjects/{{subject}}/years/{{year}}/questions
```

## ⚙️ **How It Works**

### **PDF Processing with Gemini**
The script sends your PDF to Gemini AI with a specialized prompt that instructs the AI to:
- Identify all questions in the document
- Extract question text, options, and correct answers
- Infer subject, topic, and year from context
- Generate explanations when available
- Format everything as valid JSON

### **Question Format Expected**
The script expects Gemini to return data matching this structure:
```json
[
  {
    "questionText": "Full question with $LaTeX$ math",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 1,
    "explanation": {
      "coreConcept": "Main concept",
      "steps": "Step-by-step solution",
      "pitfall": "Common mistake"
    },
    "syllabusTopic": "Topic name",
    "subject": "physics|mathematics|chemistry|biology",
    "year": "2025"
  }
]
```

### **Validation & Normalization**
After Gemini returns data, the script:
1. Validates each question has required fields
2. Normalizes option formatting (removes "A) " prefixes)
3. Ensures explanation is properly structured
4. Sets default values for missing optional fields
5. Skips invalid questions but reports what was skipped

## 🛠️ **Tips for Best Results**

### **PDF Quality**
- **Text-based PDFs** work best (selectable text)
- **Scanned PDFs** work but may have lower accuracy
- **Clear, high-resolution scans** improve OCR results
- **Well-formatted exams** with clear question/answer separation work best

### **Subject Identification**
Gemini infers subject from context. To help it:
- Ensure your PDF has clear subject indicators (chapter titles, headers)
- The script looks for keywords in the text to distinguish physics/math/chem/bio

### **Year Detection**
Gemini looks for:
- Exam dates in headers/footers
- Copyright dates
- Academic year references
- You can override by setting year in your PDF filename if needed

### **Explanation Quality**
- If your PDF contains solutions/explanations, Gemini will extract them
- If not, the explanation field may be omitted (which is OK - it's optional)
- You can always add explanations later via the admin interface if needed

## 🔒 **Security & Privacy**

### **API Keys**
- Your Gemini API key is used only for the API call to Google
- Never commit API keys to version control
- Consider using environment variables for better security

### **Firebase Access**
- Uses Firebase Admin SDK with service account for secure server-to-server communication
- Your service account key should be kept secure
- The script only has permission to write to the questions collection (based on your Firebase rules)

### **Data Processing**
- PDF content is sent to Google's Gemini API for processing
- Review Google's privacy policy for how they handle API data
- For sensitive materials, consider using on-premise OCR solutions instead

## 📝 **Troubleshooting**

### **"API key invalid" Error**
- Check your Gemini API key is correct and active
- Ensure you haven't accidentally copied extra spaces or characters
- Verify at https://makersuite.google.com/app/apikey

### **"PDF not found" Error**
- Double-check the file path
- Use relative paths (from current directory) or absolute paths
- Remember to use forward slashes `/` or escaped backslashes `\\` in paths

### **"No questions extracted" Error**
- Try a different PDF first (maybe one with simpler formatting)
- Check if your PDF is image-only (scanned) - Gemini OCR works but may need clearer text
- Consider preprocessing with Adobe Acrobat to improve text recognition

### **Validation Errors**
- Review the error messages to see what's missing
- Common issues: missing options, incorrect answer format
- You can still upload the valid questions that pass validation

### **Firebase Errors**
- Check your service account key is valid and not expired
- Ensure your Firebase project has Firestore enabled
- Verify network connectivity if getting timeout errors

## 📈 **Batch Processing Multiple PDFs**

To process multiple PDFs automatically, you could use a simple batch script:

```bash
# Windows batch file
for %%f in (*.pdf) do (
  echo Processing %%f
  node gemini-pdf-to-questions.js %%f
)

# Bash script
for f in *.pdf; do
  echo "Processing $f"
  node gemini-pdf-to-questions.js "$f"
done
```

## ❓ **Frequently Asked Questions**

**Q: Do I need to run this every time I want to upload questions?**
A: Yes, run it whenever you have new PDFs to process. Consider saving your credentials as environment variables to avoid re-entering them.

**Q: Can I edit questions after they're uploaded?**
A: Yes! Use the admin interface at `/admin/questions/upload` to view, edit, or delete questions.

**Q: What if Gemini makes mistakes in extraction?**
A: The script includes validation and will skip invalid questions. Always spot-check a few uploaded questions in the Practice/Exam modes to verify correctness.

**Q: Is there a limit to how many questions I can process at once?**
A: The script processes in batches of 500 (Firestore limit), so you can process large PDFs. For very large documents (>1000 questions), consider splitting the PDF first.

**Q: How much does using Gemini API cost?**
A: Gemini 1.5 Flash is very cost-effective. Check current pricing at https://cloud.google.com/vertex-ai/generative-ai/pricing
Typical costs for educational PDFs are fractions of a cent per document.

## 🎯 **Next Steps**

1. **Try a test run** with a small PDF or first few pages of a larger one
2. **Verify results** in the JUPEB ORBIT app (Practice/Exam modes)
3. **Process your full collection** of past papers
4. **Set up regular updates** as you get new materials
5. **Consider sharing** your automated workflow with colleagues teaching similar subjects

## 📞 **Need Help?**

If you encounter issues:
1. Check the error messages carefully - they often point to the specific problem
2. Verify your API keys and file paths
3. Try with a simple test PDF first
4. Re-read this guide for common solutions
5. Remember that the upload script (`upload-questions.js`) and admin interface are also available as alternatives

Happy question uploading! 🎉