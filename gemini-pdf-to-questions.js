/**
 * Gemini AI Powered PDF Question Extractor for JUPEB ORBIT
 *
 * This script uses Google's Gemini API to extract questions from PDF files
 * and uploads them directly to the JUPEB ORBIT question bank in Firebase.
 *
 * Prerequisites:
 * 1. Node.js installed
 * 2. @google/generative-ai package installed (npm install @google/generative-ai)
 * 3. Gemini API key (get from https://makersuite.google.com/app/apikey)
 * 4. Firebase service account key (download from Firebase Console)
 *
 * Usage:
 *   Set environment variables:
 *     GEMINI_API_KEY=your_gemini_api_key_here
 *     FIREBASE_SERVICE_ACCOUNT=path/to/firebase-service-account.json
 *   Then run:
 *     node gemini-pdf-to-questions.js path/to/questions.pdf
 *
 *   Or specify paths as arguments:
 *     node gemini-pdf-to-questions.js path/to/questions.pdf path/to/service-account.json
 *
 * The script will:
 * 1. Extract text from PDF using Gemini's document understanding
 * 2. Structure questions into the required JSON format
 * 3. Validate each question
 * 4. Upload to Firebase Firestore under subjects/{subject}/years/{year}/questions
 * 5. Provide detailed progress reporting
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, WriteBatch } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

// Configuration from environment or arguments
let GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT || "./firebase-service-account.json";

// Override with command line arguments if provided
const args = process.argv.slice(2);
if (args.length >= 1) {
  // First arg is PDF file
  const pdfFilePath = args[0];

  // Second arg could be service account path or we use env/default
  if (args.length >= 2) {
    FIREBASE_SERVICE_ACCOUNT_PATH = args[1];
  }

  // Third arg could be Gemini API key
  if (args.length >= 3) {
    GEMINI_API_KEY = args[2];
  }
}

// Validate inputs
if (!GEMINI_API_KEY) {
  console.error("❌ Gemini API key not provided. Set GEMINI_API_KEY environment variable or provide as third argument.");
  process.exit(1);
}

if (!fs.existsSync(FIREBASE_SERVICE_ACCOUNT_PATH)) {
  console.error(`❌ Firebase service account file not found: ${FIREBASE_SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}

// Initialize Firebase Admin SDK
let db;
try {
  const serviceAccount = require(FIREBASE_SERVICE_ACCOUNT_PATH);
  initializeApp({
    credential: cert(serviceAccount)
  });
  db = getFirestore();
  console.log("✅ Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin SDK:", error.message);
  process.exit(1);
}

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" }); // Using gemini-3.8-flash for speed, cost efficiency, and native PDF understanding

// Prompt for Gemini to extract questions in structured format
const QUESTION_EXTRACTION_PROMPT = `
You are an expert at extracting educational questions from PDF documents.
Extract ALL questions from the provided PDF and format them as a JSON array.

For each question, extract:
- questionText: The full question text (include any mathematical notation using LaTeX format wrapped in $...$)
- options: An array of exactly 4 strings [optionA, optionB, optionC, optionD]
- correctAnswerIndex: Integer 0-3 indicating the correct option (A=0, B=1, C=2, D=3)
- explanation: Optional object with:
  - coreConcept: The main concept being tested (string)
  - steps: Step-by-step solution explanation (string)
  - pitfall: Common mistakes to avoid (string)
- syllabusTopic: The topic from the syllabus/curriculum (string)
- subject: One of "physics", "mathematics", "chemistry", "biology" (string)
- year: The year of the exam/paper (string like "2025", "2024", etc.)

Important formatting rules:
1. For mathematical expressions, use LaTeX format wrapped in single dollar signs: $...$
   Examples: $F = ma$, $\\frac{1}{2}$, $\\sqrt{2}$, $E = mc^2$
2. If explanation information is not available in the PDF, you can omit the explanation object entirely
3. For subject, infer from context:
   - Physics: mechanics, electricity, magnetism, optics, thermodynamics, etc.
   - Mathematics: algebra, calculus, geometry, trigonometry, statistics, etc.
   - Chemistry: organic, inorganic, physical chemistry, stoichiometry, etc.
   - Biology: cell biology, genetics, ecology, human physiology, etc.
4. For year, look for exam dates, academic years, or copyright dates in the PDF
5. For syllabusTopic, look for chapter titles, section headers, or topic labels
6. Return ONLY a valid JSON array - no additional text before or after
7. If you cannot determine a field with confidence, use reasonable defaults:
   - subject: "physics"
   - year: "2025"
   - syllabusTopic: "General Topic"
   - explanation: omit if uncertain

Example output format:
[
  {
    "questionText": "A body starts from rest and accelerates uniformly at $2\\text{ m/s}^2$ for $10\\text{ s}$. Calculate the total distance covered.",
    "options": ["$50\\text{ m}$", "$100\\text{ m}$", "$150\\text{ m}$", "$200\\text{ m}$"],
    "correctAnswerIndex": 1,
    "explanation": {
      "coreConcept": "Equations of Linear Motion",
      "steps": "Using $s = ut + \\frac{1}{2}at^2$ with $u=0$, $a=2\\text{ m/s}^2$, $t=10\\text{ s}$:\n$s = 0 + \\frac{1}{2}(2)(10)^2 = 100\\text{ m}$.",
      "pitfall": "Forgetting that starting from rest implies initial velocity $u = 0$."
    },
    "syllabusTopic": "Kinematics & Motion",
    "subject": "physics",
    "year": "2025"
  }
]

Now, process the provided PDF and extract all questions in this exact format.
`

async function extractQuestionsFromPDF(pdfPath) {
  console.log(`📄 Loading PDF: ${pdfPath}`);

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  // Read PDF file
  const pdfData = fs.readFileSync(pdfPath);

  console.log(`🤖 Sending PDF to Gemini API for question extraction...`);

  try {
    // Create file part for Gemini
    const pdfPart = {
      inlineData: {
        data: pdfData.toString("base64"),
        mimeType: "application/pdf"
      }
    };

    // Generate content with PDF and prompt
    const result = await model.generateContent([
      QUESTION_EXTRACTION_PROMPT,
      pdfPart
    ]);

    const response = await result.response;
    const responseText = response.text();

    console.log(`📥 Received response from Gemini (${responseText.length} characters)`);

    // Try to parse JSON from response
    // Gemini might wrap JSON in markdown or add extra text, so we need to extract it
    let jsonText = responseText.trim();

    // Try to find JSON array in the response
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      // If no array found, try to extract object and wrap in array
      const objectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonText = `[${objectMatch[0]}]`;
      }
    }

    // Parse JSON
    let questions = JSON.parse(jsonText);

    // Ensure it's an array
    if (!Array.isArray(questions)) {
      questions = [questions];
    }

    console.log(`✅ Successfully extracted ${questions.length} questions from PDF`);
    return questions;

  } catch (error) {
    console.error(`❌ Error during Gemini API call:`, error.message);
    throw error;
  }
}

// Validate question structure (similar to upload-questions.js)
function validateQuestion(question, index) {
  const errors = [];

  // Required fields
  if (!question.questionText || typeof question.questionText !== 'string') {
    errors.push('Missing or invalid questionText (string required)');
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    errors.push('Missing or invalid options (array of exactly 4 strings required)');
  } else {
    for (let i = 0; i < question.options.length; i++) {
      if (typeof question.options[i] !== 'string') {
        errors.push(`Option ${String.fromCharCode(65 + i)} must be a string`);
      }
    }
  }

  if (typeof question.correctAnswerIndex !== 'number' ||
      question.correctAnswerIndex < 0 ||
      question.correctAnswerIndex > 3) {
    errors.push('Missing or invalid correctAnswerIndex (integer 0-3 required)');
  }

  // Optional fields with validation if present
  if (question.explanation !== undefined) {
    if (typeof question.explanation !== 'object' || question.explanation === null) {
      errors.push('Explanation must be an object if provided');
    } else {
      const { coreConcept, steps, pitfall } = question.explanation;
      if (coreConcept !== undefined && typeof coreConcept !== 'string') {
        errors.push('explanation.coreConcept must be a string if provided');
      }
      if (steps !== undefined && typeof steps !== 'string') {
        errors.push('explanation.steps must be a string if provided');
      }
      if (pitfall !== undefined && typeof pitfall !== 'string') {
        errors.push('explanation.pitfall must be a string if provided');
      }
    }
  }

  if (question.syllabusTopic !== undefined && typeof question.syllabusTopic !== 'string') {
    errors.push('syllabusTopic must be a string if provided');
  }

  const validSubjects = ['physics', 'mathematics', 'chemistry', 'biology'];
  if (question.subject !== undefined &&
      (!validSubjects.includes(question.subject.toLowerCase()) || typeof question.subject !== 'string')) {
    errors.push(`subject must be one of: ${validSubjects.join(', ')}`);
  }

  if (question.year !== undefined && typeof question.year !== 'string') {
    errors.push('year must be a string if provided');
  }

  return {
    isValid: errors.length === 0,
    errors: errors.map((err, i) => `${index + 1}. ${err}`)
  };
}

// Normalize question data
function normalizeQuestion(rawQuestion) {
  const question = { ...rawQuestion };

  // Ensure ID exists (will be used as Firestore document ID)
  if (!question.id) {
    delete question.id;
  }

  // Clean options: remove common prefixes like "A) ", "A. ", etc.
  if (Array.isArray(question.options)) {
    question.options = question.options.map(option => {
      if (typeof option === 'string') {
        return option.replace(/^[A-D][).:\s\-]+/i, '').trim();
      }
      return option;
    });
  }

  // Ensure explanation is an object if provided
  if (question.explanation && typeof question.explanation === 'string') {
    question.explanation = {
      coreConcept: question.explanation,
      steps: '',
      pitfall: ''
    };
  } else if (!question.explanation) {
    question.explanation = {};
  }

  // Normalize subject and year to lowercase if provided
  if (question.subject) {
    question.subject = question.subject.toLowerCase();
  }

  return question;
}

// Upload questions to Firebase
async function uploadQuestions(questions) {
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process in batches of 500 (Firestore batch limit)
  const BATCH_SIZE = 500;

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const writeBatch = db.batch();
    let batchSuccess = 0;
    let batchErrors = 0;

    try {
      for (const question of batch) {
        try {
          // Determine the document reference
          const subject = question.subject || 'physics'; // default fallback
          const year = question.year || '2025'; // default fallback

          let docRef;
          if (question.id) {
            // Use provided ID
            docRef = db.collection('subjects').doc(subject).collection('years').doc(year).collection('questions').doc(question.id);
          } else {
            // Let Firebase auto-generate ID
            docRef = db.collection('subjects').doc(subject).collection('years').doc(year).collection('questions').doc();
          }

          // Set the document data (merge:false to overwrite if exists)
          writeBatch.set(docRef, question, { merge: false });
          batchSuccess++;
        } catch (questionError) {
          console.error(`❌ Error preparing question for upload:`, questionError.message);
          batchErrors++;
          errors.push(`Question batch ${Math.floor(i/BATCH_SIZE) + 1}, item ${batch.indexOf(question) + 1}: ${questionError.message}`);
        }
      }

      // Commit the batch
      await writeBatch.commit();
      successCount += batchSuccess;
      errorCount += batchErrors;

      console.log(`📦 Batch ${Math.floor(i/BATCH_SIZE) + 1} completed: ${batchSuccess} successful, ${batchErrors} failed`);

    } catch (batchError) {
      console.error(`❌ Failed to commit batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError.message);
      errorCount += batch.length;
      errors.push(`Batch ${Math.floor(i/BATCH_SIZE) + 1} commit failed: ${batchError.message}`);
    }
  }

  return { successCount, errorCount, errors };
}

// Main execution function
async function main() {
  console.log('🚀 Starting Gemini AI Powered PDF Question Extraction & Upload');
  console.log('='.repeat(70));

  // Get PDF file path from arguments
  const pdfFilePath = args[0];
  if (!pdfFilePath) {
    console.error(`❌ PDF file path not provided.`);
    console.log(`Usage: node gemini-pdf-to-questions.js <pdf-file-path> [firebase-service-account-path] [gemini-api-key]`);
    process.exit(1);
  }

  // Show configuration
  console.log(`📄 PDF File: ${pdfFilePath}`);
  console.log(`🔐 Firebase Service Account: ${FIREBASE_SERVICE_ACCOUNT_PATH}`);
  console.log(`🔑 Gemini API Key: ${GEMINI_API_KEY.substring(0, 8)}...${GEMINI_API_KEY.slice(-4)}`);
  console.log('='.repeat(70));

  // Extract questions from PDF using Gemini
  let rawQuestions;
  try {
    rawQuestions = await extractQuestionsFromPDF(pdfFilePath);
  } catch (error) {
    console.error(`💥 Failed to extract questions from PDF: ${error.message}`);
    process.exit(1);
  }

  if (rawQuestions.length === 0) {
    console.error(`❌ No questions were extracted from the PDF.`);
    process.exit(1);
  }

  // Validate and normalize questions
  console.log(`\n🔍 Validating questions...`);
  const validQuestions = [];
  const validationErrors = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const validation = validateQuestion(rawQuestions[i], i);

    if (validation.isValid) {
      const normalized = normalizeQuestion(rawQuestions[i]);
      validQuestions.push(normalized);
    } else {
      validationErrors.push(...validation.errors);
    }
  }

  console.log(`✅ Validation complete: ${validQuestions.length} valid, ${validationErrors.length} invalid`);

  // Show validation errors if any (first 10)
  if (validationErrors.length > 0) {
    console.log(`\n⚠️  Validation Errors (showing first 10):`);
    validationErrors.slice(0, 10).forEach((error, index) => {
      console.log(`   ${error}`);
    });
    if (validationErrors.length > 10) {
      console.log(`   ... and ${validationErrors.length - 10} more errors`);
    }

    // Ask user if they want to continue with valid questions only
    console.log(`\nDo you want to continue uploading ${validQuestions.length} valid questions? (y/N)`);
    // In automated mode, we'll proceed but log the decision
    console.log(`✅ Proceeding with ${validQuestions.length} valid questions (${validationErrors.length} invalid questions skipped)`);
  }

  if (validQuestions.length === 0) {
    console.error('❌ No valid questions to upload. Please check the PDF quality and try again.');
    process.exit(1);
  }

  // Show sample of what will be uploaded
  console.log(`\n📋 Sample of questions to be uploaded (first 3):`);
  validQuestions.slice(0, 3).forEach((q, index) => {
    console.log(`   ${index + 1}. [${q.subject || 'n/a'}/${q.year || 'n/a'}] ${q.questionText.substring(0, 60)}...`);
  });

  // Upload questions
  console.log(`\n📤 Starting upload to Firebase Firestore...`);
  const startTime = Date.now();

  try {
    const result = await uploadQuestions(validQuestions);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(70));
    console.log(`📊 Upload Summary:`);
    console.log(`   ✅ Successful: ${result.successCount}`);
    console.log(`   ❌ Failed: ${result.errorCount}`);
    console.log(`   ⏱️  Duration: ${duration} seconds`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      result.errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${error}`);
      });
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more errors`);
      }
    }

    if (result.successCount > 0) {
      console.log(`\n🎉 Upload completed! Questions are now available in the JUPEB ORBIT app.`);
      console.log(`   Access path in Firebase: subjects/{{subject}}/years/{{year}}/questions`);
    } else {
      console.log(`\n💥 Upload failed. No questions were successfully uploaded.`);
      process.exit(1);
    }
  } catch (uploadError) {
    console.error(`\n💥 Fatal error during upload process:`, uploadError.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});