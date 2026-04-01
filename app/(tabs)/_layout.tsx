import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

const TAB_ITEMS = [
  { name: "dashboard", title: "Home", icon: "grid" as const },
  { name: "transactions", title: "Transactions", icon: "swap-horizontal" as const },
  { name: "budget", title: "Budget", icon: "pie-chart" as const },
  { name: "people", title: "People", icon: "people" as const },
  { name: "savings", title: "Savings", icon: "wallet" as const },
  { name: "advisor", title: "Advisor", icon: "chatbubble-ellipses" as const },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#1E1E2E" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: "#1E1E2E",
          borderTopColor: "#2A2A3C",
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          height: Platform.OS === "ios" ? 85 : 65,
        },
        tabBarActiveTintColor: "#00C853",
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
