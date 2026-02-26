import puppeteer from 'puppeteer';

(async () => {
    console.log("Launching playwright/puppeteer...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
        } else {
            console.log('BROWSER LOG:', msg.text());
        }
    });

    page.on('pageerror', err => {
        console.log('PAGE ERROR STR:', err.toString());
    });

    try {
        console.log("Navigating to http://localhost:4173 ...");
        await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout: 10000 });
        console.log("Navigation complete. Waiting a bit for React to mount...");
        await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
        console.log("Navigation failed:", e);
    }

    await browser.close();
})();
