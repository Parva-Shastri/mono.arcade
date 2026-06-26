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
  server.stdout.on('data', (data) => {
    const str = data.toString();
    console.log(`[SERVER] ${str.trim()}`);
    if (str.includes('http://')) {
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

  console.log('Vite preview server is running. Launching Puppeteer...');
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    console.log('Navigating to http://localhost:4173/test?run=true...');
    await page.goto('http://localhost:4173/test?run=true', { waitUntil: 'load' });

    console.log('Waiting for test execution to finish...');
    
    let results = null;
    for (let i = 0; i < 120; i++) { // max 60 seconds
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
      process.exit(1);
    }

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
      process.exit(1);
    } else {
      console.log('\nAll tests passed successfully!');
      process.exit(0);
    }
  } catch (err) {
    console.error('Error during test execution:', err);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Stopping preview server...');
    server.kill();
  }
}

run();
