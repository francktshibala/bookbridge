// Simple test to check what the subscription hook is returning
const { SUBSCRIPTION_LIMITS } = require('./types/subscription.ts');

console.log('SUBSCRIPTION_LIMITS:', SUBSCRIPTION_LIMITS);

// Simulate the calculation
const tier = 'free';
const limits = SUBSCRIPTION_LIMITS[tier];
const mockUsage = { book_analyses_count: 0 };

let remainingAnalyses = limits.monthlyBookLimit;
if (tier === 'free' && mockUsage) {
  remainingAnalyses = Math.max(0, limits.monthlyBookLimit - mockUsage.book_analyses_count);
}

console.log('Calculated remaining analyses:', remainingAnalyses);
console.log('Should show:', `${remainingAnalyses} book${remainingAnalyses === 1 ? '' : 's'} left`);