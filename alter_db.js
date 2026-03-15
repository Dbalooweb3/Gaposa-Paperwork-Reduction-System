const db = require('./backend/db');

async function alterTable() {
    try {
        await db.query('ALTER TABLE documents ADD COLUMN config_json TEXT');
        console.log("Column config_json added successfully.");
    } catch (err) {
        if (err.code === '42701') {
            console.log("Column already exists.");
        } else {
            console.error("Error altering table:", err);
        }
    } finally {
        process.exit();
    }
}

alterTable();
