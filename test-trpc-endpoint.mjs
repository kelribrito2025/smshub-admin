// Using native fetch from Node.js 18+

const baseUrl = 'https://3000-ispm8o78ssc2bkiz48238-a307a633.manusvm.computer';

console.log('=== Testing tRPC notifications.getAll endpoint ===\n');

try {
  // Make request to tRPC endpoint
  const response = await fetch(`${baseUrl}/api/trpc/notifications.getAll`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Note: This will test without authentication - should return empty array
    },
  });

  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  
  const data = await response.text();
  console.log('\nResponse body:');
  console.log(data);
  
  try {
    const json = JSON.parse(data);
    console.log('\nParsed JSON:');
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('\nCould not parse as JSON');
  }
} catch (error) {
  console.error('Error:', error.message);
}
