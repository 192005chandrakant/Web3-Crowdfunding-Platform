require('dotenv').config();
const { isPinataConfigured, testAuthentication, pinBuffer } = require('./src/services/pinataService');

async function testPinata() {
  console.log('Pinata configured?', isPinataConfigured());
  try {
    const auth = await testAuthentication();
    console.log('Auth result:', auth);
    
    const buffer = Buffer.from('Hello world! This is a test proof document.', 'utf8');
    const result = await pinBuffer(buffer, 'test-proof.txt', { contentType: 'text/plain' });
    console.log('Pin result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}

testPinata();
