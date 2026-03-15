const http = require('http');

const data = JSON.stringify({
    matric: 'TEST/MATRIC/123',
    name: 'Test Name',
    department: 'Test Dept'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/students/profile-update',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Response Body:', body);
        process.exit(0);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    process.exit(1);
});

req.write(data);
req.end();
