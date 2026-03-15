const http = require('http');

function get(path) {
    return new Promise(resolve => {
        http.get(`http://localhost:3000${path}`, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body: b.substring(0, 150) }));
        }).on('error', e => resolve({ status: 'ERR', body: e.message }));
    });
}

async function runTests() {
    const tests = [
        '/ping',
        '/api/health',
        '/api/stats',
        '/api/documents',
        '/api/yellow-files',
        '/api/documents?matric=24014131078'
    ];
    
    console.log('=== API Health Check ===\n');
    for (const path of tests) {
        const r = await get(path);
        const ok = r.status === 200 ? '✅' : '❌';
        const json = r.type?.includes('json') ? '' : ' [NOT JSON!]';
        console.log(`${ok} ${path} -> ${r.status}${json}`);
        if (r.status !== 200) console.log(`   Body: ${r.body}`);
    }
    
    console.log('\n=== Database Schema Check ===\n');
    const db = require('./backend/db');
    
    try {
        const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
        console.log('Tables:', tables.rows.map(r => r.tablename).join(', '));
        
        const yfCols = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'yellow_files'");
        console.log('yellow_files columns:', yfCols.rows.map(r => r.column_name).join(', '));
    } catch(e) {
        console.error('DB Error:', e.message);
    }
    
    process.exit(0);
}
runTests();
