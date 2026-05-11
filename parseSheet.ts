import fs from 'fs';
import Papa from 'papaparse';

const csvData = fs.readFileSync('sheet.csv', 'utf8');
const results = Papa.parse(csvData, { header: true });
console.log(JSON.stringify(results.data.slice(0, 2), null, 2));
