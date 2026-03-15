const http = require('http');

async function testV22() {
    try {
        console.log('--- Checking Root /ping ---');
        const ping = await new Promise(r => http.get('http://localhost:3000/ping', res => {
            let b = ''; res.on('data', c => b += c); res.on('end', () => r(b));
        }));
        console.log('Response:', ping);

        console.log('\n--- Testing Direct Profile Update ---');
        const data = JSON.stringify({ matric: 'F/HD/XX/XXXX', name: 'John V2.2', department: 'TEST' });
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/student-profile-v2',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
        };
        const res = await new Promise(r => {
            const req = http.request(options, res => {
                let b = ''; res.on('data', c => b += c); res.on('end', () => r({s: res.statusCode, b}));
            });
            req.write(data);
            req.end();
        });
        console.log('Status:', res.s);
        console.log('Body:', res.b);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
testV22();
