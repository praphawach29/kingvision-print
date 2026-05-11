import https from 'https';
import fs from 'fs';

https.get('https://docs.google.com/spreadsheets/d/1mJvGc1BSlIq0jeHll_yIbmowCOsqXBN4Z7hSfBFClW0/export?format=csv', (res) => {
  if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307) {
    https.get(res.headers.location!, (res2) => {
      const file = fs.createWriteStream("sheet.csv");
      res2.pipe(file);
      file.on('finish', () => console.log('Downloaded'));
    });
    return;
  }
  const file = fs.createWriteStream("sheet.csv");
  res.pipe(file);
  file.on('finish', () => console.log('Downloaded'));
});
