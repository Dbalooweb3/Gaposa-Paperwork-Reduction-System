const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
        page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
        page.on('requestfailed', request => console.log('NETWORK FAILED:', request.url(), request.failure().errorText));

        console.log('Navigating to http://localhost:3000/ ...');
        await page.goto('http://localhost:3000/');

        console.log('Filling out Student Login form...');
        await page.type('#setUsername', '24014131078');
        await page.type('#setPassword', 'akanbi');

        console.log('Clicking login...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => console.log('No navigation happened')),
            page.click('.login-btn')
        ]);

        console.log('Final URL:', page.url());
        if (page.url().includes('dashboard.html')) {
            console.log('SUCCESS! Redirected to dashboard.');
        } else {
            console.log('FAILED! Still on index.html.');
            // check alert or local storage
            const ls = await page.evaluate(() => JSON.stringify(localStorage));
            console.log('LocalStorage:', ls);
        }

        await browser.close();
    } catch (e) {
        console.error('PUPPETEER ERROR:', e);
    }
})();
