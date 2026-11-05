const fs = require('fs');
const content = fs.readFileSync('questions.json', 'utf8');
const start = content.indexOf('"A "A. "At "B. "C.');
console.log('Start of index:', start);
// Look for where it seems to resume normal JSON
// The snippet I saw was "> G$, a budget surplus exists"
const end = content.indexOf('> G$, a budget surplus exists');
console.log('End of index:', end);

if (start !== -1 && end !== -1) {
    const corrupted = content.substring(start, end);
    console.log('Corrupted length:', corrupted.length);
    console.log('First 100 of corrupted:', JSON.stringify(corrupted.substring(0, 100)));
    console.log('Last 100 of corrupted:', JSON.stringify(corrupted.substring(corrupted.length - 100)));
}
