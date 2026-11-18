import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Polyfill ResizeObserver for JSDOM
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}
