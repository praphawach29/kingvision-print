import https from 'https';

https.get('https://docs.google.com/spreadsheets/d/1mJvGc1BSlIq0jeHll_yIbmowCOsqXBN4Z7hSfBFClW0/export?format=csv', (res) => {
  let data = '';
  
  if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307) {
    https.get(res.headers.location!, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => console.log(data2.substring(0, 500)));
    });
    return;
  }
  
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 500)));
});
