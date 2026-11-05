const fs = require('fs');

const rawContent = fs.readFileSync('C:/Users/HomePC/Desktop/JUP/physics_bank.json', 'utf8');
const data = JSON.parse(rawContent);

const sampleRaw = rawContent.match(/\"coreConcept\": \"Impulse = Force (\\\\+)/)[0];
console.log('Sample Raw in JSON file:', sampleRaw);

const sampleParsed = data[0].explanation.coreConcept;
console.log('Sample Parsed in memory:', JSON.stringify(sampleParsed));

function unescapeOnce(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/\\\\/g, '\\');
  } else if (Array.isArray(obj)) {
    return obj.map(unescapeOnce);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      newObj[key] = unescapeOnce(obj[key]);
    }
    return newObj;
  }
  return obj;
}

const processedData = unescapeOnce(data);
const sampleProcessed = processedData[0].explanation.coreConcept;
console.log('Sample Processed in memory:', JSON.stringify(sampleProcessed));

const output = `const PHYSICS_BANK = ${JSON.stringify(processedData, null, 2)};\n\nexport { PHYSICS_BANK };`;

const sampleOutput = output.match(/\"coreConcept\": \"Impulse = Force (\\\\+)/)[0];
console.log('Sample in output JS file:', sampleOutput);

fs.writeFileSync('C:/Users/HomePC/Desktop/JUP/physics-data.js', output);
