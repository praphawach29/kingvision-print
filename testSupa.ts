import https from 'https';

const req = https.get('https://fxphhjfqrxaylphkorgj.supabase.co/rest/v1/', (res) => {
  console.log('Status:', res.statusCode);
});
req.on('error', (e) => {
  console.error('Request failed:', e.message);
});
