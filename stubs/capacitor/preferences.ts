export const Preferences = {
  set: async (_opts: { key: string; value: string }) => {},
  get: async (_opts: { key: string }) => ({ value: null as string | null }),
  remove: async (_opts: { key: string }) => {},
};

export default { Preferences };


