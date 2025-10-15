// Debug script to catch scroll triggers during chapter transitions
// Paste this in browser console while reading Yellow Wallpaper

(function() {
  console.log('🔍 Starting scroll debugging for Yellow Wallpaper...');

  // Wrap window.scrollTo
  const originalScrollTo = window.scrollTo;
  window.scrollTo = function(...args) {
    console.error('🚨 SCROLL DETECTED - window.scrollTo called:', args);
    console.trace('Call stack:');
    return originalScrollTo.apply(this, args);
  };

  // Wrap Element.prototype.scrollIntoView
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function(...args) {
    console.error('🚨 SCROLL DETECTED - scrollIntoView called on:', this, args);
    console.trace('Call stack:');
    return originalScrollIntoView.apply(this, args);
  };

  // Monitor hash changes
  window.addEventListener('hashchange', (e) => {
    console.error('🚨 HASH CHANGE DETECTED:', e.newURL, e.oldURL);
    console.trace('Call stack:');
  });

  // Monitor focus events that might trigger scrolling
  document.addEventListener('focus', (e) => {
    if (e.target && e.target !== document.body) {
      console.warn('🔍 FOCUS EVENT:', e.target);
    }
  }, true);

  // Monitor VirtualizedReader scroll events specifically
  const virtualizedElements = document.querySelectorAll('[data-virtualized]');
  virtualizedElements.forEach(el => {
    console.log('📱 Found virtualized element:', el);
  });

  console.log('✅ Scroll debugging active!');
  console.log('📋 Instructions:');
  console.log('1. Scroll down through Chapter 1');
  console.log('2. When you reach the chapter transition, watch for 🚨 messages');
  console.log('3. The stack trace will show what triggered the jump');
})();