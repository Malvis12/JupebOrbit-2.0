const fs = require('fs');
const content = fs.readFileSync('questions.json', 'utf8');
const pos = content.indexOf('P<AVC');
const nextQ = content.indexOf('{"id":', pos);
console.log('Next Q at:', nextQ);
if (nextQ !== -1) {
    console.log('Snippet at next Q:', JSON.stringify(content.substring(nextQ, nextQ + 100)));
}
const textBetween = content.substring(pos, nextQ);
console.log('Text between P<AVC and next Q:', JSON.stringify(textBetween));
