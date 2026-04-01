import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import {
  sendMessage,
  getChatHistory,
  saveChatMessage,
  clearChatHistory,
  SUGGESTED_QUESTIONS,
  type ChatMessage,
} from "@/lib/claude";

export default function AdvisorScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    async function load() {
      const history = await getChatHistory();
      setMessages(history);
      setLoading(false);
    }
    load();
  }, []);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || isTyping) return;

      const userMsg: ChatMessage = {
        id: Crypto.randomUUID(),
        role: "user",
        content: msg,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await saveChatMessage(userMsg);

      try {
        const response = await sendMessage(msg, [...messages, userMsg]);
        const assistantMsg: ChatMessage = {
          id: Crypto.randomUUID(),
          role: "assistant",
          content: response,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        await saveChatMessage(assistantMsg);
      } catch {
        const errorMsg: ChatMessage = {
          id: Crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [input, isTyping, messages]
  );

  const handleClear = useCallback(() => {
    Alert.alert("Clear Chat", "Delete all chat history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearChatHistory();
          setMessages([]);
        },
      },
    ]);
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1E1E2E", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#00C853" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#1E1E2E" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#00C853",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          </View>
          <View>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Soldi AI</Text>
            <Text style={{ color: "#6B7280", fontSize: 11 }}>Your finance advisor</Text>
          </View>
        </View>
        <Pressable onPress={handleClear} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color="#6B7280" />
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color="#2A2A3C" />
            <Text style={{ color: "#6B7280", fontSize: 15, marginTop: 16, textAlign: "center" }}>
              Ask me anything about{"\n"}your M-PESA finances
            </Text>
            <View style={{ marginTop: 24, width: "100%" }}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => handleSend(q)}
                  style={{
                    backgroundColor: "#2A2A3C",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ color: "#00C853", fontSize: 14 }}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              alignSelf: item.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              marginBottom: 10,
            }}
          >
            <View
              style={{
                backgroundColor: item.role === "user" ? "#00C853" : "#2A2A3C",
                borderRadius: 16,
                borderBottomRightRadius: item.role === "user" ? 4 : 16,
                borderBottomLeftRadius: item.role === "assistant" ? 4 : 16,
                padding: 12,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {item.content}
              </Text>
            </View>
            <Text
              style={{
                color: "#6B7280",
                fontSize: 10,
                marginTop: 4,
                alignSelf: item.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {new Date(item.created_at).toLocaleTimeString("en-KE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        )}
        ListFooterComponent={
          isTyping ? (
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#2A2A3C",
                borderRadius: 16,
                borderBottomLeftRadius: 4,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <ActivityIndicator size="small" color="#00C853" />
              <Text style={{ color: "#6B7280", fontSize: 13, marginLeft: 6 }}>
                Thinking...
              </Text>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          padding: 12,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          backgroundColor: "#1E1E2E",
          borderTopWidth: 1,
          borderTopColor: "#2A2A3C",
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your finances..."
          placeholderTextColor="#6B7280"
          multiline
          maxLength={1000}
          style={{
            flex: 1,
            backgroundColor: "#2A2A3C",
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 10,
            color: "#fff",
            fontSize: 15,
            maxHeight: 100,
          }}
        />
        <Pressable
          onPress={() => handleSend()}
          disabled={isTyping || !input.trim()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: input.trim() && !isTyping ? "#00C853" : "#2A2A3C",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 8,
          }}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
