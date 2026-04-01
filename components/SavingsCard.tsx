import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatKES } from "@/constants/categories";
import type { SavingsGoal } from "@/hooks/useSavings";
import Svg, { Circle } from "react-native-svg";

interface Props {
  goal: SavingsGoal;
  onAddFunds?: () => void;
  onDelete?: () => void;
}

export function SavingsCard({ goal, onAddFunds, onDelete }: Props) {
  const percentage = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
  const capped = Math.min(percentage, 100);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (capped / 100) * circumference;
  const daysLeft = goal.deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <View
      style={{
        backgroundColor: "#2A2A3C",
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Svg width={80} height={80}>
          <Circle
            cx={40}
            cy={40}
            r={radius}
            stroke="#1E1E2E"
            strokeWidth={6}
            fill="transparent"
          />
          <Circle
            cx={40}
            cy={40}
            r={radius}
            stroke="#00C853"
            strokeWidth={6}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin="40,40"
          />
          <View
            style={{
              position: "absolute",
              width: 80,
              height: 80,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
              {Math.round(capped)}%
            </Text>
          </View>
        </Svg>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
            {goal.name}
          </Text>
          <Text style={{ color: "#00C853", fontSize: 14, marginTop: 4 }}>
            {formatKES(goal.saved)} / {formatKES(goal.target)}
          </Text>
          {daysLeft !== null && (
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
              {daysLeft} days left
            </Text>
          )}
        </View>
        <View style={{ alignItems: "center", gap: 8 }}>
          {onAddFunds && (
            <Pressable
              onPress={onAddFunds}
              style={{
                backgroundColor: "#00C853",
                borderRadius: 20,
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          )}
          {onDelete && (
            <Pressable onPress={onDelete} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color="#6B7280" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
