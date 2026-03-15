const fetch = require('node-fetch');

async function testUpdate() {
    try {
        const response = await fetch('http://localhost:3000/api/students/profile-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                matric: 'TEST/MATRIC/123',
                name: 'Test Name',
                department: 'Test Dept'
            })
        });
        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response Body:', text);
    } catch (err) {
        console.error('Fetch Error (Is server running?):', err.message);
    }
}

testUpdate();
