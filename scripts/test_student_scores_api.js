const http = require('http');
const jwt = require('../backend/node_modules/jsonwebtoken');

async function testStudentScores() {
  const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';
  
  // Create token for Mustapha Abdullahi (student ID 6)
  const token = jwt.sign(
    { id: 6, reg_number: 'SIT/SWE/23/0009', name: 'Mustapha Abdullahi', role: 'student' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('Testing GET /api/scores/my with no params...');
  await makeScoreRequest(token, '/api/scores/my');

  console.log('\nTesting GET /api/scores/my?session=2025/2026&semester=2...');
  await makeScoreRequest(token, '/api/scores/my?session=2025%2F2026&semester=2');

  console.log('\nTesting GET /api/scores/my?session=2025/2026&semester=1 (wrong semester test)...');
  await makeScoreRequest(token, '/api/scores/my?session=2025%2F2026&semester=1');
}

function makeScoreRequest(token, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('Request error:', e.message);
      resolve();
    });

    req.end();
  });
}

testStudentScores();
