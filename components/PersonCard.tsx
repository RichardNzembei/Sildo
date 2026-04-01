import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatKES } from "@/constants/categories";

export interface Person {
  id: string;
  name: string;
  phone: string;
  total_sent: number;
  times_sent: number;
  monthly_limit: number | null;
}

interface Props {
  person: Person;
  onSetLimit?: () => void;
}

export function PersonCard({ person, onSetLimit }: Props) {
  const overLimit =
    person.monthly_limit != null && person.total_sent > person.monthly_limit;

  return (
    <View
      style={{
        backgroundColor: "#2A2A3C",
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: overLimit ? "rgba(255,82,82,0.15)" : "rgba(0,200,83,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="person"
            size={20}
            color={overLimit ? "#FF5252" : "#00C853"}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
            {person.name}
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
            {person.times_sent} times · {person.phone || "No phone"}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#FF5252", fontSize: 15, fontWeight: "700" }}>
            {formatKES(person.total_sent)}
          </Text>
          {person.monthly_limit != null && (
            <Text
              style={{
                color: overLimit ? "#FF5252" : "#6B7280",
                fontSize: 11,
                marginTop: 2,
              }}
            >
              Limit: {formatKES(person.monthly_limit)}
            </Text>
          )}
        </View>
      </View>
      {onSetLimit && (
        <Pressable
          onPress={onSetLimit}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 10,
            paddingVertical: 6,
            borderTopWidth: 1,
            borderTopColor: "#1E1E2E",
          }}
        >
          <Ionicons name="shield-checkmark-outline" size={14} color="#6B7280" />
          <Text style={{ color: "#6B7280", fontSize: 12, marginLeft: 4 }}>
            {person.monthly_limit != null ? "Edit limit" : "Set monthly limit"}
          </Text>
        </Pressable>
      )}
      {overLimit && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 6,
            backgroundColor: "rgba(255,82,82,0.1)",
            borderRadius: 6,
            padding: 6,
          }}
        >
          <Ionicons name="warning" size={14} color="#FF5252" />
          <Text style={{ color: "#FF5252", fontSize: 12, marginLeft: 4 }}>
            Monthly limit exceeded!
          </Text>
        </View>
      )}
    </View>
  );
}
