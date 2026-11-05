const fs = require('fs');
let content = fs.readFileSync('questions.json', 'utf8');

// 1. Remove the corrupted index block
const startStr = '"A "A. "At "B. "C.';
const endStr = '> G$, a budget surplus exists';
const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    console.log(`Removing corrupted block from ${startIdx} to ${endIdx}`);
    // We want to keep "> G$, a budget surplus exists" as it seems part of the text
    content = content.substring(0, startIdx) + content.substring(endIdx + 2); // +2 for "> "
}

// 2. Unescape quotes that were likely over-escaped
// If the file has \"id\", we want "id"
// BUT we must be careful not to unescape quotes that ARE supposed to be escaped (if any)
// In this specific file, it seems ALL quotes were escaped.
content = content.replace(/\\"/g, '"');

// 3. Fix the unescaped backslashes and literal newlines
function sanitizeJson(input) {
    let output = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (inString) {
            if (escaped) {
                // Valid escapes: " \ / b f n r t u
                if (char === '"' || char === '\\' || char === '/' || char === 'b' || char === 'f' || char === 'n' || char === 'r' || char === 't' || char === 'u') {
                    output += '\\' + char;
                } else {
                    output += '\\\\' + char;
                }
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                output += '"';
                inString = false;
            } else if (char === '\n') {
                output += '\\n';
            } else if (char === '\r') {
                if (input[i + 1] === '\n') { /* skip */ }
                else output += '\\n';
            } else {
                output += char;
            }
        } else {
            output += char;
            if (char === '"') {
                inString = true;
            }
        }
    }
    if (escaped) output += '\\\\';
    return output;
}

const finalContent = sanitizeJson(content);
fs.writeFileSync('questions.json', finalContent, 'utf8');

try {
    JSON.parse(finalContent);
    console.log('Successfully fixed and verified JSON.');
} catch (e) {
    console.error('Final check failed:', e.message);
    const match = e.message.match(/position (\d+)/);
    if (match) {
        const pos = parseInt(match[1]);
        console.log('Error around:', JSON.stringify(finalContent.substring(pos - 50, pos + 50)));
    }
}
