const db = require('./backend/db');

const fs = require('fs');
const path = require('path');

// Read your friends' details from the 'students-list.json' file
const studentsFilePath = path.join(__dirname, 'students-list.json');
let newStudents = [];

try {
    const fileContent = fs.readFileSync(studentsFilePath, 'utf8');
    newStudents = JSON.parse(fileContent);
} catch (error) {
    console.error('Error reading students-list.json. Please make sure the file exists and has valid JSON format.', error);
    process.exit(1);
}

async function addStudents() {
    try {
        console.log('Connecting to database...');
        for (const student of newStudents) {

            try {
                // Extract surname (assuming the first word is the surname as per typical Nigerian name order if not specified otherwise, 
                // or we just take the first part of the string split by space)
                const surname = student.name.split(' ')[0].toLowerCase();

                // 1. Create the User (Login Credentials)
                // For students, their username is their matric number and password is the surname
                const userResult = await db.query(
                    'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id',
                    [student.matricNumber, surname, 'student']
                );

                const newUserId = userResult.rows[0].id;

                // 2. Create the Student Profile linked to the User
                await db.query(
                    'INSERT INTO students (user_id, matric_number, name) VALUES ($1, $2, $3)',
                    [newUserId, student.matricNumber, student.name]
                );

                console.log(`✅ successfully added student: ${student.name} (${student.matricNumber})`);
            } catch (err) {
                if (err.code === '23505') {
                    console.log(`⚠️  Skipped: ${student.name} (${student.matricNumber}) already exists in the database.`);
                } else {
                    console.error(`❌ Error inserting ${student.name}:`, err);
                }
            }
        }
        console.log('\nFinished processing students list!');
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        process.exit();
    }
}

addStudents();
