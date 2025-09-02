declare module '@capacitor/app' {
  export type ListenerHandle = { remove: () => void };
  export interface AppUrlOpen { url: string }
  export interface AppStateChange { isActive: boolean }
  export interface BackButtonInfo { canGoBack: boolean }

  export interface AppPlugin {
    addListener(event: 'appUrlOpen', cb: (event: AppUrlOpen) => void): ListenerHandle | Promise<ListenerHandle>;
    addListener(event: 'appStateChange', cb: (state: AppStateChange) => void): ListenerHandle | Promise<ListenerHandle>;
    addListener(event: 'backButton', cb: (info: BackButtonInfo) => void): ListenerHandle | Promise<ListenerHandle>;
    removeAllListeners(): Promise<void>;
    exitApp(): void;
  }

  export const App: AppPlugin;
  export default any;
}

declare module '@capacitor/core' {
  export const Capacitor: any;
  export default any;
}

declare module '@capacitor/network' {
  export interface NetworkStatus {
    connected: boolean;
    connectionType: string;
  }

  export const Network: {
    getStatus: () => Promise<NetworkStatus>;
    addListener: (
      event: 'networkStatusChange',
      cb: (status: NetworkStatus) => void
    ) => Promise<{ remove: () => void }>;
  };
  export default any;
}

declare module '@capacitor/share' {
  export const Share: any;
  export default any;
}

declare module '@capacitor/filesystem' {
  export enum Directory {
    Data = 'Data',
    Documents = 'Documents',
    Cache = 'Cache',
  }
  export enum Encoding {
    UTF8 = 'utf8',
  }
  export interface ReaddirResult {
    files: { name: string }[];
  }
  export const Filesystem: {
    writeFile: (options: any) => Promise<{ uri: string } | any>;
    readFile: (options: any) => Promise<{ data: string } | any>;
    deleteFile: (options: any) => Promise<any>;
    readdir: (options: any) => Promise<ReaddirResult>;
  };
  export default any;
}

declare module '@capacitor/preferences' {
  export const Preferences: any;
  export default any;
}


