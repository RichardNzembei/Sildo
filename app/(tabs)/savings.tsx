import { useCallback, useState } from "react";
import {
  View, Text, ScrollView, RefreshControl, Pressable, Modal, TextInput,
  ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSavings } from "@/hooks/useSavings";
import { SavingsCard } from "@/components/SavingsCard";
import { formatKES } from "@/constants/categories";

export default function SavingsScreen() {
  const {
    goals, loading, totalSaved, actualSavedToBank,
    earnings, spent, addGoal, updateSaved, deleteGoal, refresh,
  } = useSavings();
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [addFundsGoal, setAddFundsGoal] = useState<string | null>(null);
  const [fundsAmount, setFundsAmount] = useState("");

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await refresh(); setRefreshing(false);
  }, [refresh]);

  const handleAdd = useCallback(async () => {
    if (!name.trim()) { Alert.alert("Invalid", "Enter a goal name"); return; }
    const num = parseFloat(target);
    if (!num || num <= 0) { Alert.alert("Invalid", "Enter a valid target"); return; }
    await addGoal(name.trim(), num, deadline || "");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false); setName(""); setTarget(""); setDeadline("");
  }, [name, target, deadline, addGoal]);

  const handleAddFunds = useCallback(async () => {
    if (!addFundsGoal) return;
    const num = parseFloat(fundsAmount);
    if (!num || num <= 0) { Alert.alert("Invalid", "Enter a valid amount"); return; }
    await updateSaved(addFundsGoal, num);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddFundsGoal(null); setFundsAmount("");
  }, [addFundsGoal, fundsAmount, updateSaved]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert("Delete Goal", "Remove this savings goal?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteGoal(id) },
      ]);
    },
    [deleteGoal]
  );

  const surplus = earnings - spent;

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1E1E2E", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#00C853" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#1E1E2E" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C853" />}
      >
        {/* Auto Savings Overview */}
        <View style={{ backgroundColor: "#2A2A3C", borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
            This Month
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ color: "#6B7280", fontSize: 13 }}>Earned</Text>
            <Text style={{ color: "#00C853", fontSize: 13, fontWeight: "600" }}>{formatKES(earnings)}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ color: "#6B7280", fontSize: 13 }}>Spent</Text>
            <Text style={{ color: "#FF5252", fontSize: 13, fontWeight: "600" }}>{formatKES(spent)}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ color: "#6B7280", fontSize: 13 }}>Surplus</Text>
            <Text style={{ color: surplus >= 0 ? "#00C853" : "#FF5252", fontSize: 13, fontWeight: "600" }}>
              {formatKES(surplus)}
            </Text>
          </View>
          <View style={{ height: 1, backgroundColor: "#1E1E2E", marginVertical: 8 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>Saved to Bank</Text>
            <Text style={{ color: "#42A5F5", fontSize: 14, fontWeight: "700" }}>
              {formatKES(actualSavedToBank)}
            </Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: "#00C853", borderRadius: 12, padding: 16 }}>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>Goals Saved</Text>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 4 }}>
              {formatKES(totalSaved)}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "#2A2A3C", borderRadius: 12, padding: 16 }}>
            <Text style={{ color: "#6B7280", fontSize: 12 }}>Bank Transfers</Text>
            <Text style={{ color: "#42A5F5", fontSize: 20, fontWeight: "800", marginTop: 4 }}>
              {formatKES(actualSavedToBank)}
            </Text>
            <Text style={{ color: "#6B7280", fontSize: 10, marginTop: 2 }}>This month</Text>
          </View>
        </View>

        {/* Goals */}
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 12 }}>
          Savings Goals ({goals.length})
        </Text>
        {goals.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 30 }}>
            <Ionicons name="wallet-outline" size={48} color="#6B7280" />
            <Text style={{ color: "#6B7280", fontSize: 15, marginTop: 12, textAlign: "center" }}>
              No savings goals yet.{"\n"}Start building your financial future!
            </Text>
          </View>
        ) : (
          goals.map((g) => (
            <SavingsCard
              key={g.id} goal={g}
              onAddFunds={() => { setAddFundsGoal(g.id); setFundsAmount(""); }}
              onDelete={() => handleDelete(g.id)}
            />
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

      {/* Add Goal Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }} onPress={() => setShowAdd(false)}>
          <Pressable style={{ backgroundColor: "#2A2A3C", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }} onPress={() => {}}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 40, height: 4, backgroundColor: "#6B7280", borderRadius: 2 }} />
            </View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>New Savings Goal</Text>
            <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 6 }}>Goal Name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Emergency Fund" placeholderTextColor="#6B7280" style={{ backgroundColor: "#1E1E2E", borderRadius: 10, padding: 14, color: "#fff", fontSize: 15, marginBottom: 12 }} />
            <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 6 }}>Target (KES)</Text>
            <TextInput value={target} onChangeText={setTarget} keyboardType="numeric" placeholder="e.g. 50000" placeholderTextColor="#6B7280" style={{ backgroundColor: "#1E1E2E", borderRadius: 10, padding: 14, color: "#fff", fontSize: 15, marginBottom: 12 }} />
            <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 6 }}>Deadline (YYYY-MM-DD)</Text>
            <TextInput value={deadline} onChangeText={setDeadline} placeholder="e.g. 2026-12-31" placeholderTextColor="#6B7280" style={{ backgroundColor: "#1E1E2E", borderRadius: 10, padding: 14, color: "#fff", fontSize: 15, marginBottom: 20 }} />
            <Pressable onPress={handleAdd} style={{ backgroundColor: "#00C853", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Create Goal</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Funds Modal */}
      <Modal visible={!!addFundsGoal} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }} onPress={() => setAddFundsGoal(null)}>
          <Pressable style={{ backgroundColor: "#2A2A3C", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }} onPress={() => {}}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 40, height: 4, backgroundColor: "#6B7280", borderRadius: 2 }} />
            </View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>Add Funds</Text>
            <TextInput value={fundsAmount} onChangeText={setFundsAmount} keyboardType="numeric" placeholder="Amount (KES)" placeholderTextColor="#6B7280" style={{ backgroundColor: "#1E1E2E", borderRadius: 10, padding: 14, color: "#fff", fontSize: 16, marginBottom: 20 }} />
            <Pressable onPress={handleAddFunds} style={{ backgroundColor: "#00C853", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Add to Savings</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
