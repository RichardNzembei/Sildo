import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionCard } from "@/components/TransactionCard";
import { formatKES } from "@/constants/categories";
import { CATEGORY_COLORS, type Category } from "@/constants/categories";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function DashboardScreen() {
  const {
    transactions, loading, monthlyStats, incomeBreakdown, debtSummary,
    categorySpend, refresh,
  } = useTransactions();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const recent = transactions.slice(0, 5);
  const topCategories = categorySpend.slice(0, 5);
  const maxCatSpend = topCategories.length > 0 ? topCategories[0].total : 1;
  const combinedBalance = monthlyStats.mpesaBalance + monthlyStats.kcbBalance;

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1E1E2E", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#00C853" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#1E1E2E" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C853" />
      }
    >
      {/* Header */}
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 4 }}>
        Soldi
      </Text>
      <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 20 }}>
        Your money across M-PESA, KCB & Loop
      </Text>

      {/* Combined Balance */}
      <View
        style={{
          backgroundColor: "#00C853",
          borderRadius: 16,
          padding: 20,
          marginBottom: 10,
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
          Combined Balance
        </Text>
        <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4 }}>
          {formatKES(combinedBalance)}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 10, gap: 16 }}>
          <View>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>M-PESA</Text>
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
              {formatKES(monthlyStats.mpesaBalance)}
            </Text>
          </View>
          {monthlyStats.kcbBalance > 0 && (
            <View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>KCB</Text>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                {formatKES(monthlyStats.kcbBalance)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Income vs Expenses */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1, backgroundColor: "#2A2A3C", borderRadius: 12, padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Ionicons name="arrow-down-circle" size={18} color="#00C853" />
            <Text style={{ color: "#6B7280", fontSize: 12, marginLeft: 6 }}>Income</Text>
          </View>
          <Text style={{ color: "#00C853", fontSize: 18, fontWeight: "700" }}>
            {formatKES(monthlyStats.income)}
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#2A2A3C", borderRadius: 12, padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <Ionicons name="arrow-up-circle" size={18} color="#FF5252" />
            <Text style={{ color: "#6B7280", fontSize: 12, marginLeft: 6 }}>Expenses</Text>
          </View>
          <Text style={{ color: "#FF5252", fontSize: 18, fontWeight: "700" }}>
            {formatKES(monthlyStats.expenses)}
          </Text>
        </View>
      </View>

      {/* Income Sources Breakdown */}
      {monthlyStats.income > 0 && (
        <View
          style={{
            backgroundColor: "#2A2A3C",
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 10 }}>
            Income Sources
          </Text>
          {incomeBreakdown.loopSalary > 0 && (
            <SourceRow icon="trending-up" color="#00E676" label="Loop Salary" amount={incomeBreakdown.loopSalary} />
          )}
          {incomeBreakdown.mpesaReceived > 0 && (
            <SourceRow icon="phone-portrait" color="#00C853" label="M-PESA Received" amount={incomeBreakdown.mpesaReceived} />
          )}
          {incomeBreakdown.kcbCredits > 0 && (
            <SourceRow icon="business" color="#42A5F5" label="KCB Credits" amount={incomeBreakdown.kcbCredits} />
          )}
        </View>
      )}

      {/* Debt Summary */}
      {debtSummary.totalDebt > 0 && (
        <View
          style={{
            backgroundColor: "rgba(255,82,82,0.1)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "rgba(255,82,82,0.3)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Ionicons name="warning" size={20} color="#FF5252" />
            <Text style={{ color: "#FF5252", fontSize: 14, fontWeight: "700", marginLeft: 8 }}>
              Total Debt: {formatKES(debtSummary.totalDebt)}
            </Text>
          </View>
          {debtSummary.fulizaTotal > 0 && (
            <DebtRow label="Fuliza" amount={debtSummary.fulizaTotal} />
          )}
          {debtSummary.loopAdvances > 0 && (
            <DebtRow label="Loop Advances" amount={debtSummary.loopAdvances} />
          )}
          {debtSummary.kcbLoans > 0 && (
            <DebtRow label="KCB Loans" amount={debtSummary.kcbLoans} />
          )}
        </View>
      )}

      {/* Fuliza Alert (separate from debt card for visibility) */}
      {monthlyStats.fulizaCount > 0 && (
        <View
          style={{
            backgroundColor: "rgba(255,82,82,0.08)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons name="alert-circle" size={18} color="#FF5252" />
          <Text style={{ color: "#FF5252", fontSize: 13, marginLeft: 8, flex: 1 }}>
            Used Fuliza {monthlyStats.fulizaCount}x this month ({formatKES(monthlyStats.fulizaTotal)})
          </Text>
        </View>
      )}

      {/* Top Spending Categories */}
      <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 12 }}>
        Top Spending
      </Text>
      {topCategories.length === 0 ? (
        <View
          style={{
            backgroundColor: "#2A2A3C", borderRadius: 12, padding: 20,
            alignItems: "center", marginBottom: 16,
          }}
        >
          <Ionicons name="analytics-outline" size={32} color="#6B7280" />
          <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 8 }}>
            No spending data yet. Your transactions will appear here.
          </Text>
        </View>
      ) : (
        <View style={{ marginBottom: 16 }}>
          {topCategories.map((cat) => {
            const barWidth = (cat.total / maxCatSpend) * (SCREEN_WIDTH - 80);
            const color = CATEGORY_COLORS[cat.category as Category] ?? "#6B7280";
            return (
              <View key={cat.category} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ color: "#fff", fontSize: 13 }}>{cat.category}</Text>
                  <Text style={{ color: "#6B7280", fontSize: 13 }}>{formatKES(cat.total)}</Text>
                </View>
                <View style={{ height: 8, backgroundColor: "#2A2A3C", borderRadius: 4, overflow: "hidden" }}>
                  <View
                    style={{
                      height: "100%", width: Math.max(barWidth, 4),
                      backgroundColor: color, borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Recent Transactions */}
      <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 12 }}>
        Recent Transactions
      </Text>
      {recent.length === 0 ? (
        <View style={{ backgroundColor: "#2A2A3C", borderRadius: 12, padding: 20, alignItems: "center" }}>
          <Ionicons name="receipt-outline" size={32} color="#6B7280" />
          <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 8, textAlign: "center" }}>
            No transactions yet. Your M-PESA, KCB and Loop messages will appear here.
          </Text>
        </View>
      ) : (
        recent.map((t) => <TransactionCard key={t.id} transaction={t} />)
      )}
    </ScrollView>
  );
}

function SourceRow({ icon, color, label, amount }: {
  icon: string; color: string; label: string; amount: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={color} />
      <Text style={{ color: "#fff", fontSize: 13, flex: 1, marginLeft: 8 }}>{label}</Text>
      <Text style={{ color, fontSize: 13, fontWeight: "600" }}>{formatKES(amount)}</Text>
    </View>
  );
}

function DebtRow({ label, amount }: { label: string; amount: number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{label}</Text>
      <Text style={{ color: "#FF5252", fontSize: 13, fontWeight: "600" }}>{formatKES(amount)}</Text>
    </View>
  );
}
