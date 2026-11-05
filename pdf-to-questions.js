/**
 * PDF Text to Questions JSON Converter
 *
 * This script helps convert extracted PDF text into the JSON format needed for
 * the JUPEB ORBIT question upload system.
 *
 * Expected input format (one question per block, separated by "---" or blank lines):
 *
 * QUESTION: [Your question text here - use $...$ for LaTeX math]
 * OPTIONS:
 * A. [Option A]
 * B. [Option B]
 * C. [Option C]
 * D. [Option D]
 * CORRECT: [A/B/C/D]
 * EXPLANATION: [Optional explanation]
 * TOPIC: [Syllabus topic]
 * SUBJECT: [physics|mathematics|chemistry|biology]
 * YEAR: [2025|2024|etc.]
 *
 * Usage: node pdf-to-questions.js <input-text-file> [output-json-file>
 */

const fs = require('fs');
const path = require('path');

function parseQuestionsFromText(text) {
  // Split by common separators (adjust as needed based on your PDF extraction)
  const blocks = text
    .split(/\n\s*-{3,}\s*\n|\n\s{3,}\n/) // Split by --- or multiple blank lines
    .map(block => block.trim())
    .filter(block => block.length > 0);

  const questions = [];

  blocks.forEach((block, index) => {
    try {
      const lines = block.split('\n').map(line => line.trim());
      let questionData = {
        questionText: '',
        options: ['', '', '', ''],
        correctAnswerIndex: 0,
        explanation: {
          coreConcept: '',
          steps: '',
          pitfall: ''
        },
        syllabusTopic: '',
        subject: 'physics',
        year: '2025'
      };

      let currentSection = null;

      lines.forEach(line => {
        if (line.startsWith('QUESTION:')) {
          questionData.questionText = line.substring(9).trim();
          currentSection = 'QUESTION';
        } else if (line.startsWith('OPTIONS:')) {
          currentSection = 'OPTIONS';
        } else if (line.startsWith('A.')) {
          questionData.options[0] = line.substring(2).trim();
          currentSection = 'OPTIONS';
        } else if (line.startsWith('B.')) {
          questionData.options[1] = line.substring(2).trim();
          currentSection = 'OPTIONS';
        } else if (line.startsWith('C.')) {
          questionData.options[2] = line.substring(2).trim();
          currentSection = 'OPTIONS';
        } else if (line.startsWith('D.')) {
          questionData.options[3] = line.substring(2).trim();
          currentSection = 'OPTIONS';
        } else if (line.startsWith('CORRECT:')) {
          const correct = line.substring(8).trim().toUpperCase();
          questionData.correctAnswerIndex = 'ABCD'.indexOf(correct);
          if (questionData.correctAnswerIndex === -1) {
            questionData.correctAnswerIndex = 0; // Default to A if invalid
          }
          currentSection = 'CORRECT';
        } else if (line.startsWith('EXPLANATION:')) {
          questionData.explanation.coreConcept = line.substring(12).trim();
          currentSection = 'EXPLANATION';
        } else if (line.startsWith('TOPIC:')) {
          questionData.syllabusTopic = line.substring(6).trim();
          currentSection = 'TOPIC';
        } else if (line.startsWith('SUBJECT:')) {
          const subject = line.substring(8).trim().toLowerCase();
          if ['physics', 'mathematics', 'chemistry', 'biology'].includes(subject)) {
            questionData.subject = subject;
          }
          currentSection = 'SUBJECT';
        } else if (line.startsWith('YEAR:')) {
          const year = line.substring(5).trim();
          if ['2025', '2024', '2023', '2022'].includes(year)) {
            questionData.year = year;
          }
          currentSection = 'YEAR';
        } else if (line.trim() !== '' && currentSection) {
          // Append to current section if it's a continuation line
          switch (currentSection) {
            case 'QUESTION':
              questionData.questionText += ' ' + line.trim();
              break;
            case 'EXPLANATION':
              // Could append to steps or pitfall - for simplicity, add to coreConcept
              questionData.explanation.coreConcept += ' ' + line.trim();
              break;
            default:
              // For options, we already captured them above
              break;
          }
        }
      });

      // Basic validation
      if (questionData.questionText &&
          questionData.options.every(opt => opt.trim() !== '') &&
          questionData.correctAnswerIndex >= 0 &&
          questionData.correctAnswerIndex <= 3) {
        questions.push(questionData);
      } else {
        console.warn(`⚠️  Skipping invalid question block #${index + 1}:`,
          JSON.stringify(questionData, null, 2));
      }
    } catch (error) {
      console.error(`❌ Error processing question block #${index + 1}:`, error.message);
    }
  });

  return questions;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`
Usage: node pdf-to-questions.js <input-text-file> [output-json-file]

Examples:
  node pdf-to-questions.js extracted-questions.txt
  node pdf-to-questions.js extracted-questions.txt questions.json

Input file format:
  QUESTION: [question text]
  OPTIONS:
  A. [option A]
  B. [option B]
  C. [option C]
  D. [option D]
  CORRECT: [A/B/C/D]
  EXPLANATION: [optional explanation]
  TOPIC: [syllabus topic]
  SUBJECT: [physics|mathematics|chemistry|biology]
  YEAR: [2025|2024|2023|2022]

  --- (separator between questions)

Output: JSON array of question objects ready for upload-questions.js
    `);
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1] || 'questions-converted.json';

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }

  try {
    const text = fs.readFileSync(inputFile, 'utf8');
    const questions = parseQuestionsFromText(text);

    if (questions.length === 0) {
      console.error(`❌ No valid questions found in ${inputFile}`);
      console.error(`Please check the format matches the expected structure.`);
      process.exit(1);
    }

    const jsonOutput = JSON.stringify(questions, null, 2);
    fs.writeFileSync(outputFile, jsonOutput, 'utf8');

    console.log(`✅ Successfully converted ${questions.length} questions`);
    console.log(`📄 Output saved to: ${outputFile}`);
    console.log(`\nNext steps:`);
    console.log(`1. Review ${outputFile} to ensure correctness`);
    console.log(`2. For bulk upload: node upload-questions.js ${outputFile}`);
    console.log(`3. Or use the admin interface at /admin/questions/upload`);

  } catch (error) {
    console.error(`❌ Error processing file: ${error.message}`);
    process.exit(1);
  }
}

main();