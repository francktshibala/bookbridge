type ListenerHandle = { remove: () => void };

export const App = {
  addListener: (_event: string, _callback: (...args: any[]) => void): ListenerHandle => ({ remove: () => {} }),
  removeAllListeners: async () => {},
  exitApp: () => {},
};

export default { App };


