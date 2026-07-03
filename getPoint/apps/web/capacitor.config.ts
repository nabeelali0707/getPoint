import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.getpoint.driver",
  appName: "getPoint Driver",
  webDir: "out",
  android: {
    useLegacyBridge: true,
  },
};

export default config;
