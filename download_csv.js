import fs from 'fs';
import https from 'https';

const url = 'https://docs.google.com/spreadsheets/d/1y3SnqdTuqDT2CvcntjPz_5pGZyk-t_MJwqS7GKxw6NU/export?format=csv';

https.get(url, (res) => {
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    https.get(res.headers.location, (res2) => {
      let data = '';
      res2.on('data', chunk => data += chunk);
      res2.on('end', () => {
        fs.writeFileSync('products.csv', data);
        console.log('Downloaded products.csv');
      });
    });
  } else {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      fs.writeFileSync('products.csv', data);
      console.log('Downloaded products.csv');
    });
  }
});
