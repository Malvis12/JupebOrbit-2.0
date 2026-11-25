import { Question } from '../types';

export type CsvFieldKey =
  | 'subject'
  | 'year'
  | 'syllabusTopic'
  | 'questionText'
  | 'optionA'
  | 'optionB'
  | 'optionC'
  | 'optionD'
  | 'correctAnswer'
  | 'explanation';

export type CsvColumnMapping = Partial<Record<CsvFieldKey, string>>;

export interface ParsedCsvData {
  headers: string[];
  rows: Record<string, string>[];
}

export const CSV_FIELD_LABELS: Record<CsvFieldKey, { label: string; required?: boolean }> = {
  questionText: { label: 'Question Text', required: true },
  optionA: { label: 'Option A', required: true },
  optionB: { label: 'Option B', required: true },
  optionC: { label: 'Option C', required: true },
  optionD: { label: 'Option D', required: true },
  correctAnswer: { label: 'Correct Answer (A-D or 0-3)', required: true },
  syllabusTopic: { label: 'Syllabus Topic' },
  explanation: { label: 'Explanation' },
  subject: { label: 'Subject' },
  year: { label: 'Year' },
};

const HEADER_ALIASES: Record<CsvFieldKey, string[]> = {
  questionText: ['question', 'questiontext', 'question_text', 'prompt', 'q'],
  optionA: ['optiona', 'option_a', 'a', 'opt_a', 'choicea', 'choice_a'],
  optionB: ['optionb', 'option_b', 'b', 'opt_b', 'choiceb', 'choice_b'],
  optionC: ['optionc', 'option_c', 'c', 'opt_c', 'choicec', 'choice_c'],
  optionD: ['optiond', 'option_d', 'd', 'opt_d', 'choiced', 'choice_d'],
  correctAnswer: ['correctanswer', 'correct_answer', 'correctanswerindex', 'correct_answer_index', 'answer', 'ans', 'key'],
  syllabusTopic: ['topic', 'syllabustopic', 'syllabus_topic', 'category'],
  explanation: ['explanation', 'solution', 'coreconcept', 'core_concept', 'notes'],
  subject: ['subject', 'course'],
  year: ['year', 'examyear', 'exam_year'],
};

/**
 * Parse RFC-4180 CSV text into headers and row objects.
 */
export function parseCsvText(text: string): ParsedCsvData {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const cleanText = text.replace(/^\uFEFF/, ''); // Strip UTF-8 BOM if present

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell !== '')) rows.push(currentRow);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((h, idx) => h || `column_${idx + 1}`);
  const dataRows = rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? '';
    });
    return obj;
  });

  return { headers, rows: dataRows };
}

/**
 * Auto-detect column mapping from CSV headers.
 */
export function autoDetectCsvMapping(headers: string[]): CsvColumnMapping {
  const mapping: CsvColumnMapping = {};
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    norm: h.toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));

  (Object.keys(HEADER_ALIASES) as CsvFieldKey[]).forEach((field) => {
    const aliases = HEADER_ALIASES[field].map((a) => a.replace(/[^a-z0-9]/g, ''));
    const match = normalizedHeaders.find((h) => aliases.includes(h.norm));
    if (match) {
      mapping[field] = match.original;
    }
  });

  return mapping;
}

function parseCorrectAnswerIndex(raw: string): number {
  const val = raw.trim().toUpperCase();
  if (val === 'A' || val === '0') return 0;
  if (val === 'B' || val === '1') return 1;
  if (val === 'C' || val === '2') return 2;
  if (val === 'D' || val === '3') return 3;
  const num = parseInt(val, 10);
  if (!isNaN(num) && num >= 0 && num <= 3) return num;
  return 0;
}

/**
 * Convert parsed CSV rows into Question objects using the active column mapping.
 */
export function mapCsvRowsToQuestions(
  rows: Record<string, string>[],
  mapping: CsvColumnMapping,
  defaultSubject: string,
  defaultYear: string,
  startIndex = 0
): Question[] {
  return rows
    .filter((row) => {
      const qText = mapping.questionText ? row[mapping.questionText] : '';
      return qText && qText.trim().length > 0;
    })
    .map((row, idx) => {
      const subject = (mapping.subject && row[mapping.subject]?.trim().toLowerCase()) || defaultSubject;
      const year = (mapping.year && row[mapping.year]?.trim()) || defaultYear;
      const seqNum = startIndex + idx + 1;
      const id = `${subject.slice(0, 3)}-${year}-q${String(seqNum).padStart(2, '0')}`;

      const explanationText = mapping.explanation ? row[mapping.explanation]?.trim() : '';

      return {
        id,
        questionText: (mapping.questionText ? row[mapping.questionText] : '').trim(),
        options: [
          (mapping.optionA ? row[mapping.optionA] : '')?.trim() || '',
          (mapping.optionB ? row[mapping.optionB] : '')?.trim() || '',
          (mapping.optionC ? row[mapping.optionC] : '')?.trim() || '',
          (mapping.optionD ? row[mapping.optionD] : '')?.trim() || '',
        ],
        correctAnswerIndex: parseCorrectAnswerIndex(
          mapping.correctAnswer ? row[mapping.correctAnswer] || 'A' : 'A'
        ),
        explanation: explanationText
          ? { coreConcept: explanationText, steps: '', pitfall: '' }
          : undefined,
        syllabusTopic: (mapping.syllabusTopic ? row[mapping.syllabusTopic]?.trim() : '') || 'General',
        subject,
        year,
      };
    });
}

/**
 * Parse a JSON string (either Question[] or { questions: Question[] }) into Question[].
 */
export function parseQuestionsJson(
  jsonText: string,
  defaultSubject: string,
  defaultYear: string,
  startIndex = 0
): Question[] {
  const parsed = JSON.parse(jsonText);
  const rawList: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.questions)
      ? parsed.questions
      : [];

  return rawList.map((item, idx) => {
    const subject = (item.subject || defaultSubject).toLowerCase();
    const year = String(item.year || defaultYear);
    const seqNum = startIndex + idx + 1;
    const id = item.id || `${subject.slice(0, 3)}-${year}-q${String(seqNum).padStart(2, '0')}`;

    const options = Array.isArray(item.options)
      ? [
          String(item.options[0] ?? ''),
          String(item.options[1] ?? ''),
          String(item.options[2] ?? ''),
          String(item.options[3] ?? ''),
        ]
      : [
          String(item.optionA ?? ''),
          String(item.optionB ?? ''),
          String(item.optionC ?? ''),
          String(item.optionD ?? ''),
        ];

    const correctAnswerIndex =
      typeof item.correctAnswerIndex === 'number'
        ? item.correctAnswerIndex
        : parseCorrectAnswerIndex(String(item.correctAnswer ?? 'A'));

    return {
      id,
      questionText: String(item.questionText || item.question || '').trim(),
      options,
      correctAnswerIndex,
      explanation: item.explanation
        ? typeof item.explanation === 'string'
          ? { coreConcept: item.explanation, steps: '', pitfall: '' }
          : item.explanation
        : undefined,
      syllabusTopic: String(item.syllabusTopic || item.topic || 'General').trim(),
      subject,
      year,
    };
  });
}

/**
 * Generate a downloadable CSV template string.
 */
export function generateCsvTemplate(): string {
  const headers = [
    'subject',
    'year',
    'topic',
    'question',
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'correctAnswer',
    'explanation',
  ];
  const sampleRow = [
    'physics',
    '2024',
    'Mechanics',
    '"If $v = u + at$, find $v$ when $u = 2\\text{ m/s}$, $a = 3\\text{ m/s}^2$, $t = 4\\text{ s}$."',
    '"$10\\text{ m/s}$"',
    '"$14\\text{ m/s}$"',
    '"$12\\text{ m/s}$"',
    '"$8\\text{ m/s}$"',
    'B',
    '"Using $v = u + at = 2 + (3)(4) = 14\\text{ m/s}$."',
  ];
  return `${headers.join(',')}\n${sampleRow.join(',')}\n`;
}
