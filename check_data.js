const db = require('./backend/db');
async function checkData() {
    try {
        const res = await db.query("SELECT * FROM students LIMIT 5");
        console.log('Sample Students:', res.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error checking data:', err);
        process.exit(1);
    }
}
checkData();
