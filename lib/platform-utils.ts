export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isCapacitor = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).Capacitor;
};

export const getPaymentMethod = (): 'apple' | 'stripe' => {
  // Only use Apple IAP if we're on iOS AND in the Capacitor app
  return (isIOS() && isCapacitor()) ? 'apple' : 'stripe';
};

export const shouldShowApplePurchase = (): boolean => {
  return getPaymentMethod() === 'apple';
};