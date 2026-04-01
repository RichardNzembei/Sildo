import { useCallback, useState } from "react";
import {
  View, Text, ScrollView, RefreshControl, ActivityIndicator, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionCard } from "@/components/TransactionCard";
import { formatKES, CHANNEL_COLORS, type Channel } from "@/constants/categories";

const { width: SW } = Dimensions.get("window");

export default function DashboardScreen() {
  const {
    transactions, loading, monthlyFlow, earningSources, channelSpend, debtSummary, refresh,
  } = useTransactions();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const recent = transactions.slice(0, 5);
  const maxChannel = channelSpend.length > 0 ? channelSpend[0].total : 1;

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C853" />}
    >
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginBottom: 4 }}>Soldi</Text>
      <Text style={{ color: "#6B7280", fontSize: 13, marginBottom: 20 }}>
        Earn · Spend · Save
      </Text>

      {/* Available to Spend */}
      <View style={{ backgroundColor: "#00C853", borderRadius: 16, padding: 20, marginBottom: 12 }}>
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>Available to Spend</Text>
        <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4 }}>
          {formatKES(monthlyFlow.mpesaBalance)}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 4 }}>M-PESA Balance</Text>
      </View>

      {/* This Month: Earned / Spent / Saved */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <StatCard label="Earned" amount={monthlyFlow.earnings} color="#00C853" icon="trending-up" />
        <StatCard label="Spent" amount={monthlyFlow.spent} color="#FF5252" icon="trending-down" />
        <StatCard label="Saved" amount={monthlyFlow.saved} color="#42A5F5" icon="wallet" />
      </View>

      {/* Earnings Breakdown */}
      {earningSources.length > 0 && (
        <View style={{ backgroundColor: "#2A2A3C", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 10 }}>
            Income Sources
          </Text>
          {earningSources.map((s) => (
            <View key={s.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: "#ccc", fontSize: 13 }}>{s.label}</Text>
              <Text style={{ color: "#00C853", fontSize: 13, fontWeight: "600" }}>{formatKES(s.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Debt Summary */}
      {debtSummary.totalDebt > 0 && (
        <View
          style={{
            backgroundColor: "rgba(255,82,82,0.1)", borderRadius: 12, padding: 14,
            marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,82,82,0.3)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="warning" size={18} color="#FF5252" />
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

      {/* Spending by Channel */}
      <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 12 }}>
        Spending by Channel
      </Text>
      {channelSpend.length === 0 ? (
        <View style={{ backgroundColor: "#2A2A3C", borderRadius: 12, padding: 20, alignItems: "center", marginBottom: 16 }}>
          <Ionicons name="analytics-outline" size={32} color="#6B7280" />
          <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 8 }}>No spending data this month.</Text>
        </View>
      ) : (
        <View style={{ marginBottom: 16 }}>
          {channelSpend.map((ch) => {
            const barW = (ch.total / maxChannel) * (SW - 80);
            const color = CHANNEL_COLORS[ch.channel as Channel] ?? "#6B7280";
            return (
              <View key={ch.channel} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ color: "#fff", fontSize: 13 }}>{ch.channel}</Text>
                  <Text style={{ color: "#6B7280", fontSize: 13 }}>
                    {formatKES(ch.total)} ({ch.count}x)
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: "#2A2A3C", borderRadius: 4, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: Math.max(barW, 4), backgroundColor: color, borderRadius: 4 }} />
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
            No transactions yet.
          </Text>
        </View>
      ) : (
        recent.map((t) => <TransactionCard key={t.id} transaction={t} />)
      )}
    </ScrollView>
  );
}

function StatCard({ label, amount, color, icon }: {
  label: string; amount: number; color: string; icon: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: "#2A2A3C", borderRadius: 12, padding: 12 }}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={color} />
      <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 4 }}>{label}</Text>
      <Text style={{ color, fontSize: 15, fontWeight: "700", marginTop: 2 }}>{formatKES(amount)}</Text>
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
