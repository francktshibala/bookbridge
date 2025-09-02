declare module '@capacitor/cli' {
  export interface CapacitorConfig {
    appId: string;
    appName?: string;
    webDir?: string;
    bundledWebRuntime?: boolean;
    server?: {
      androidScheme?: string;
      url?: string;
      cleartext?: boolean;
    };
    plugins?: Record<string, any>;
  }
}


