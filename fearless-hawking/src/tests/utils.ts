import { audio } from '../utils/audio';

/**
 * Click simulator. Accepts either a CSS selector string or an HTMLElement.
 */
export function click(elementOrSelector: string | HTMLElement): void {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector) as HTMLElement
    : elementOrSelector;

  if (!element) {
    throw new Error(`Element not found: ${elementOrSelector}`);
  }

  // Simulate mouse click event lifecycle
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
  element.focus();
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
}

/**
 * Type text simulator. Simulates typing a sequence of characters into a form input/textarea,
 * or dispatches keyboard events globally if the element is not an input.
 */
export function typeText(elementOrSelector: string | HTMLElement, text: string): void {
  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector) as HTMLElement
    : elementOrSelector;

  if (!element) {
    throw new Error(`Element not found: ${elementOrSelector}`);
  }

  element.focus();

  const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';

  if (isInput) {
    const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const key = char;
      const keyCode = char.charCodeAt(0);

      inputElement.dispatchEvent(new KeyboardEvent('keydown', {
        key,
        keyCode,
        bubbles: true,
        cancelable: true
      }));

      // Update selection/value
      const start = inputElement.selectionStart ?? inputElement.value.length;
      const end = inputElement.selectionEnd ?? inputElement.value.length;
      const currentValue = inputElement.value;
      inputElement.value = currentValue.slice(0, start) + char + currentValue.slice(end);
      inputElement.selectionStart = inputElement.selectionEnd = start + 1;

      // React listens to input events to trigger changes
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));

      inputElement.dispatchEvent(new KeyboardEvent('keyup', {
        key,
        keyCode,
        bubbles: true,
        cancelable: true
      }));
    }
  } else {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const keyCode = char.charCodeAt(0);

      element.dispatchEvent(new KeyboardEvent('keydown', {
        key: char,
        keyCode,
        bubbles: true,
        cancelable: true
      }));
      element.dispatchEvent(new KeyboardEvent('keypress', {
        key: char,
        keyCode,
        bubbles: true,
        cancelable: true
      }));
      element.dispatchEvent(new KeyboardEvent('keyup', {
        key: char,
        keyCode,
        bubbles: true,
        cancelable: true
      }));
    }
  }
}

/**
 * Press key simulator. Dispatches a keyboard event sequence on the currently active element (or body).
 */
export function pressKey(key: string, options?: KeyboardEventInit): void {
  const target = document.activeElement || document.body;
  const eventInit: KeyboardEventInit = {
    key,
    bubbles: true,
    cancelable: true,
    ...options
  };

  target.dispatchEvent(new KeyboardEvent('keydown', eventInit));
  target.dispatchEvent(new KeyboardEvent('keypress', eventInit));
  target.dispatchEvent(new KeyboardEvent('keyup', eventInit));
}

/**
 * Wait for a predicate to become true, checking periodically until timeout.
 */
export async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000
): Promise<void> {
  const startTime = Date.now();
  while (true) {
    if (await predicate()) {
      return;
    }
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for predicate after ${timeoutMs}ms`);
    }
    await wait(50);
  }
}

/**
 * Delay execution for a specified duration in milliseconds.
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Interface for the Audio Mocking Spy
 */
export interface AudioSpy {
  playClickCount: number;
  playScoreCount: number;
  playMergeCount: number;
  playWinCount: number;
  playLoseCount: number;
  restore: () => void;
}

/**
 * Stub/spy for tracking audio play counts.
 */
export function mockAudio(): AudioSpy {
  const originalPlayClick = audio.playClick;
  const originalPlayScore = audio.playScore;
  const originalPlayMerge = audio.playMerge;
  const originalPlayWin = audio.playWin;
  const originalPlayLose = audio.playLose;

  const spy: AudioSpy = {
    playClickCount: 0,
    playScoreCount: 0,
    playMergeCount: 0,
    playWinCount: 0,
    playLoseCount: 0,
    restore() {
      audio.playClick = originalPlayClick;
      audio.playScore = originalPlayScore;
      audio.playMerge = originalPlayMerge;
      audio.playWin = originalPlayWin;
      audio.playLose = originalPlayLose;
    }
  };

  audio.playClick = () => { spy.playClickCount++; };
  audio.playScore = () => { spy.playScoreCount++; };
  audio.playMerge = () => { spy.playMergeCount++; };
  audio.playWin = () => { spy.playWinCount++; };
  audio.playLose = () => { spy.playLoseCount++; };

  return spy;
}

/**
 * LocalStorage reset helper.
 */
export function resetLocalStorage(): void {
  localStorage.removeItem('mono_games_theme');
  localStorage.removeItem('mono_games_crt');
  localStorage.removeItem('mono_games_scores');
  localStorage.removeItem('mono_games_muted');
  localStorage.clear();
}
