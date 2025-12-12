console.log('=== MANDRILL CONFIGURATION TEST ===\n');

// 1. Check environment variables
console.log('1. Environment Variables:');
const apiKey = process.env.MANDRILL_API_KEY;
const fromEmail = process.env.MAILCHIMP_FROM_EMAIL;
const fromName = process.env.MAILCHIMP_FROM_NAME;

console.log('   MANDRILL_API_KEY:', apiKey ? `✓ Present (${apiKey.substring(0, 8)}...)` : '✗ Missing');
console.log('   MAILCHIMP_FROM_EMAIL:', fromEmail || '✗ Missing');
console.log('   MAILCHIMP_FROM_NAME:', fromName || '✗ Missing');
console.log('');

if (!apiKey) {
  console.error('✗ MANDRILL_API_KEY not configured. Exiting.');
  process.exit(1);
}

// 2. Test Mandrill API connection
console.log('2. Testing Mandrill API Connection...');
try {
  const response = await fetch('https://mandrillapp.com/api/1.0/users/ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: apiKey }),
  });

  const result = await response.json();
  
  if (response.ok && result === 'PONG!') {
    console.log('   ✓ Connection successful:', result);
  } else {
    console.error('   ✗ Connection failed:', result);
    process.exit(1);
  }
} catch (error) {
  console.error('   ✗ Connection error:', error.message);
  process.exit(1);
}

console.log('');

// 3. Test sending a real email
console.log('3. Testing Email Send...');
try {
  const testEmail = process.env.TEST_EMAIL || 'test@example.com';
  const finalFromEmail = fromEmail || 'noreply@numero-virtual.com';
  const finalFromName = fromName || 'Número Virtual';
  
  console.log(`   Sending test email to: ${testEmail}`);
  console.log(`   From: ${finalFromName} <${finalFromEmail}>`);
  
  const response = await fetch('https://mandrillapp.com/api/1.0/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: apiKey,
      message: {
        html: '<h1>Test Email</h1><p>This is a test email from Mandrill configuration test.</p>',
        subject: '[TEST] Mandrill Configuration Test',
        from_email: finalFromEmail,
        from_name: finalFromName,
        to: [{ email: testEmail, type: 'to' }],
        track_opens: true,
        track_clicks: true,
        auto_text: true,
        inline_css: true,
      },
    }),
  });

  const result = await response.json();
  
  console.log('   Response status:', response.status);
  console.log('   Response body:', JSON.stringify(result, null, 2));
  
  if (result[0]?.status === 'sent' || result[0]?.status === 'queued') {
    console.log(`   ✓ Email ${result[0].status}:`, result[0]._id);
  } else if (result[0]?.status === 'rejected') {
    console.error(`   ✗ Email rejected:`, result[0].reject_reason);
  } else if (result[0]?.status === 'invalid') {
    console.error(`   ✗ Email invalid:`, result[0]);
  } else {
    console.error('   ✗ Unexpected result:', result);
  }
} catch (error) {
  console.error('   ✗ Send error:', error.message);
  process.exit(1);
}

console.log('\n=== TEST COMPLETE ===');
