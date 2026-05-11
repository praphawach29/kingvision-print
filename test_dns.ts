import dns from 'dns';

dns.resolve('google.com', (err, records) => {
  if (err) console.error('google.com:', err.message);
  else console.log('google.com:', records);
});

dns.resolve('fxphhjfqrxaylphkorgj.supabase.co', (err, records) => {
  if (err) console.error('supabase.co:', err.message);
  else console.log('supabase.co:', records);
});
