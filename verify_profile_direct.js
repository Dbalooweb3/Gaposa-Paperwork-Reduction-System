const http = require('http');

async function testProfileUpdate() {
    const data = JSON.stringify({
        matric: '24014131078',
        name: 'Akanbi Kingsley Emmanuel (TEST)',
        department: 'COMPUTER SCIENCE'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/student-profile-v2',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    console.log('--- Testing /api/student-profile-v2 ---');
    console.log('Sending:', data);

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Response Headers:', res.headers['content-type']);
            console.log('Body:', body);
            
            if (res.statusCode === 200) {
                console.log('✅ PROFILE UPDATE ROUTE IS WORKING!');
            } else {
                console.log('❌ PROFILE UPDATE ROUTE FAILED WITH 404/500');
            }
            process.exit(0);
        });
    });

    req.on('error', (err) => {
        console.error('❌ Connection Error:', err.message);
        process.exit(1);
    });

    req.write(data);
    req.end();
}

testProfileUpdate();
