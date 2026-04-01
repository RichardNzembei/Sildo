import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatKES } from "@/constants/categories";
import { CATEGORY_ICONS, type Category } from "@/constants/categories";
import type { Transaction } from "@/hooks/useTransactions";

interface Props {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionCard({ transaction, onPress }: Props) {
  const isIncome = transaction.paid_in > 0;
  const amount = isIncome ? transaction.paid_in : transaction.paid_out;
  const icon = CATEGORY_ICONS[transaction.category as Category] ?? "ellipsis-horizontal";
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
          color={isIncome ? "#00C853" : "#FF5252"}
        />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
          {transaction.person || transaction.type}
        </Text>
        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
          {transaction.category} · {dateStr}
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
