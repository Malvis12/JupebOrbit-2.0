# Converting PDF Past Questions to JSON for JUPEB ORBIT

Since your past questions are in PDF format, you'll need to extract and structure them before uploading. This guide provides multiple approaches to handle this common scenario.

## 📄 **PDF Conversion Workflow**

### **Step 1: Extract Text from PDF**
Choose one of these methods based on your technical comfort and available tools:

#### **Option A: Manual Copy-Paste (Best for Small Sets)**
1. Open PDF in Adobe Reader or similar
2. Select text manually for each question
3. Paste into a text editor
4. Format according to the template below

#### **Option B: Automated Text Extraction (Best for Medium-Large Sets)**
**Free Tools:**
- **Adobe Acrobat Reader DC** (Free): File → Export To → Microsoft Word or Plain Text
- **Online converters**: Smallpdf.com, ILovePDF.com, PDF2Go.com
- **Command line** (if technical): `pdftotext filename.pdf` (requires poppler-utils)

**For Better Accuracy with Complex Formatting:**
- **ABBYY FineReader** (excellent for educational materials, has free trial)
- **Microsoft OneNote** (free - can extract text from PDF images via OCR)
- **Google Drive**: Upload PDF → Open with Google Docs → Download as .txt

#### **Option C: Specialized Educational Tools**
- **ExamJet** or similar quiz creation tools often have PDF import features
- **Learning management systems** (Moodle, Canvas) sometimes have question import utilities

### **Step 2: Structure Extracted Text**
After extracting text, organize each question using this format:

```
QUESTION: [Full question text - use $...$ for LaTeX math like $F = ma$]
OPTIONS:
A. [Option A text]
B. [Option B text]
C. [Option C text]
D. [Option D text]
CORRECT: [A/B/C/D - the letter of the correct answer]
EXPLANATION: [Optional - Core concept, solution steps, common pitfall]
TOPIC: [Syllabus topic from curriculum]
SUBJECT: [physics|mathematics|chemistry|biology]
YEAR: [2025|2024|2023|2022]

--- [Separator between questions - three dashes on their own line]
```

### **Step 3: Convert to JSON Format**
Use the provided helper script or manually format as JSON.

#### **Using the Helper Script**
I've created `pdf-to-questions.js` to automate this conversion:

```bash
node pdf-to-questions.js your-extracted-text.txt output-questions.json
```

**Input format for pdf-to-questions.js:**
```
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

---
```

#### **Manual JSON Creation**
For small sets, you can manually create JSON using this template:
```json
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
```

### **📋 Step-by-Step Example**

**1. Extract from PDF** (you get this text):
```
Question: A body starts from rest and accelerates uniformly at 2 m/s² for 10 s. Calculate the total distance covered.
A. 50 m
B. 100 m
C. 150 m
D. 200 m
Answer: B
Topic: Kinematics & Motion
Subject: Physics
Year: 2025
```

**2. Format for conversion:**
```
QUESTION: A body starts from rest and accelerates uniformly at $2\\text{ m/s}^2$ for $10\\text{ s}$. Calculate the total distance covered.
OPTIONS:
A. $50\\text{ m}$
B. $100\\text{ m}$
C. $150\\text{ m}$
D. $200\\text{ m}$
CORRECT: B
EXPLANATION: Using $s = ut + \\frac{1}{2}at^2$ with $u=0$, $a=2\\text{ m/s}^2$, $t=10\\text{ s}$:\n$s = 0 + \\frac{1}{2}(2)(10)^2 = 100\\text{ m}$.\n\nPitfall: Forgetting that starting from rest implies initial velocity $u = 0$.
TOPIC: Kinematics & Motion
SUBJECT: physics
YEAR: 2025
```

**3. Run conversion:**
```bash
node pdf-to-questions.js formatted-questions.txt questions.json
```

**4. Upload results:**
```bash
node upload-questions.js questions.json
```

### **🔧 Tips for Success**

**Handling Mathematical Notation:**
- Wrap LaTeX math in `$...$` for inline: `$F = ma$`
- For display math: $$...$$ (though inline usually works better in this system)
- Common symbols: `\\times`, `\\div`, `\\cdot`, `\\frac{}{}`, `\\sqrt{}`, `\\infty`

**Dealing with Scanned PDFs (Image-based):**
1. Use OCR tools first: ABBYY FineReader, Adobe Acrobat Pro OCR, or Microsoft OneNote
2. Verify OCR accuracy - mathematical symbols often need manual correction
3. Consider manually retyping complex mathematical questions if OCR is poor

**Batch Processing Large PDFs:**
1. Split PDF into chapter/topic sections first
2. Process each section separately
3. Combine resulting JSON files manually or with: `cat file1.json file2.json > combined.json` (then fix formatting)

### **🛠️ Troubleshooting Common Issues**

**"My options aren't parsing correctly":**
- Ensure each option starts with exactly "A.", "B.", "C.", "D." (letter + period + space)
- Remove any extra numbering or bullets before the letter

**"My correct answer isn't being recognized":**
- Use exactly "A", "B", "C", or "D" after "CORRECT:"
- Case doesn't matter, but no extra text or punctuation

**"LaTeX isn't rendering in the app":**
- Ensure math expressions are wrapped in single dollar signs: `$...$`
- Avoid double dollar signs unless you specifically need display mode
- Test simple expressions first: `$x^2$`, `$\\frac{a}{b}$`, `$\\sqrt{2}$`

**"I get JSON parsing errors":**
- Run your JSON through a validator like jsonlint.com
- Check for trailing commas (invalid in JSON)
- Ensure all strings are properly quoted
- Verify you have matching brackets `[ ]` and braces `{ }`

### **📊 Recommended Approach Based on Volume**

**< 50 questions:** Manual copy-paste into JSON template
**50-500 questions:** PDF text extraction → structure with markers → use pdf-to-questions.js
**> 500 questions:** Consider hiring assistance or using specialized educational content conversion services

### **⚠️ Important Notes**

1. **Backup your work**: Save intermediate files at each step
2. **Validate samples**: Test with 5-10 questions first before processing full batch
3. **Check rendering**: After upload, verify questions display correctly in Practice/Exam modes
4. **Preserve originals**: Keep your PDF source files and extracted text files for reference

## 📎 Files Provided to Help

1. `pdf-to-questions.js` - Conversion script (detailed above)
2. `sample-pdf-input.txt` - Example of expected input format
3. `questions-template.json` - Example of expected output format
4. `upload-questions.js` - The bulk upload script (already provided)

## 🚀 Quick Start Guide

If you're ready to try:

1. Extract text from your PDF using one of the methods above
2. Format it according to the sample in `sample-pdf-input.txt`
3. Run: `node pdf-to-questions.js your-formatted-text.txt questions.json`
4. Review the output in `questions.json`
5. Upload: `node upload-questions.js questions.json`

Would you like me to help you work through a specific example from your PDF, or do you have questions about any of these steps?