import { renderEmailTemplate } from './server/email-template-renderer.ts';

// Test the email template with sample data
const html = renderEmailTemplate('activation-email-cyber', {
  USER_NAME: 'João Silva',
  ACTIVATION_LINK: 'https://app.numero-virtual.com/activate?id=test123'
});

console.log('✅ Email template rendered successfully!');
console.log('📧 Template length:', html.length, 'characters');
console.log('\n--- Preview (first 500 chars) ---');
console.log(html.substring(0, 500));
console.log('\n--- Checking variables replacement ---');
console.log('✓ USER_NAME replaced:', html.includes('João Silva'));
console.log('✓ ACTIVATION_LINK replaced:', html.includes('https://app.numero-virtual.com/activate?id=test123'));
console.log('✓ No unreplaced variables:', !html.includes('{{'));
