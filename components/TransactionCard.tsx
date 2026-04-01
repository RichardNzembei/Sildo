import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatKES, CHANNEL_ICONS, CHANNEL_COLORS, CATEGORY_ICONS, type Channel } from "@/constants/categories";
import type { Transaction } from "@/hooks/useTransactions";

interface Props {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionCard({ transaction, onPress }: Props) {
  const isIncome = transaction.paid_in > 0;
  const amount = isIncome ? transaction.paid_in : transaction.paid_out;
  const ch = transaction.channel as Channel;
  const icon = CHANNEL_ICONS[ch] ?? CATEGORY_ICONS[transaction.category] ?? "ellipsis-horizontal";
  const color = isIncome ? "#00C853" : (CHANNEL_COLORS[ch] ?? "#FF5252");
  const label = transaction.channel ?? transaction.category ?? transaction.type;
  const dateStr = new Date(transaction.date).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#2A2A3C",
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: isIncome ? "rgba(0,200,83,0.15)" : "rgba(255,82,82,0.15)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={isIncome ? "#00C853" : color}
        />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
          {transaction.person || transaction.type}
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
          {label} · {dateStr}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{
            color: isIncome ? "#00C853" : "#FF5252",
            fontSize: 15,
            fontWeight: "700",
          }}
        >
          {isIncome ? "+" : "-"} {formatKES(amount)}
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>
          Bal: {formatKES(transaction.balance)}
        </Text>
      </View>
    </Pressable>
  );
}
