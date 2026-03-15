const db = require('./backend/db');

async function inspectTable() {
    try {
        console.log('--- Table Information: students ---');
        const res = await db.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'students'
        `);
        console.table(res.rows);

        const sample = await db.query("SELECT * FROM students LIMIT 1");
        console.log('\nSample Student Data:', sample.rows[0]);
        
        process.exit(0);
    } catch (err) {
        console.error('Inspection Error:', err);
        process.exit(1);
    }
}
inspectTable();
