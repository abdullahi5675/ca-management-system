const http = require('http');

async function testApi() {
  const ports = [5000, 3000];

  for (const port of ports) {
    console.log(`\nTesting API on PORT ${port}...`);
    try {
      // 1. Health check
      const health = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/api/health`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(2000, () => req.destroy());
      });
      console.log(`Port ${port} is active! Status:`, health.status);

      // 2. Login as student Mustapha Abdullahi (SIT/SWE/23/0009)
      // If we don't know password, let's login with JWT directly or test login
    } catch (err) {
      console.log(`Port ${port} is NOT reachable (${err.message})`);
    }
  }
}

testApi();
