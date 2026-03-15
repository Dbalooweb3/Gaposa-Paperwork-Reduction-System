const db = require('./backend/db');
async function checkSchema() {
    try {
        const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'students'");
        console.log('Columns in students table:', res.rows.map(r => r.column_name));
        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err);
        process.exit(1);
    }
}
checkSchema();
