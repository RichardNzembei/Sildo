import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, Alert } from "react-native";
import { getDB } from "@/lib/db";
import { requestSMSPermission, readAllSMS } from "@/lib/sms";

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      try {
        console.log("[Soldi] Initializing database...");
        await getDB();
        console.log("[Soldi] Database ready");

        if (Platform.OS === "android") {
          console.log("[Soldi] Requesting SMS permission...");
          const granted = await requestSMSPermission();
          console.log("[Soldi] SMS permission:", granted);

          if (granted) {
            console.log("[Soldi] Reading SMS from all sources...");
            const results = await readAllSMS();
            const total = Object.values(results).reduce((a, b) => a + b, 0);
            console.log("[Soldi] Import results:", results);
            if (total > 0) {
              const details = Object.entries(results)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ");
              Alert.alert("SMS Import", `Imported ${total} transactions\n${details}`);
            }
          }
        }
      } catch (err) {
        console.error("[Soldi] Init error:", err);
      }
    }
    init();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#1E1E2E" },
        }}
      />
    </>
  );
}
