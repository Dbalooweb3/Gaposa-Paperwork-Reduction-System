const db = require('./backend/db');

async function testConnection() {
    try {
        const res = await db.query('SELECT * FROM users');
        console.log('Database connected successfully!');
        console.log('Users found:', res.rows);
    } catch (err) {
        console.error('Database connection failed:', err);
    } finally {
        process.exit();
    }
}

testConnection();
