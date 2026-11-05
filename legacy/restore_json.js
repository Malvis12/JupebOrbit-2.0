const fs = require('fs');
let content = fs.readFileSync('questions.json', 'utf8');

// The file is currently broken at question 24.
// Let's find the last complete question before the break.
const lastCompleteQEnd = content.lastIndexOf('},');
if (lastCompleteQEnd !== -1) {
    content = content.substring(0, lastCompleteQEnd + 1) + '\n]';
} else {
    // If we can't find }, just close the array anyway
    content = content.trim();
    if (!content.endsWith(']')) content += '\n]';
}

// Now sanitize it one last time to fix any remaining escapes/newlines
function sanitizeJson(input) {
    let output = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (inString) {
            if (escaped) {
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
                if (input[i + 1] === '\n') {} 
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
    return output;
}

const final = sanitizeJson(content);
fs.writeFileSync('questions.json', final, 'utf8');

try {
    JSON.parse(final);
    console.log('Restored questions.json to a valid state (partial content).');
} catch (e) {
    console.error('Final restore failed:', e.message);
}
