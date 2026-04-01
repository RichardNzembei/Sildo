import { useCallback, useState } from "react";
import {
  View, Text, ScrollView, RefreshControl, Pressable, Modal, TextInput,
  ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useBudget } from "@/hooks/useBudget";
import { BudgetBar } from "@/components/BudgetBar";
import { formatKES, BUDGETABLE_CHANNELS, type BudgetableChannel } from "@/constants/categories";

export default function BudgetScreen() {
  const { budgets, loading, totalBudgeted, totalSpent, earnings, surplus, addBudget, deleteBudget, refresh } =
    useBudget();
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<BudgetableChannel>(BUDGETABLE_CHANNELS[0]);
  const [amount, setAmount] = useState("");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleAdd = useCallback(async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { Alert.alert("Invalid", "Enter a valid amount"); return; }
    await addBudget(selectedChannel, num);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setAmount("");
  }, [selectedChannel, amount, addBudget]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert("Delete Budget", "Remove this budget?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            await deleteBudget(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]);
    },
    [deleteBudget]
  );

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1E1E2E", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#00C853" />
      </View>
    );
  }

  const pct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#1E1E2E" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C853" />}
      >
        {/* Summary */}
        <View style={{ backgroundColor: "#2A2A3C", borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <View>
              <Text style={{ color: "#6B7280", fontSize: 11 }}>Spent</Text>
              <Text style={{ color: "#FF5252", fontSize: 20, fontWeight: "800" }}>{formatKES(totalSpent)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: "#6B7280", fontSize: 11 }}>Budgeted</Text>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>{formatKES(totalBudgeted)}</Text>
            </View>
          </View>
          <View style={{ height: 8, backgroundColor: "#1E1E2E", borderRadius: 4, overflow: "hidden" }}>
            <View
              style={{
                height: "100%", width: `${Math.min(pct, 100)}%`, borderRadius: 4,
                backgroundColor: pct < 70 ? "#00C853" : pct < 90 ? "#FFB300" : "#FF5252",
              }}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
            <Text style={{ color: "#6B7280", fontSize: 12 }}>
              Earned: {formatKES(earnings)}
            </Text>
            <Text style={{ color: surplus >= 0 ? "#00C853" : "#FF5252", fontSize: 12, fontWeight: "600" }}>
              {surplus >= 0 ? "Target savings" : "Over budget"}: {formatKES(Math.abs(surplus))}
            </Text>
          </View>
        </View>

        {/* Budget Items */}
        {budgets.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 30 }}>
            <Ionicons name="pie-chart-outline" size={48} color="#6B7280" />
            <Text style={{ color: "#6B7280", fontSize: 15, marginTop: 12, textAlign: "center" }}>
              No budgets set yet.{"\n"}Tap + to budget by spending channel.
            </Text>
          </View>
        ) : (
          budgets.map((b) => (
            <BudgetBar key={b.id} budget={b} onDelete={() => handleDelete(b.id)} />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => setShowAdd(true)}
        style={{
          position: "absolute", bottom: 24, right: 20, width: 56, height: 56,
          borderRadius: 28, backgroundColor: "#00C853", alignItems: "center",
          justifyContent: "center", elevation: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Add Budget Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
          onPress={() => setShowAdd(false)}
        >
          <Pressable
            style={{
              backgroundColor: "#2A2A3C", borderTopLeftRadius: 20, borderTopRightRadius: 20,
              padding: 20, paddingBottom: 40,
            }}
            onPress={() => {}}
          >
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 40, height: 4, backgroundColor: "#6B7280", borderRadius: 2 }} />
            </View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
              Set Budget
            </Text>

            <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 8 }}>Spending Channel</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {BUDGETABLE_CHANNELS.map((ch) => (
                <Pressable
                  key={ch}
                  onPress={() => setSelectedChannel(ch)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: selectedChannel === ch ? "#00C853" : "#1E1E2E",
                  }}
                >
                  <Text
                    style={{
                      color: selectedChannel === ch ? "#fff" : "#6B7280",
                      fontSize: 13, fontWeight: "600",
                    }}
                  >
                    {ch}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 8 }}>Amount (KES)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="e.g. 10000"
              placeholderTextColor="#6B7280"
              style={{
                backgroundColor: "#1E1E2E", borderRadius: 10, padding: 14,
                color: "#fff", fontSize: 16, marginBottom: 20,
              }}
            />

            <Pressable
              onPress={handleAdd}
              style={{ backgroundColor: "#00C853", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Save Budget</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
