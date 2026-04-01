import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { useTransactions, type Transaction } from "@/hooks/useTransactions";
import { TransactionCard } from "@/components/TransactionCard";
import { formatKES, CATEGORIES, type Category } from "@/constants/categories";
import { importFromStatement } from "@/lib/sms";

export default function TransactionsScreen() {
  const { transactions, loading, refresh, search, exportCSV } = useTransactions();
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | undefined>();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
      if (text.length > 1 || filterCategory) {
        search(text, undefined, undefined, filterCategory);
      } else if (text.length === 0) {
        refresh();
      }
    },
    [search, refresh, filterCategory]
  );

  const handleExport = useCallback(async () => {
    try {
      const csv = exportCSV();
      const path = `${FileSystem.cacheDirectory}soldi_transactions.csv`;
      await FileSystem.writeAsStringAsync(path, csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: "text/csv" });
      }
    } catch {
      Alert.alert("Error", "Failed to export transactions");
    }
  }, [exportCSV]);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/plain"],
      });
      if (!result.canceled && result.assets[0]) {
        const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
        const count = await importFromStatement(content);
        Alert.alert("Import Complete", `Imported ${count} transactions`);
        await refresh();
      }
    } catch {
      Alert.alert("Error", "Failed to import statement");
    }
  }, [refresh]);

  return (
    <View style={{ flex: 1, backgroundColor: "#1E1E2E" }}>
      {/* Search Bar */}
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#2A2A3C",
            borderRadius: 10,
            alignItems: "center",
            paddingHorizontal: 12,
          }}
        >
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            value={query}
            onChangeText={handleSearch}
            placeholder="Search transactions..."
            placeholderTextColor="#6B7280"
            style={{ flex: 1, color: "#fff", paddingVertical: 12, marginLeft: 8, fontSize: 15 }}
          />
        </View>

        {/* Action Row */}
        <View style={{ flexDirection: "row", marginTop: 10, gap: 8 }}>
          <Pressable
            onPress={handleExport}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#2A2A3C",
              borderRadius: 8,
              paddingVertical: 8,
            }}
          >
            <Ionicons name="download-outline" size={16} color="#00C853" />
            <Text style={{ color: "#00C853", fontSize: 13, marginLeft: 6 }}>Export CSV</Text>
          </Pressable>
          {Platform.OS === "ios" && (
            <Pressable
              onPress={handleImport}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#2A2A3C",
                borderRadius: 8,
                paddingVertical: 8,
              }}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#00C853" />
              <Text style={{ color: "#00C853", fontSize: 13, marginLeft: 6 }}>
                Import Statement
              </Text>
            </Pressable>
          )}
        </View>

        {/* Category Filter */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[undefined, ...CATEGORIES]}
          keyExtractor={(item) => item ?? "all"}
          style={{ marginTop: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setFilterCategory(item);
                search(query, undefined, undefined, item);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: filterCategory === item ? "#00C853" : "#2A2A3C",
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  color: filterCategory === item ? "#fff" : "#6B7280",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {item ?? "All"}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Transaction List */}
      {loading ? (
        <ActivityIndicator size="large" color="#00C853" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C853" />
          }
          renderItem={({ item }) => (
            <TransactionCard transaction={item} onPress={() => setSelectedTx(item)} />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Ionicons name="receipt-outline" size={48} color="#6B7280" />
              <Text style={{ color: "#6B7280", fontSize: 15, marginTop: 12 }}>
                No transactions found
              </Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!selectedTx} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
          onPress={() => setSelectedTx(null)}
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
            {selectedTx && (
              <>
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      backgroundColor: "#6B7280",
                      borderRadius: 2,
                      marginBottom: 16,
                    }}
                  />
                  <Text
                    style={{
                      color: selectedTx.paid_in > 0 ? "#00C853" : "#FF5252",
                      fontSize: 28,
                      fontWeight: "800",
                    }}
                  >
                    {selectedTx.paid_in > 0 ? "+" : "-"}{" "}
                    {formatKES(selectedTx.paid_in || selectedTx.paid_out)}
                  </Text>
                </View>
                {[
                  ["Receipt", selectedTx.receipt_no],
                  ["Type", selectedTx.type],
                  ["Person", selectedTx.person || "N/A"],
                  ["Category", selectedTx.category],
                  ["Date", new Date(selectedTx.date).toLocaleString("en-KE")],
                  ["Balance", formatKES(selectedTx.balance)],
                ].map(([label, value]) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: "#1E1E2E",
                    }}
                  >
                    <Text style={{ color: "#6B7280", fontSize: 14 }}>{label}</Text>
                    <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{value}</Text>
                  </View>
                ))}
                <Text
                  style={{
                    color: "#6B7280",
                    fontSize: 12,
                    marginTop: 12,
                    lineHeight: 18,
                  }}
                  numberOfLines={4}
                >
                  {selectedTx.details}
                </Text>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
