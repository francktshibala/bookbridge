'use client';

import { useState, useEffect } from 'react';
import { IOSSubscriptionService } from '@/lib/ios-subscription';
import { isIOS, shouldShowApplePurchase } from '@/lib/platform-utils';

export default function TestIAPPage() {
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsIOSDevice(shouldShowApplePurchase());
  }, []);

  const testGetProducts = async () => {
    if (!isIOSDevice) {
      setMessage('Error: This test only works on iOS devices. Open in iOS Simulator.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await IOSSubscriptionService.getProductDetails('bookbridge_premium_access');
      setMessage(`Product Details: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testPurchase = async () => {
    if (!isIOSDevice) {
      setMessage('Error: This test only works on iOS devices. Open in iOS Simulator.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Use test user ID
      const result = await IOSSubscriptionService.purchaseSubscription(
        'bookbridge_premium_access',
        'test-user-123'
      );

      if (result.success) {
        setMessage(`Purchase successful! Transaction ID: ${result.transactionId}`);
      } else {
        setMessage(`Purchase failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testRestore = async () => {
    if (!isIOSDevice) {
      setMessage('Error: This test only works on iOS devices. Open in iOS Simulator.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await IOSSubscriptionService.getCurrentEntitlements();
      setMessage(`Current Entitlements: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">
          iOS IAP Test Page
        </h1>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Platform Detection</h2>
          <p className="text-sm text-gray-600">
            iOS Device: <span className={isIOSDevice ? 'text-green-600' : 'text-red-600'}>
              {isIOSDevice ? 'Yes' : 'No'}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            User Agent: {mounted ? navigator.userAgent : 'Loading...'}
          </p>
        </div>

        {isIOSDevice ? (
          <div className="space-y-4">
            <button
              onClick={testGetProducts}
              disabled={loading}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Test Get Products'}
            </button>

            <button
              onClick={testPurchase}
              disabled={loading}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Test Purchase ($3.99)'}
            </button>

            <button
              onClick={testRestore}
              disabled={loading}
              className="w-full bg-purple-500 text-white py-3 px-4 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Test Restore Purchases'}
            </button>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p>This test page only works on iOS devices.</p>
            <p className="text-sm mt-2">
              Open this page in the iOS Simulator or on an actual iOS device.
            </p>
          </div>
        )}

        {message && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">Result:</h3>
            <pre className="text-sm whitespace-pre-wrap">{message}</pre>
          </div>
        )}

        {products.length > 0 && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold mb-2">Products Found:</h3>
            <pre className="text-sm">{JSON.stringify(products, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}