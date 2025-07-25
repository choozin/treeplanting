declare global {
  interface Window {
    Capacitor?: {
      isNative: boolean;
      isPluginAvailable: (pluginName: string) => boolean;
      platform: string;
      [key: string]: any; // Allow other properties
    };
  }
}

export {}; // This ensures the file is treated as a module