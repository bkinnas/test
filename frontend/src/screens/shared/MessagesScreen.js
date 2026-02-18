import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../services/api';
import { Avatar } from '../../components/common/Avatar';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { format } from 'date-fns';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

export function MessagesScreen({ route }) {
  const { bookingId, localName } = route.params;
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    let socket;

    async function setup() {
      // Load message history
      try {
        const data = await api.getMessages(bookingId);
        setMessages(data);
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to load messages.');
      } finally {
        setLoading(false);
      }

      // Connect socket
      const token = await SecureStore.getItemAsync('auth_token');
      socket = io(SOCKET_URL, { auth: { token } });
      socketRef.current = socket;

      socket.emit('join_booking', bookingId);

      socket.on('new_message', (msg) => {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      });
    }

    setup();

    return () => {
      if (socket) {
        socket.emit('leave_booking', bookingId);
        socket.disconnect();
      }
    };
  }, [bookingId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages.length]);

  async function handleSend() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setText('');
    try {
      const msg = await api.sendMessage({ booking_id: bookingId, content });
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send message.');
      setText(content); // Restore text on failure
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isMine = item.sender_id === user?.id;
          return (
            <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
              {!isMine && (
                <Avatar
                  uri={item.sender_avatar}
                  name={item.sender_name}
                  size={32}
                />
              )}
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {!isMine && (
                  <Text style={styles.senderName}>{item.sender_name}</Text>
                )}
                <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                  {item.content}
                </Text>
                <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>
                  {format(new Date(item.created_at), 'h:mm a')}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>
              No messages yet. Say hello to {localName}!
            </Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendIcon}>{sending ? '...' : '➤'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  messageRowMine: {
    flexDirection: 'row-reverse',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bubbleTheirs: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.sm,
  },
  senderName: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  messageTextMine: {
    color: Colors.textOnPrimary,
  },
  messageTime: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  messageTimeMine: {
    color: 'rgba(255,255,255,0.6)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.md },
  emptyText: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: Typography.fontSizes.md,
    lineHeight: 22,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSizes.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: Colors.textOnPrimary,
    fontSize: 18,
    fontWeight: Typography.fontWeights.bold,
  },
});
