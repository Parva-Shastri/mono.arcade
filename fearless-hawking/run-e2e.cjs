const { spawn } = require('child_process');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

function findChrome() {
  for (const path of CHROME_PATHS) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  return null;
}

async function run() {
  const chromePath = findChrome();
  if (!chromePath) {
    console.error('Could not find Google Chrome or Chromium in standard macOS locations.');
    process.exit(1);
  }
  console.log(`Using Chrome binary at: ${chromePath}`);

  console.log('Starting preview server...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    stdio: 'pipe',
    shell: true
  });

  let serverStarted = false;
  let serverUrl = 'http://localhost:4173/';
  server.stdout.on('data', (data) => {
    const str = data.toString();
    console.log(`[SERVER] ${str.trim()}`);
    if (str.includes('http://')) {
      const match = str.match(/http:\/\/[^\s]+/);
      if (match) {
        serverUrl = match[0].trim();
        // Remove trailing slash if present
        if (serverUrl.endsWith('/')) {
          serverUrl = serverUrl.slice(0, -1);
        }
      }
      serverStarted = true;
    }
  });

  server.stderr.on('data', (data) => {
    console.error(`[SERVER ERR] ${data.toString().trim()}`);
  });

  // Wait up to 5 seconds for server to start
  for (let i = 0; i < 50; i++) {
    if (serverStarted) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (!serverStarted) {
    console.error('Failed to start vite preview server.');
    server.kill();
    process.exit(1);
  }

  let browser;
  let exitCode = 0;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log(`[BROWSER LOG] ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.toString()}`));
    console.log(`Navigating to ${serverUrl}/test?run=true...`);
    await page.goto(`${serverUrl}/test?run=true`, { waitUntil: 'load' });

    console.log('Waiting for test execution to finish...');
    
    let results = null;
    for (let i = 0; i < 600; i++) { // max 300 seconds
      results = await page.evaluate(() => {
        if (!window.testResults) return null;
        const unfinished = window.testResults.some(r => r.status === 'pending' || r.status === 'running');
        if (unfinished) return null;
        return window.testResults;
      });
      if (results) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!results) {
      console.error('Timeout waiting for test results.');
      const partialResults = await page.evaluate(() => window.testResults);
      console.log('Partial results:', partialResults);
      exitCode = 1;
    } else {
      console.log('\n--- E2E TEST RESULTS ---');
      let passedCount = 0;
      let failedCount = 0;
      const failures = [];

      for (const r of results) {
        if (r.status === 'passed') {
          passedCount++;
          console.log(`[PASS] ${r.id} (${r.durationMs ? r.durationMs.toFixed(1) : 0}ms)`);
        } else {
          failedCount++;
          console.log(`[FAIL] ${r.id}: ${r.error}`);
          failures.push(r);
        }
      }

      console.log(`\nSummary: ${passedCount} passed, ${failedCount} failed, ${results.length} total.`);

      if (failedCount > 0) {
        console.error('\nThe following tests failed:');
        for (const f of failures) {
          console.error(`- ${f.id}: ${f.error}`);
          if (f.logs && f.logs.length > 0) {
            console.error('  Logs:');
            f.logs.forEach(l => console.error(`    ${l}`));
          }
        }
        exitCode = 1;
      } else {
        console.log('\nAll tests passed successfully!');
        exitCode = 0;
      }
    }
  } catch (err) {
    console.error('Error during test execution:', err);
    exitCode = 1;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
    console.log('Stopping preview server...');
    try {
      server.kill();
    } catch (e) {
      console.error('Error killing server:', e);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    process.exit(exitCode);
  }
}

run();
