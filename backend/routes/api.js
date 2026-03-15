const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const puppeteer = require('puppeteer');
const router = express.Router();


// Utility middleware for validation handling
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// ---------------------------------------------------------
// Health & Diagnostic Routes
// ---------------------------------------------------------
router.get('/health', (req, res) => res.json({ success: true, message: 'API is online' }));

// Dashboard statistics for admin
router.get('/stats', async (req, res) => {
    try {
        const [studentsRes, yellowFilesRes, itLettersRes] = await Promise.all([
            db.query('SELECT COUNT(*) FROM students'),
            db.query("SELECT COUNT(*) FROM yellow_files WHERE status = 'pending'"),
            db.query("SELECT COUNT(*) FROM documents WHERE doc_type = 'it_letter'")
        ]);
        res.json({
            success: true,
            stats: {
                students: parseInt(studentsRes.rows[0].count),
                pendingYellowFiles: parseInt(yellowFilesRes.rows[0].count),
                itLetters: parseInt(itLettersRes.rows[0].count)
            }
        });
    } catch (err) {
        console.error('Stats Error:', err);
        res.status(500).json({ success: false, message: 'Could not fetch stats' });
    }
});

// Profile Update Endpoint for Students
router.post('/student-profile-v2', async (req, res) => {
    try {
        let { matric, department, name } = req.body;
        console.log('[API.JS] /student-profile-v2 HIT:', { matric, department, name });

        if (!matric) {
            return res.status(400).json({ success: false, message: 'Matriculation number is required' });
        }

        // Trim all inputs
        matric = matric.trim();
        if (name) name = name.trim();
        if (department) department = department.trim().toUpperCase();

        const result = await db.query(
            'UPDATE students SET department = COALESCE($1, department), name = COALESCE($2, name) WHERE UPPER(TRIM(matric_number)) = UPPER($3) RETURNING name, matric_number, department',
            [department, name, matric]
        );

        console.log('[API.JS] Update result rowCount:', result.rowCount);

        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: `No student found with matric: ${matric}. Check your login ID.`
            });
        }

        return res.json({ success: true, message: 'Profile updated successfully', user: result.rows[0] });
    } catch (err) {
        console.error('[API.JS] Profile Update Error:', err);
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// LEGACY Profile Update - Keep alive to avoid 404 for cached browsers
router.post('/students/profile-update', async (req, res) => {
    try {
        const { matric, department, name } = req.body;
        console.log('[DEBUG] Legacy Profile Update:', { matric, department, name });

        const result = await db.query(
            'UPDATE students SET department = COALESCE($1, department), name = COALESCE($2, name) WHERE matric_number = $3 RETURNING name, matric_number, department',
            [department, name, matric]
        );

        if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Matric number not found to update' });
        res.json({ success: true, message: 'Legacy profile update OK', user: result.rows[0] });
    } catch (err) {
        console.error('Legacy Profile Update Error:', err);
        return res.status(500).json({ success: false, message: 'Server error on legacy update' });
    }
});

// ---------------------------------------------------------
// Authentication Routes
// ---------------------------------------------------------

router.post(
    '/login',
    [
        body('username').trim().escape().notEmpty().withMessage('Username is required'),
        body('password').trim().escape().notEmpty().withMessage('Password is required'),
        body('role').isIn(['student', 'admin']).withMessage('Invalid role')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { username, password, role } = req.body;

            const userResult = await db.query(
                'SELECT id, username, role FROM users WHERE username = $1 AND password = $2 AND role = $3',
                [username, password, role]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const user = userResult.rows[0];

            if (role === 'student') {
                const studentResult = await db.query(
                    'SELECT name, matric_number, department FROM students WHERE user_id = $1',
                    [user.id]
                );
                return res.json({ success: true, user: { ...user, ...studentResult.rows[0] } });
            } else {
                return res.json({ success: true, user });
            }

        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
);

// ---------------------------------------------------------
// Document Routes
// ---------------------------------------------------------

router.get('/documents', async (req, res) => {
    try {
        const { matric } = req.query;
        let result;
        if (matric) {
            result = await db.query(
                "SELECT id, target_matric, doc_type, title, file_name, file_type, file_data, config_json, created_at FROM documents WHERE target_matric = 'ALL' OR target_matric = $1 ORDER BY created_at DESC",
                [matric]
            );
        } else {
            result = await db.query('SELECT id, target_matric, doc_type, title, file_name, file_type, file_data, config_json, created_at FROM documents ORDER BY created_at DESC');
        }

        res.json({ success: true, documents: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch documents' });
    }
});

router.post(
    '/documents',
    [
        body('targetMatric').trim().escape().notEmpty(),
        body('docType').trim().escape().notEmpty(),
        body('title').trim().escape().notEmpty(),
        body('fileName').trim().notEmpty(), // Intentionally skipping escape() for file names sometimes
        body('fileType').trim().escape().notEmpty()
        // base64 fileData omitted from validation for performance/size reasons
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { targetMatric, docType, title, fileName, fileType, fileData, configJson } = req.body;

            await db.query(
                'INSERT INTO documents (target_matric, doc_type, title, file_name, file_type, file_data, config_json) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [targetMatric, docType, title, fileName, fileType, fileData, configJson || null]
            );

            res.json({ success: true, message: 'Document uploaded and disbursed successfully!' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false, message: 'Failed to disburse document (Payload possibly too large)' });
        }
    }
);

// Delete Document/Memo Endpoint
// [NEW] Preview PDF logic for Admin Builder (Generate Test PDF without saving)
router.post('/documents/preview-pdf', async (req, res) => {
    try {
        const { fileData, configJson } = req.body;
        if (!fileData) return res.status(400).json({ success: false, message: 'Missing file data' });

        let config = {};
        try { config = JSON.parse(configJson || '{}'); } catch (e) {}

        // Mock student data for preview
        const student = {
            name: "SAMPSON BALOGUN EMMANUEL",
            matric_number: "21010211100",
            department: "COMPUTER SCIENCE"
        };

        const base64ImageURI = fileData;
        const namePx = parseFloat(config.nameX) || 20;
        const namePy = parseFloat(config.nameY) || 30;
        const matricPx = parseFloat(config.matricX) || 20;
        const matricPy = parseFloat(config.matricY) || 35;
        const name2Px = parseFloat(config.name2X) || 25;
        const name2Py = parseFloat(config.name2Y) || 55;
        const deptPx = parseFloat(config.deptX) || 55;
        const deptPy = parseFloat(config.deptY) || 57;

        // Individual Typography Settings
        const getFont = (f) => f || "'Times New Roman', serif";
        const getSize = (s) => parseInt(s) || 12; // Use standard points

        const name1Style = `font-family: ${getFont(config.nameFont)}; font-size: ${getSize(config.nameSize)}pt;`;
        const matricStyle = `font-family: ${getFont(config.matricFont)}; font-size: ${getSize(config.matricSize)}pt;`;
        const name2Style = `font-family: ${getFont(config.name2Font)}; font-size: ${getSize(config.name2Size)}pt;`;
        const deptStyle = `font-family: ${getFont(config.deptFont)}; font-size: ${getSize(config.deptSize)}pt;`;

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    @page { size: 210mm 297mm; margin: 0; }
                    body, html { margin: 0; padding: 0; width: 2480px; height: 3508px; overflow: hidden; }
                    .page-container {
                        position: relative;
                        width: 2480px;
                        height: 3508px;
                        background-image: url('${base64ImageURI}');
                        background-size: 100% 100%;
                        background-position: center;
                        background-repeat: no-repeat;
                    }
                    .text-overlay {
                        position: absolute;
                        font-weight: bold;
                        color: #000;
                        line-height: 1.0;
                        white-space: nowrap;
                    }
                </style>
            </head>
            <body>
                <div class="page-container">
                    <div class="text-overlay" style="left: ${namePx}%; top: ${namePy}%; font-family: ${getFont(config.nameFont)}; font-size: ${Math.round(getSize(config.nameSize) * 4.1666)}px;">${student.name}</div>
                    <div class="text-overlay" style="left: ${matricPx}%; top: ${matricPy}%; font-family: ${getFont(config.matricFont)}; font-size: ${Math.round(getSize(config.matricSize) * 4.1666)}px;">${student.matric_number}</div>
                    <div class="text-overlay" style="left: ${name2Px}%; top: ${name2Py}%; font-family: ${getFont(config.name2Font)}; font-size: ${Math.round(getSize(config.name2Size) * 4.1666)}px;">${student.name}</div>
                    <div class="text-overlay" style="left: ${deptPx}%; top: ${deptPy}%; font-family: ${getFont(config.deptFont)}; font-size: ${Math.round(getSize(config.deptSize) * 4.1666)}px;">${student.department}</div>
                </div>
            </body>
            </html>
        `;

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 2480, height: 3508 }); // 1:1 with container
        await page.setContent(htmlContent, { waitUntil: 'load' });
        const pdfBuffer = await page.pdf({ 
            width: '2480px',
            height: '3508px',
            printBackground: true, 
            margin: { top: '0', right: '0', bottom: '0', left: '0' } 
        });
        await browser.close();

        res.contentType("application/pdf");
        res.set('Content-Disposition', 'inline; filename="preview.pdf"'); // Enable in-browser viewing
        res.send(pdfBuffer);
    } catch (err) {
        console.error("Preview PDF error:", err);
        res.status(500).json({ success: false, message: 'Internal server error while generating preview' });
    }
});

router.delete('/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM documents WHERE id = $1 RETURNING id', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (err) {
        console.error('Delete Document Error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
});

// Generate PDF IT Letter Endpoint (Puppeteer)
router.get('/documents/:id/generate-pdf', async (req, res) => {
    try {
        const docId = req.params.id;
        const matric = req.query.matric;

        if (!matric) {
            return res.status(400).json({ success: false, message: 'Student metric number required' });
        }

        // 1. Fetch document template and config
        const docRes = await db.query('SELECT file_data, config_json FROM documents WHERE id = $1 AND doc_type = $2', [docId, 'it_letter']);
        if (docRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Template not found' });
        }

        const doc = docRes.rows[0];
        let config = {};
        try {
            if (doc.config_json) config = JSON.parse(doc.config_json);
        } catch (e) {
            console.error("Config parse error:", e);
        }

        // 2. Fetch student details (including newly added department)
        const studentRes = await db.query('SELECT name, matric_number, department FROM students WHERE matric_number = $1', [matric]);
        if (studentRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        const student = studentRes.rows[0];

        // 3. Prepare dimensions and text coordinates
        const base64ImageURI = doc.file_data;

        // Default to percentage coordinates if available
        const namePx = parseFloat(config.nameX) || 20;
        const namePy = parseFloat(config.nameY) || 30;
        const matricPx = parseFloat(config.matricX) || 20;
        const matricPy = parseFloat(config.matricY) || 35;
        const name2Px = parseFloat(config.name2X) || 25;
        const name2Py = parseFloat(config.name2Y) || 55;
        const deptPx = parseFloat(config.deptX) || 55;
        const deptPy = parseFloat(config.deptY) || 57;

        // Individual Typography Settings
        const getFont = (f) => f || "'Times New Roman', serif";
        const getSize = (s) => parseInt(s) || 12; // Use standard points

        const name1Style = `font-family: ${getFont(config.nameFont)}; font-size: ${getSize(config.nameSize)}pt;`;
        const matricStyle = `font-family: ${getFont(config.matricFont)}; font-size: ${getSize(config.matricSize)}pt;`;
        const name2Style = `font-family: ${getFont(config.name2Font)}; font-size: ${getSize(config.name2Size)}pt;`;
        const deptStyle = `font-family: ${getFont(config.deptFont)}; font-size: ${getSize(config.deptSize)}pt;`;

        // 4. Construct HTML Template for Puppeteer (Standardized for A4)
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    @page { 
                        size: A4; 
                        margin: 0; 
                    }
                    body, html { 
                        margin: 0; 
                        padding: 0; 
                        width: 210mm; 
                        height: 297mm; 
                        overflow: hidden;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .page-container {
                        position: relative;
                        width: 210mm;
                        height: 297mm;
                        background-image: url('${base64ImageURI}');
                        background-size: 100% 100%;
                        background-position: center;
                        background-repeat: no-repeat;
                    }
                    .text-overlay {
                        position: absolute;
                        font-weight: bold;
                        color: #000;
                        line-height: 1.0;
                        white-space: nowrap;
                        /* Anchor points remain percentages for responsiveness, but now mapping to MM scale */
                    }
                </style>
            </head>
            <body>
                <div class="page-container">
                    <div class="text-overlay" style="left: ${namePx}%; top: ${namePy}%; font-family: ${getFont(config.nameFont)}; font-size: ${getSize(config.nameSize)}pt;">${student.name.toUpperCase()}</div>
                    <div class="text-overlay" style="left: ${matricPx}%; top: ${matricPy}%; font-family: ${getFont(config.matricFont)}; font-size: ${getSize(config.matricSize)}pt;">${student.matric_number}</div>
                    <div class="text-overlay" style="left: ${name2Px}%; top: ${name2Py}%; font-family: ${getFont(config.name2Font)}; font-size: ${getSize(config.name2Size)}pt;">${student.name.toUpperCase()}</div>
                    <div class="text-overlay" style="left: ${deptPx}%; top: ${deptPy}%; font-family: ${getFont(config.deptFont)}; font-size: ${getSize(config.deptSize)}pt;">${(student.department || 'COMPUTER SCIENCE').toUpperCase()}</div>
                </div>
            </body>
            </html>
        `;

        // 5. Generate PDF using Puppeteer
        const browser = await puppeteer.launch({
            // On Render/Linux, we don't specify executablePath; it uses the build-installed browser.
            // On Windows, it will find the local Chrome/Chromium installation automatically if installed.
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();

        // 6. Return PDF Buffer
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'inline; filename="IT_Letter.pdf"'); // Changed to inline for student preview
        res.send(pdfBuffer);

    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ success: false, message: 'Failed to generate personalized PDF letter' });
    }
});

// ---------------------------------------------------------
// Yellow Files Student Uploads & Admin Review
// ---------------------------------------------------------

router.get('/yellow-files', async (req, res) => {
    try {
        // Fetch all pending yellow files
        const result = await db.query(`
            SELECT yf.id, yf.status, yf.submitted_at, yf.level, yf.documents_json, s.matric_number, s.name as student_name
            FROM yellow_files yf
            JOIN students s ON yf.student_id = s.id
            WHERE yf.status = 'pending'
            ORDER BY yf.submitted_at DESC
        `);
        res.json({ success: true, yellowFiles: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch yellow files' });
    }
});

router.patch(
    '/yellow-files/:id',
    [
        body('status').isIn(['accepted', 'rejected']).withMessage('Invalid status update')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            // Update the status in the database
            const updateResult = await db.query(
                'UPDATE yellow_files SET status = $1 WHERE id = $2 RETURNING student_id, level',
                [status, id]
            );

            if (updateResult.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Yellow File bundle not found' });
            }

            const { student_id, level } = updateResult.rows[0];

            // Fetch the matric number to send them a direct system message in their documents folder
            const matricResult = await db.query('SELECT matric_number FROM students WHERE id = $1', [student_id]);
            const matricNumber = matricResult.rows[0].matric_number;

            // Generate an automated system memo in their inbox so they are notified
            const title = status === 'accepted' ? `${level} Yellow File Accepted` : `${level} Yellow File REJECTED`;

            // We use a blank space for file data so it acts as a permanent Chat Message/Notification instead of a downloadable file
            await db.query(
                'INSERT INTO documents (target_matric, doc_type, title, file_name, file_type, file_data) VALUES ($1, $2, $3, $4, $5, $6)',
                [
                    matricNumber,
                    'system',
                    title,
                    status === 'accepted' ? 'Your uploads have been verified and accepted by the Admin office.' : 'Your uploads were rejected by the Admin office due to invalid documents. Please carefully review the requirements and submit again.',
                    'text/plain',
                    'SYSTEM_NOTIFICATION_ONLY'
                ]
            );

            res.json({ success: true, message: `Bundle marked as ${status} successfully` });
        } catch (err) {
            console.error('Update Error:', err);
            res.status(500).json({ success: false, message: 'Failed to update yellow file status' });
        }
    }
);



router.post('/yellow-files', async (req, res) => {
    try {
        const { matric, level, documents } = req.body;

        // Look up student_id from matric
        const studentResult = await db.query('SELECT id FROM students WHERE matric_number = $1', [matric]);
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const studentId = studentResult.rows[0].id;
        const docJsonString = JSON.stringify(documents);

        await db.query(
            'INSERT INTO yellow_files (student_id, level, documents_json, status) VALUES ($1, $2, $3, $4)',
            [studentId, level, docJsonString, 'pending']
        );
        res.json({ success: true, message: 'Yellow File bundle submitted successfully!' });
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ success: false, message: 'Failed to submit yellow file' });
    }
});

// ---------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------

router.get('/stats', async (req, res) => {
    try {
        const studentCountResult = await db.query('SELECT COUNT(*) FROM students');
        const itLettersResult = await db.query("SELECT COUNT(*) FROM documents WHERE doc_type = 'it_letter'");
        // Yellow files isn't fully implemented in DB as a separate table upload yet, but we have a basic table for it
        const yellowFilesResult = await db.query("SELECT COUNT(*) FROM yellow_files WHERE status = 'pending'");

        res.json({
            success: true,
            stats: {
                students: parseInt(studentCountResult.rows[0].count),
                itLetters: parseInt(itLettersResult.rows[0].count),
                pendingYellowFiles: parseInt(yellowFilesResult.rows[0].count)
            }
        });
    } catch (err) {
        console.error('Stats Error:', err);
        res.status(500).json({ success: false, message: 'Failed to load stats' });
    }
});

// Helper to determine if a document is an IT Letter Template
const isTemplate = (doc) => doc.doc_type === 'Memo' && (doc.title.toUpperCase().includes('IT') || doc.title.toUpperCase().includes('PLACEMENT'));

// [NEW] Serve template image directly for HTML previews
router.get('/documents/:id/template-image', async (req, res) => {
    try {
        const result = await db.query('SELECT file_data, file_type FROM documents WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).send('Document not found');
        
        const doc = result.rows[0];
        let fileData = doc.file_data;

        // If it's a base64 URI, strip the prefix
        if (fileData.startsWith('data:')) {
            const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                fileData = matches[2];
            }
        }

        const imgBuffer = Buffer.from(fileData, 'base64');
        res.setHeader('Content-Type', doc.file_type || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.send(imgBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
