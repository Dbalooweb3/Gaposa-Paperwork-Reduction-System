const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const apiRoutes = require('./routes/api');
const db = require('./db'); 

const app = express();
const PORT = process.env.PORT || 3000;

// 0. LOGGING MIDDLEWARE (Debug)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 1. GLOBAL SECURITY MIDDLEWARE
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:", "*"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'", "*"],
            frameSrc: ["'self'", "data:", "blob:"],
            objectSrc: ["'self'", "data:", "blob:"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

// Use CORS for all routes
app.use(cors({
    origin: '*',
    credentials: true
}));

// Parse incoming JSON and URL-encoded bodies (increased limit to 50mb for base64 file uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Parse Cookie header and populate req.cookies
app.use(cookieParser());

// ==========================================
// 2. CSRF PROTECTION (Temporarily Disabled for Demo)
// ==========================================

// To keep the frontend connection simple for this phase, CSRF is disabled.
// In a real production app, uncomment this block and implement token fetching.
/*
const csrfProtection = csurf({ cookie: true });
app.use(csrfProtection);

app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});
*/

// ==========================================
// 3. API ROUTING & STATIC FILES
// ==========================================

// --- DEBUG & FAIL-SAFE ROUTES ---
// --- DEBUG & FAIL-SAFE ROUTES ---
app.get('/ping', (req, res) => res.json({ 
    success: true, 
    message: 'GAPOSA ROOT REACHED', 
    v: '2.4-ULTRA', 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
}));

// Direct Profile Update (Bypass router for debugging)
app.post('/api/student-profile-v2', async (req, res) => {
    try {
        let { matric, department, name } = req.body;
        console.log('[ULTRA-DEBUG] Profile Update Request:', { matric, department, name });
        
        if (!matric) return res.status(400).json({ success: false, message: 'Matric number is required in the request body.' });
        
        // Clean data: Trim and Upper for matric, Trim for others
        matric = matric.trim();
        if (name) name = name.trim();
        if (department) department = department.trim();

        const result = await db.query(
            'UPDATE students SET department = COALESCE($1, department), name = COALESCE($2, name) WHERE UPPER(TRIM(matric_number)) = UPPER($3) RETURNING name, matric_number, department',
            [department, name, matric]
        );

        if (result.rowCount === 0) {
            console.warn(`[WARN] No student found matching matric: [${matric}]`);
            return res.status(404).json({ 
                success: false, 
                message: `Student with matric '${matric}' not found in database.`,
                hint: "Check if the matric number matches exactly with your login ID."
            });
        }

        res.json({ success: true, message: 'Profile updated successfully (v2.4)', user: result.rows[0] });
    } catch (err) {
        console.error('SERVER.JS ULTRA ERROR:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error: ' + err.message });
    }
});

// --- SYSTEM SYNC (For Render Free Tier) ---
// --- SYSTEM SYNC (For Render Free Tier) ---
app.get('/api/system-sync', async (req, res) => {
    try {
        console.log('[SYS] Full System Initialization Triggered...');
        
        // 1. Create Tables if they don't exist
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student'
            );

            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                name TEXT NOT NULL,
                matric_number TEXT UNIQUE NOT NULL,
                department TEXT DEFAULT 'NOT SET'
            );

            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                target_matric TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                title TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_data TEXT NOT NULL,
                config_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS yellow_files (
                id SERIAL PRIMARY KEY,
                student_id INTEGER REFERENCES students(id),
                status TEXT DEFAULT 'pending',
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                level TEXT,
                documents_json TEXT
            );
        `);

        // 2. Add/Update Default Admin
        await db.query(`
            INSERT INTO users (username, password, role)
            VALUES ('admin', 'admin123', 'admin')
            ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password
        `);

        // 3. Sync Students from JSON
        const fs = require('fs');
        const path = require('path');
        const studentsPath = path.join(__dirname, '../students-list.json');
        
        let addedCount = 0;
        if (fs.existsSync(studentsPath)) {
            const studentsData = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
            for (const s of studentsData) {
                // Determine a safe username and password
                const username = (s.matricNumber || '').trim();
                if (!username) continue; // Skip if no matric number

                // Derive password from last name or use matric number as fallback
                const nameParts = s.name.trim().split(' ');
                const defaultPassword = s.password || nameParts[nameParts.length - 1].toLowerCase() || username;
                const department = s.department || 'NOT SET';

                const userRes = await db.query(`
                    INSERT INTO users (username, password, role)
                    VALUES ($1, $2, 'student')
                    ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password
                    RETURNING id
                `, [username, defaultPassword]);
                
                const userId = userRes.rows[0].id;

                await db.query(`
                    INSERT INTO students (user_id, name, matric_number, department)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (matric_number) DO UPDATE 
                    SET name = EXCLUDED.name, department = EXCLUDED.department, user_id = EXCLUDED.user_id
                `, [userId, s.name.trim(), username, department]);
                addedCount++;
            }
        }

        res.json({ 
            success: true, 
            message: 'System initialization complete!',
            summary: {
                tables_created: ['users', 'students', 'documents', 'yellow_files'],
                admin_account: 'Ready (Username: admin)',
                students_synced: addedCount
            },
            instruction: 'The system is now fully operational!'
        });
    } catch (err) {
        console.error('Initialization Error:', err);
        res.status(500).json({ success: false, message: 'Initialization failed: ' + err.message });
    }
});

app.use('/api', apiRoutes);

// Serve static frontend files from the public directory
const path = require('path');
app.use(express.static(path.join(__dirname, '../public'), {
    setHeaders: (res, path) => {
        // Prevent aggressive browser caching during development so you always see latest code
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
}));

// Catch-all for undefined routes - RETURN JSON, NOT HTML
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: `Route ${req.method} ${req.url} not found on this server.`,
        hint: "Verify that you have restarted the server after updates."
    });
});

// ==========================================
// 4. GLOBAL ERROR HANDLER
// ==========================================

// Handle CSRF token errors specifically
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: Invalid or missing CSRF token. The request may be a forgery attempt.'
        });
    }
    // Log other errors to the console
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`[SECURE NODE BACKEND] v2.4-ULTRA - Server running on http://localhost:${PORT}`);
    console.log('✅ Helmet/CORS Active');
    console.log('✅ Port 3000 Listening');
});
