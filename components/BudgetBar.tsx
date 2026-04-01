import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatKES, CHANNEL_ICONS, CHANNEL_COLORS, type Channel } from "@/constants/categories";
import type { Budget } from "@/hooks/useBudget";

interface Props {
  budget: Budget;
  onDelete?: () => void;
}

export function BudgetBar({ budget, onDelete }: Props) {
  const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  const capped = Math.min(percentage, 100);
  const barColor = percentage < 70 ? "#00C853" : percentage < 90 ? "#FFB300" : "#FF5252";
  const ch = budget.channel as Channel;
  const icon = CHANNEL_ICONS[ch] ?? "ellipsis-horizontal";
  const color = CHANNEL_COLORS[ch] ?? "#6B7280";

  return (
    <View
      style={{
        backgroundColor: "#2A2A3C",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={color} />
        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600", flex: 1, marginLeft: 8 }}>
          {budget.channel}
        </Text>
        {onDelete && (
          <Pressable onPress={onDelete} hitSlop={10}>
            <Ionicons name="trash-outline" size={18} color="#6B7280" />
          </Pressable>
        )}
      </View>
      <View
        style={{ height: 8, backgroundColor: "#1E1E2E", borderRadius: 4, overflow: "hidden" }}
      >
        <View
          style={{ height: "100%", width: `${capped}%`, backgroundColor: barColor, borderRadius: 4 }}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ color: "#6B7280", fontSize: 12 }}>{formatKES(budget.spent)} spent</Text>
        <Text style={{ color: "#6B7280", fontSize: 12 }}>{formatKES(budget.amount)} budgeted</Text>
      </View>
      {percentage >= 90 && (
        <View
          style={{
            flexDirection: "row", alignItems: "center", marginTop: 6,
            backgroundColor: "rgba(255,82,82,0.1)", borderRadius: 6, padding: 6,
          }}
        >
          <Ionicons name="warning" size={14} color="#FF5252" />
          <Text style={{ color: "#FF5252", fontSize: 12, marginLeft: 4 }}>
            {Math.round(percentage)}% of budget used!
          </Text>
        </View>
      )}
    </View>
  );
}
