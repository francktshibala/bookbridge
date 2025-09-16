// Stub for @squareetlabs/capacitor-subscriptions to avoid build-time issues in non-mobile environments

export const Subscriptions = {
  async getProductDetails(options: { productIdentifier: string }) {
    console.warn('Subscriptions.getProductDetails called in stub environment');
    return {
      responseCode: -1,
      responseMessage: 'Not available in web environment',
      data: null
    };
  },

  async purchaseProduct(options: { productIdentifier: string }) {
    console.warn('Subscriptions.purchaseProduct called in stub environment');
    return {
      responseCode: -1,
      responseMessage: 'Not available in web environment',
      data: null
    };
  },

  async getLatestTransaction(options: { productIdentifier: string }) {
    console.warn('Subscriptions.getLatestTransaction called in stub environment');
    return {
      responseCode: -1,
      responseMessage: 'Not available in web environment',
      data: null
    };
  },

  async getCurrentEntitlements() {
    console.warn('Subscriptions.getCurrentEntitlements called in stub environment');
    return {
      responseCode: -1,
      responseMessage: 'Not available in web environment',
      data: []
    };
  },

  async manageSubscriptions() {
    console.warn('Subscriptions.manageSubscriptions called in stub environment');
    // No-op in stub environment
  }
};