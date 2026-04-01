import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { getDB } from "@/lib/db";
import { PersonCard, type Person } from "@/components/PersonCard";
import { formatKES } from "@/constants/categories";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type SortKey = "total_sent" | "times_sent" | "name";

export default function PeopleScreen() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("total_sent");
  const [limitModal, setLimitModal] = useState<Person | null>(null);
  const [limitAmount, setLimitAmount] = useState("");

  const refresh = useCallback(async () => {
    try {
      const db = await getDB();
      const orderClause = sortBy === "name" ? "name ASC" : sortBy === "times_sent" ? "times_sent DESC" : "total_sent DESC";
      const rows = await db.getAllAsync<Person>(
        `SELECT
          person as id,
          person as name,
          '' as phone,
          COALESCE(SUM(paid_out), 0) as total_sent,
          COUNT(*) as times_sent,
          (SELECT monthly_limit FROM people p WHERE p.name = t.person LIMIT 1) as monthly_limit
        FROM transactions t
        WHERE person != '' AND type = 'SENT' AND source = 'MPESA'
        GROUP BY person
        ORDER BY ${orderClause}`
      );
      setPeople(rows);
    } catch (e) {
      console.error("Failed to load people:", e);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleSetLimit = useCallback(async () => {
    if (!limitModal) return;
    const num = parseFloat(limitAmount);
    if (!num || num <= 0) {
      Alert.alert("Invalid", "Enter a valid amount");
      return;
    }
    const db = await getDB();
    // Upsert limit into people table by name
    await db.runAsync(
      `INSERT INTO people (id, name, phone, total_sent, times_sent, monthly_limit)
       VALUES (?, ?, '', 0, 0, ?)
       ON CONFLICT(name, phone) DO UPDATE SET monthly_limit = ?`,
      [limitModal.name, limitModal.name, num, num]
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLimitModal(null);
    setLimitAmount("");
    await refresh();
  }, [limitModal, limitAmount, refresh]);

  const topFive = people.slice(0, 5);
  const maxSent = topFive.length > 0 ? topFive[0].total_sent : 1;

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1E1E2E", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#00C853" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#1E1E2E" }}>
      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C853" />
        }
        ListHeaderComponent={
          <>
            {/* Top Recipients Chart */}
            {topFive.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 12 }}>
                  Top Recipients
                </Text>
                {topFive.map((p) => {
                  const barWidth = (p.total_sent / maxSent) * (SCREEN_WIDTH - 80);
                  return (
                    <View key={p.id} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ color: "#fff", fontSize: 13 }} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text style={{ color: "#6B7280", fontSize: 13 }}>
                          {formatKES(p.total_sent)}
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 8,
                          backgroundColor: "#2A2A3C",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            width: Math.max(barWidth, 4),
                            backgroundColor: "#FF5252",
                            borderRadius: 4,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Sort Buttons */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {(
                [
                  ["total_sent", "Amount"],
                  ["times_sent", "Frequency"],
                  ["name", "Name"],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setSortBy(key)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: sortBy === key ? "#00C853" : "#2A2A3C",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: sortBy === key ? "#fff" : "#6B7280",
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 12 }}>
              All People ({people.length})
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <PersonCard
            person={item}
            onSetLimit={() => {
              setLimitModal(item);
              setLimitAmount(item.monthly_limit?.toString() ?? "");
            }}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 30 }}>
            <Ionicons name="people-outline" size={48} color="#6B7280" />
            <Text style={{ color: "#6B7280", fontSize: 15, marginTop: 12, textAlign: "center" }}>
              No people found.{"\n"}Send or receive money to see people here.
            </Text>
          </View>
        }
      />

      {/* Limit Modal */}
      <Modal visible={!!limitModal} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
          onPress={() => setLimitModal(null)}
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
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 4 }}>
              Set Monthly Limit
            </Text>
            <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 16 }}>
              for {limitModal?.name}
            </Text>
            <TextInput
              value={limitAmount}
              onChangeText={setLimitAmount}
              keyboardType="numeric"
              placeholder="e.g. 5000"
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
              onPress={handleSetLimit}
              style={{
                backgroundColor: "#00C853",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Save Limit</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
