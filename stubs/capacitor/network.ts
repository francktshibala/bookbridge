type NetworkStatus = { connected: boolean; connectionType: string };

export const Network = {
  getStatus: async (): Promise<NetworkStatus> => ({ connected: true, connectionType: 'wifi' }),
  addListener: async (_event: 'networkStatusChange', _cb: (status: NetworkStatus) => void) => ({ remove: () => {} }),
};

export default { Network };


