import { Subscriptions } from '@squareetlabs/capacitor-subscriptions';

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export class IOSSubscriptionService {
  static async getProductDetails(productId: string) {
    try {
      const result = await Subscriptions.getProductDetails({
        productIdentifier: productId
      });
      return result;
    } catch (error) {
      console.error('Failed to get product details:', error);
      throw error;
    }
  }

  static async purchaseSubscription(productId: string, userId: string): Promise<PurchaseResult> {
    try {
      const result = await Subscriptions.purchaseProduct({
        productIdentifier: productId
      });

      if (result.responseCode === 0) { // Success code
        // Get the latest transaction to get transaction ID
        const transactionResult = await Subscriptions.getLatestTransaction({
          productIdentifier: productId
        });

        if (transactionResult.responseCode === 0 && transactionResult.data) {
          // Link to backend using Agent 2's endpoint
          await fetch('/api/apple/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              originalTransactionId: transactionResult.data.originalId,
              environment: 'Sandbox', // Use 'Production' for live app
              userId
            })
          });

          return {
            success: true,
            transactionId: transactionResult.data.transactionId
          };
        }
      }

      return {
        success: false,
        error: result.responseMessage || 'Purchase failed'
      };
    } catch (error) {
      console.error('iOS purchase failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getCurrentEntitlements() {
    try {
      const result = await Subscriptions.getCurrentEntitlements();
      return result;
    } catch (error) {
      console.error('Failed to get entitlements:', error);
      throw error;
    }
  }

  static async checkSubscriptionStatus(productId: string) {
    try {
      // Check if user has current entitlements
      const entitlements = await Subscriptions.getCurrentEntitlements();

      if (entitlements.responseCode === 0 && entitlements.data) {
        // Check if our product is in the entitlements
        const hasSubscription = entitlements.data.some(
          transaction => transaction.productIdentifier === productId
        );
        return { hasSubscription, entitlements: entitlements.data };
      }

      return { hasSubscription: false, entitlements: [] };
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      throw error;
    }
  }

  static async manageSubscriptions() {
    try {
      // Opens the subscription management interface
      Subscriptions.manageSubscriptions();
    } catch (error) {
      console.error('Failed to open subscription management:', error);
      throw error;
    }
  }
}