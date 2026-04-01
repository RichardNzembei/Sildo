import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useBudget } from "@/hooks/useBudget";
import { BudgetBar } from "@/components/BudgetBar";
import { formatKES, CATEGORIES, type Category } from "@/constants/categories";

export default function BudgetScreen() {
  const { budgets, loading, totalBudgeted, totalSpent, addBudget, deleteBudget, refresh } =
    useBudget();
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[0]);
  const [amount, setAmount] = useState("");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleAdd = useCallback(async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      Alert.alert("Invalid", "Enter a valid amount");
      return;
    }
    await addBudget(selectedCategory, num);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setAmount("");
  }, [selectedCategory, amount, addBudget]);

  const handleDelete = useCallback(
    async (id: string) => {
      Alert.alert("Delete Budget", "Remove this budget category?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
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

  const totalPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#1E1E2E" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C853" />
        }
      >
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: "#2A2A3C",
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 4 }}>
            Monthly Budget Summary
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <View>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>
                {formatKES(totalSpent)}
              </Text>
              <Text style={{ color: "#6B7280", fontSize: 12 }}>spent</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>
                {formatKES(totalBudgeted)}
              </Text>
              <Text style={{ color: "#6B7280", fontSize: 12 }}>budgeted</Text>
            </View>
          </View>
          <View
            style={{
              height: 10,
              backgroundColor: "#1E1E2E",
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${Math.min(totalPercentage, 100)}%`,
                backgroundColor:
                  totalPercentage < 70 ? "#00C853" : totalPercentage < 90 ? "#FFB300" : "#FF5252",
                borderRadius: 5,
              }}
            />
          </View>
          <Text
            style={{ color: "#6B7280", fontSize: 12, textAlign: "right", marginTop: 4 }}
          >
            {Math.round(totalPercentage)}% used
          </Text>
        </View>

        {/* Budget Items */}
        {budgets.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 30 }}>
            <Ionicons name="pie-chart-outline" size={48} color="#6B7280" />
            <Text style={{ color: "#6B7280", fontSize: 15, marginTop: 12, textAlign: "center" }}>
              No budgets set yet.{"\n"}Tap + to create your first budget.
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
          position: "absolute",
          bottom: 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#00C853",
          alignItems: "center",
          justifyContent: "center",
          elevation: 8,
          shadowColor: "#00C853",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
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
          <View
            style={{
              backgroundColor: "#2A2A3C",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 40,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{ width: 40, height: 4, backgroundColor: "#6B7280", borderRadius: 2 }}
              />
            </View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
              Set Budget
            </Text>

            <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 8 }}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selectedCategory === cat ? "#00C853" : "#1E1E2E",
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      color: selectedCategory === cat ? "#fff" : "#6B7280",
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 8 }}>
              Amount (KES)
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="e.g. 10000"
              placeholderTextColor="#6B7280"
              style={{
                backgroundColor: "#1E1E2E",
                borderRadius: 10,
                padding: 14,
                color: "#fff",
                fontSize: 16,
                marginBottom: 20,
              }}
            />

            <Pressable
              onPress={handleAdd}
              style={{
                backgroundColor: "#00C853",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Save Budget</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
