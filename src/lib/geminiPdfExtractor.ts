import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question } from '../types';

export const SUBJECT_PREFIX_MAP: Record<string, string> = {
  physics: 'phy',
  mathematics: 'mth',
  chemistry: 'chm',
  biology: 'bio',
  economics: 'ecn',
  government: 'gov',
  'agricultural science': 'agr',
  'literature in english': 'lit',
  'crs/irs': 'crs',
  accounting: 'acc'
};

const EXTRACTION_SYSTEM_PROMPT = `
You are an expert academic examiner and parser for the JUPEB (Joint Universities Preliminary Examinations Board) curriculum.
Extract ALL multiple choice questions from the provided past question document.

Output MUST be a single raw JSON array of objects with this exact structure:
[
  {
    "questionNumber": 1,
    "questionText": "Question string. Mathematical/chemical expressions MUST use standard LaTeX wrapped in $...$ or $$...$$.",
    "options": [
      "Option A string (use LaTeX if mathematical)",
      "Option B string",
      "Option C string",
      "Option D string"
    ],
    "correctAnswerIndex": 0,
    "syllabusTopic": "Accurate curriculum topic (e.g. Kinematics, Integration, Organic Reaction Mechanisms)",
    "explanation": {
      "coreConcept": "Core theorem or fundamental principle tested",
      "steps": "Concise step-by-step mathematical or scientific solution",
      "pitfall": "The main distractor or typical misconception students make"
    }
  }
]

Formatting requirements:
1. Every question must have EXACTLY 4 options in an array.
2. correctAnswerIndex must be an integer between 0 and 3 (0 for A, 1 for B, 2 for C, 3 for D). If not explicitly marked in the past question paper, determine the scientifically/mathematically verified correct answer.
3. Use single dollar signs $...$ for inline math (e.g. $s = ut + \\frac{1}{2}at^2$) and double dollar signs $$...$$ for standalone display equations.
4. Ensure all backslashes in JSON strings are properly escaped (e.g., \\\\frac, \\\\theta, \\\\int).
5. Output ONLY the JSON array without any markdown wrappers or commentary if possible.
`;

export async function extractQuestionsFromPdfFile(
  file: File,
  subject: string,
  year: string,
  apiKey: string,
  onProgress?: (status: string) => void
): Promise<Question[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API key is required. Please provide it in .env or the API Key input.');
  }

  onProgress?.('Reading PDF file...');
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Convert binary to base64 safely
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  onProgress?.('Uploading PDF to Gemini AI model for extraction...');
  const genAI = new GoogleGenerativeAI(apiKey.trim());

  const prompt = `${EXTRACTION_SYSTEM_PROMPT}

Target Subject: ${subject.toUpperCase()}
Target Exam Year: ${year}

Analyze the uploaded PDF and extract all examination questions following the specified format.`;

  onProgress?.('Gemini 3.8 Flash is analyzing pages and formulating LaTeX questions & explanations...');
  
  // Resilient model cascade: gemini-3.8-flash -> gemini-3.5-flash-lite -> gemini-3.5-flash
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash'
  ];
  let responseText = '';
  let lastError: any = null;

  for (const mName of candidateModels) {
    onProgress?.(`Extracting questions using ${mName}...`);
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const model = genAI.getGenerativeModel({ model: mName });
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: 'application/pdf'
            }
          }
        ]);
        responseText = result.response.text();
        if (responseText) break;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const is503 = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('overloaded');

        if (is503 && attempts < maxAttempts) {
          onProgress?.(`${mName} experiencing temporary high demand, retrying in 2.5s...`);
          await new Promise(res => setTimeout(res, 2500));
        } else {
          console.warn(`Model ${mName} attempt ${attempts} error:`, errMsg);
          break; // move to next model in cascade
        }
      }
    }

    if (responseText) break;
  }

  if (!responseText) {
    throw lastError || new Error('Failed to generate content with Gemini models.');
  }
  onProgress?.('Parsing and structuring extracted questions...');

  // Clean JSON string (remove possible markdown ```json ... ``` blocks)
  let cleanJson = responseText.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const rawList = JSON.parse(cleanJson);
  if (!Array.isArray(rawList)) {
    throw new Error('Extracted data is not a valid JSON array.');
  }

  const normalizedSubject = subject.toLowerCase().trim();
  const prefix = SUBJECT_PREFIX_MAP[normalizedSubject] || normalizedSubject.slice(0, 3);

  // Map to standardized Question array with deterministic IDs: {prefix}-{year}-q{01..50}
  const questions: Question[] = rawList.map((item: any, idx: number) => {
    const qNum = typeof item.questionNumber === 'number' ? item.questionNumber : idx + 1;
    const paddedNum = String(qNum).padStart(2, '0');
    const deterministicId = `${prefix}-${year}-q${paddedNum}`;

    let correctIndex = Number(item.correctAnswerIndex);
    if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      correctIndex = 0;
    }

    const options = Array.isArray(item.options) && item.options.length >= 4
      ? item.options.slice(0, 4).map((opt: any) => String(opt).trim())
      : ['Option A', 'Option B', 'Option C', 'Option D'];

    return {
      id: deterministicId,
      questionText: String(item.questionText || '').trim(),
      options,
      correctAnswerIndex: correctIndex,
      syllabusTopic: String(item.syllabusTopic || 'General Topic').trim(),
      explanation: {
        coreConcept: String(item.explanation?.coreConcept || '').trim(),
        steps: String(item.explanation?.steps || '').trim(),
        pitfall: String(item.explanation?.pitfall || '').trim()
      },
      subject: normalizedSubject,
      year: String(year).trim()
    };
  });

  return questions;
}
