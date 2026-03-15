const http = require('http');

async function runTest(path, payload) {
    const data = JSON.stringify(payload);
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', (e) => resolve({ error: e.message }));
        req.write(data);
        req.end();
    });
}

async function start() {
    console.log('--- TEST 1: Health Check ---');
    const h = await new Promise(r => http.get('http://localhost:3000/api/health', (res) => {
        let b = ''; res.on('data', c => b += c); res.on('end', () => r({s: res.statusCode, b}));
    }));
    console.log(h);

    console.log('\n--- TEST 2: Profile Update V2 (Non-existent) ---');
    console.log(await runTest('/api/student-profile-v2', { matric: 'NON_EXISTENT', name: 'Test', department: 'Test' }));

    console.log('\n--- TEST 3: Profile Update V2 (Valid) ---');
    console.log(await runTest('/api/student-profile-v2', { matric: 'F/HD/XX/XXXX', name: 'John Updated', department: 'COMPUTER SCIENCE' }));

    process.exit(0);
}

start();
