const fs = require('fs');

function sanitizeJson(input) {
    let output = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (inString) {
            if (escaped) {
                // We are after a backslash. Check if the current character is a valid JSON escape.
                if (char === '"' || char === '\\' || char === '/' || char === 'b' || char === 'f' || char === 'n' || char === 'r' || char === 't' || char === 'u') {
                    output += '\\' + char;
                } else {
                    // Invalid escape sequence, escape the backslash itself
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
                // Ignore \r if followed by \n to avoid doubling
                if (input[i + 1] === '\n') {
                    // Skip \r, let the \n handle it
                } else {
                    output += '\\n';
                }
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
    
    // Handle trailing backslash if any
    if (escaped) {
        output += '\\\\';
    }

    return output;
}

const content = fs.readFileSync('questions.json', 'utf8');
const sanitized = sanitizeJson(content);
fs.writeFileSync('questions.json', sanitized, 'utf8');

try {
    JSON.parse(sanitized);
    console.log('Successfully sanitized and verified JSON.');
} catch (e) {
    console.error('Sanitization failed to produce valid JSON:', e.message);
    // Find snippet around failure
    const match = e.message.match(/position (\d+)/);
    if (match) {
        const pos = parseInt(match[1]);
        console.log('Error around:', JSON.stringify(sanitized.substring(pos - 30, pos + 30)));
    }
}
