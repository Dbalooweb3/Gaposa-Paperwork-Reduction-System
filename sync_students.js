const db = require('./backend/db');
const fs = require('fs');
const path = require('path');

async function syncStudents() {
    try {
        const jsonPath = path.join(__dirname, 'students-list.json');
        const fileContent = fs.readFileSync(jsonPath, 'utf8');
        const students = JSON.parse(fileContent);

        console.log(`--- Syncing ${students.length} students from JSON to Database ---`);

        for (const student of students) {
            const { name, matricNumber } = student;
            const cleanMatric = matricNumber.trim();
            const cleanName = name.trim();
            
            // 1. Check if student exists
            const existing = await db.query(
                "SELECT id FROM students WHERE UPPER(TRIM(matric_number)) = UPPER($1)",
                [cleanMatric]
            );

            if (existing.rowCount > 0) {
                // Update existing
                const res = await db.query(
                    "UPDATE students SET name = $1 WHERE UPPER(TRIM(matric_number)) = UPPER($2) RETURNING name",
                    [cleanName, cleanMatric]
                );
                console.log(`✅ Updated Name: [${cleanMatric}] -> ${res.rows[0].name}`);
            } else {
                // Create New Student (Auto-Register)
                console.log(`🆕 Creating NEW Student: [${cleanMatric}] - ${cleanName}`);
                
                // Derive password from last name (surname)
                const nameParts = cleanName.split(' ');
                const surname = nameParts[nameParts.length - 1].toLowerCase();

                // Start "Transaction" via linked queries
                try {
                    // Create entry in users table
                    const userRes = await db.query(
                        "INSERT INTO users (username, password, role) VALUES ($1, $2, 'student') RETURNING id",
                        [cleanMatric, surname]
                    );
                    const newUserId = userRes.rows[0].id;

                    // Create entry in students table
                    await db.query(
                        "INSERT INTO students (user_id, matric_number, name, department) VALUES ($1, $2, $3, 'NOT SET')",
                        [newUserId, cleanMatric, cleanName]
                    );

                    console.log(`   ✨ Auth Created! Default Password is: ${surname}`);
                } catch (regErr) {
                    console.error(`   ❌ Failed to register ${cleanMatric}:`, regErr.message);
                }
            }
        }

        console.log('\n--- Sync Complete! ---');
        process.exit(0);
    } catch (err) {
        console.error('❌ Sync Error:', err.message);
        process.exit(1);
    }
}

syncStudents();
