const fs = require('fs');
const content = fs.readFileSync('questions.json', 'utf8');
const index = content.indexOf('G$');
console.log('Index of G$:', index);
if (index !== -1) {
    console.log('Snippet:', JSON.stringify(content.substring(index - 50, index + 50)));
}
