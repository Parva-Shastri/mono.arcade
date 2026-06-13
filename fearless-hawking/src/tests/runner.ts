export type TestTier = 1 | 2 | 3 | 4;

export interface TestCase {
  id: string;                // e.g. "minesweeper-t1-launch"
  name: string;              // e.g. "Verify Minesweeper mounts with correct grid size"
  tier: TestTier;            // 1 | 2 | 3 | 4
  game: string;              // e.g. "minesweeper" or "system" (for cross-feature)
  run: () => Promise<void>;  // Async execution function. Fails by throwing an Error
}

export interface TestResult {
  id: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  durationMs?: number;
  error?: string;
  logs: string[];
}

export const testRegistry: TestCase[] = [];

/**
 * Register a test case with the central test registry.
 */
export function registerTest(testCase: TestCase): void {
  // Avoid duplicate registrations
  if (!testRegistry.some(t => t.id === testCase.id)) {
    testRegistry.push(testCase);
  }
}

/**
 * Execution framework with logging interceptor.
 * Executes the list of test cases sequentially.
 */
export async function runTests(
  tests: TestCase[],
  onProgress?: (currentResult: TestResult, allResults: TestResult[]) => void
): Promise<TestResult[]> {
  const results: TestResult[] = tests.map(t => ({
    id: t.id,
    status: 'pending',
    logs: []
  }));

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const result = results.find(r => r.id === test.id)!;
    result.status = 'running';
    onProgress?.(result, results);

    const startTime = performance.now();
    const logs: string[] = [];

    // Intercept standard console methods
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleInfo = console.info;

    const intercept = (prefix: string, ...args: any[]) => {
      const msg = args.map(arg => {
        if (arg instanceof Error) {
          return arg.stack || arg.message;
        }
        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
      }).join(' ');
      logs.push(`${prefix} ${msg}`);
    };

    console.log = (...args: any[]) => {
      intercept('[LOG]', ...args);
      originalConsoleLog.apply(console, args);
    };
    console.warn = (...args: any[]) => {
      intercept('[WARN]', ...args);
      originalConsoleWarn.apply(console, args);
    };
    console.error = (...args: any[]) => {
      intercept('[ERROR]', ...args);
      originalConsoleError.apply(console, args);
    };
    console.info = (...args: any[]) => {
      intercept('[INFO]', ...args);
      originalConsoleInfo.apply(console, args);
    };

    try {
      logs.push(`Starting test: ${test.name} (${test.id})`);
      await test.run();
      result.status = 'passed';
      logs.push(`Test passed: ${test.id}`);
    } catch (err: any) {
      result.status = 'failed';
      result.error = err instanceof Error ? err.stack || err.message : String(err);
      logs.push(`Test failed: ${test.id}. Error: ${result.error}`);
    } finally {
      // Restore console methods immediately
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
      console.info = originalConsoleInfo;

      result.durationMs = performance.now() - startTime;
      result.logs = logs;
      onProgress?.(result, results);
    }
  }

  return results;
}

// Declare global window properties for automated test results delivery
declare global {
  interface Window {
    testResults?: TestResult[];
  }
}

// Note: Eager loading of test cases has been moved to TestRunner.tsx
// to prevent circular dependency TDZ (Temporal Dead Zone) reference errors.

