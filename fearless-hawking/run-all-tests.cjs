const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

async function main() {
  console.log('Starting Vite development server...');
  const viteProcess = spawn('npx', ['vite', '--port', '5173'], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverStarted = false;
  
  // Wait for the server to boot
  const serverTimeout = setTimeout(() => {
    console.error('Timeout waiting for Vite server to start.');
    viteProcess.kill();
    process.exit(1);
  }, 10000);

  viteProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Vite stdout] ${output.trim()}`);
    if (output.includes('Local:') || output.includes('http://localhost:5173')) {
      serverStarted = true;
      clearTimeout(serverTimeout);
      runTests();
    }
  });

  viteProcess.stderr.on('data', (data) => {
    console.error(`[Vite stderr] ${data.toString()}`);
  });

  async function runTests() {
    console.log('Vite server started. Launching Chrome...');
    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      console.log('Navigating to test runner...');
      await page.goto('http://localhost:5173/test?run=true', { waitUntil: 'networkidle0' });

      console.log('Running tests, polling for results...');
      
      let results = null;
      for (let attempt = 0; attempt < 240; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        results = await page.evaluate(() => window.testResults);
        if (results) {
          break;
        }
      }

      if (!results) {
        throw new Error('Timeout waiting for test results.');
      }

      console.log('\n================ TEST RESULTS ================');
      let failed = 0;
      results.forEach(res => {
        const statusIcon = res.status === 'passed' ? '✅' : '❌';
        if (res.status !== 'passed') {
          failed++;
          console.log(`${statusIcon} [${res.status.toUpperCase()}] ${res.id}`);
          console.log(`   Error: ${res.error}`);
          console.log(`   Logs: \n${res.logs.map(l => '      ' + l).join('\n')}`);
        } else {
          console.log(`${statusIcon} [${res.status.toUpperCase()}] ${res.id}`);
        }
      });
      console.log('==============================================');
      console.log(`Total: ${results.length} | Passed: ${results.length - failed} | Failed: ${failed}`);

      if (failed > 0) {
        process.exitCode = 1;
      } else {
        console.log('All tests passed successfully!');
        process.exitCode = 0;
      }
    } catch (err) {
      console.error('Error during test execution:', err);
      process.exitCode = 1;
    } finally {
      if (browser) {
        await browser.close();
      }
      console.log('Stopping Vite server...');
      viteProcess.kill('SIGINT');
      setTimeout(() => {
        process.exit();
      }, 500);
    }
  }
}

main().catch(err => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});
