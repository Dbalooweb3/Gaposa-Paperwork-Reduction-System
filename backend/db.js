const { Pool } = require('pg');

// Initialize the database connection pool using either a Cloud Connection String (DATABASE_URL) or Local credentials
const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: { 
                rejectUnauthorized: false // Required for Render/Supabase
            },
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        }
        : {
            user: 'postgres',
            host: 'localhost',
            database: 'gaposa_paperwork',
            password: 'Gaposa1@#',
            port: 5432,
        }
);

// A helper function to execute queries safely.
// By strictly passing parameterized values (e.g., $1, $2), we prevent SQL Injection.
const query = async (text, params) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
};

module.exports = {
    query,
    pool
};
