const http = require('http');

function post(path, data) {
    return new Promise(resolve => {
        const body = JSON.stringify(data);
        const options = {
            hostname: 'localhost', port: 3000, path,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        };
        const req = http.request(options, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => resolve({ status: res.statusCode, body: b }));
        });
        req.on('error', e => resolve({ status: 'ERR', body: e.message }));
        req.write(body);
        req.end();
    });
}

async function runLoginTests() {
    console.log('=== Full Login Flow Tests ===\n');

    // Test Student Login
    const studentLogin = await post('/api/login', {
        username: '24014131078',
        password: 'akanbi',
        role: 'student'
    });
    const sl = JSON.parse(studentLogin.body);
    console.log('Student Login:', studentLogin.status === 200 && sl.success ? '✅ PASS' : '❌ FAIL');
    if (sl.user) console.log('  Name:', sl.user.name, '| Dept:', sl.user.department);
    else console.log('  Error:', sl.message);

    // Test profile update
    const profileUpdate = await post('/api/student-profile-v2', {
        matric: '24014131078',
        name: 'Akanbi Kingsley Emmanuel',
        department: 'COMPUTER SCIENCE'
    });
    const pu = JSON.parse(profileUpdate.body);
    console.log('\nProfile Update:', profileUpdate.status === 200 && pu.success ? '✅ PASS' : '❌ FAIL');
    if (!pu.success) console.log('  Error:', pu.message);

    // Test Admin Login
    const adminLogin = await post('/api/login', {
        username: 'admin1',
        password: 'adminpass',
        role: 'admin'
    });
    const al = JSON.parse(adminLogin.body);
    console.log('\nAdmin Login:', adminLogin.status === 200 ? '✅ PASS' : `❌ FAIL (${adminLogin.status})`);
    console.log('  Message:', al.message || (al.success ? 'OK' : 'Failed'));

    process.exit(0);
}
runLoginTests();
