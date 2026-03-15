const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log('Launching browser to test dashboard quick actions...');
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
        page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

        // Mock localStorage so we don't get kicked out to index.html immediately
        await page.evaluateOnNewDocument(() => {
            localStorage.setItem('userType', 'student');
            localStorage.setItem('studentName', 'Test Student');
            localStorage.setItem('matricNumber', '24014131078');
        });

        console.log('Navigating to http://localhost:3000/dashboard.html ...');
        await page.goto('http://localhost:3000/dashboard.html');

        console.log('Waiting for load...');
        await page.waitForTimeout(2000);

        console.log('Clicking "Submit Yellow File" Quick Action...');
        await page.evaluate(() => {
            openYellowFileModal();
        });

        console.log('Clicking "Get IT Letter" Quick Action...');
        await page.evaluate(() => {
            sendQuickMessage('I need my IT Letter');
        });

        await page.waitForTimeout(1000);
        console.log('Test complete.');
        await browser.close();
    } catch (e) {
        console.error('PUPPETEER EXCEPTION:', e.message);
    }
})();
