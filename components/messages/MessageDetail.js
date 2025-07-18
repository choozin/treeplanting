'use client';

import React, { useEffect, useState } from 'react';
import { IconArrowLeft, IconCheck, IconSend, IconTrash, IconX } from '@tabler/icons-react';
import { get, onValue, ref, set, update } from 'firebase/database';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { useModals } from '@mantine/modals';
import { database } from '../../firebase/firebase';
import { useAuth } from '../../hooks/useAuth';
import classes from './Messages.module.css';

const MessageDetail = ({ threadId, currentUser, onBack }) => {
  const { openComposeModal } = useAuth();
  const modals = useModals();
  const [threadData, setThreadData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessageBody, setNewMessageBody] = useState(''); // New state for new message input

  useEffect(() => {
    if (!threadId || !currentUser) { return; }
    setLoading(true);

    const threadRef = ref(database, `threads/${threadId}`);
    const messagesRef = ref(database, `threads/${threadId}/messages`);

    const unsubscribeThread = onValue(
      threadRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setThreadData(data);

          // Fetch participant names
          const participantIds = Object.keys(data.participants || {});
          const usersData = {};
          for (const uid of participantIds) {
            const userSnap = await get(ref(database, `users/${uid}`));
            if (userSnap.exists()) {
              usersData[uid] =
                userSnap.val().profile?.nickname || userSnap.val().name || userSnap.val().email;
            }
          }
          setParticipants(usersData);
        } else {
          setError('Thread not found.');
        }
        setLoading(false);
      },
      (err) => {
        notifications.show({
          title: 'Error',
          message: 'Error fetching thread data: ' + err.message,
          color: 'red',
        });
        setError('Could not load thread data.');
        setLoading(false);
      }
    );

    const unsubscribeMessages = onValue(
      messagesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const msgs = snapshot.val();
          const messagesList = Object.keys(msgs)
            .map((key) => ({
              id: key,
              ...msgs[key],
            }))
            .sort((a, b) => a.sentAt - b.sentAt);
          setMessages(messagesList);
        } else {
          setMessages([]);
        }
      },
      (err) => {
        notifications.show({
          title: 'Error',
          message: 'Error fetching messages: ' + err.message,
          color: 'red',
        });
        setError('Could not load messages.');
      }
    );

    return () => {
      unsubscribeThread();
      unsubscribeMessages();
    };
  }, [threadId, currentUser]);

  const handleSendMessage = async () => {
    if (!newMessageBody.trim()) { return; }

    const messageTimestamp = Date.now();
    const newMessageRef = ref(database, `threads/${threadId}/messages/${messageTimestamp}`);

    const messageData = {
      senderId: currentUser.uid,
      body: newMessageBody.trim(),
      sentAt: messageTimestamp,
      readBy: { [currentUser.uid]: true }, // Sender has read it
      complexContent: null, // Placeholder
    };

    try {
      await set(newMessageRef, messageData);
      // Update lastMessageTimestamp in thread
      await update(ref(database, `threads/${threadId}`), {
        lastMessageTimestamp: messageTimestamp,
      });

      // Update readBy for all participants in the thread
      const updates = {};
      Object.keys(threadData.participants || {}).forEach((uid) => {
        updates[`threads/${threadId}/messages/${messageTimestamp}/readBy/${uid}`] = true;
      });
      await update(ref(database), updates);

      setNewMessageBody('');
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to send message: ' + err.message, color: 'red' });
      notifications.show({ title: 'Error', message: 'Failed to send message.', color: 'red' });
    }
  };

  const handleDeleteMessage = async (messageTimestampToDelete) => {
    modals.openConfirmModal({
      title: 'Delete Message',
      children: (
        <Text size="sm">
          Are you sure you want to delete this message? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await set(ref(database, `threads/${threadId}/messages/${messageTimestampToDelete}`), null);
          notifications.show({
            title: 'Message Deleted',
            message: 'Message has been deleted.',
            color: 'green',
          });
        } catch (err) {
          notifications.show({ title: 'Error', message: 'Failed to delete message: ' + err.message, color: 'red' });
        }
      },
    });
  };

  if (loading) { return <Text>Loading conversation...</Text>; }
  if (error) {
    return (
      <Alert color="red" title="Error">
        {error}
      </Alert>
    );
  }
  if (!threadData) { return <Text>Conversation not found.</Text>; }

  const isCreator = threadData.creatorId === currentUser.uid;
  const canAddParticipants = threadData.canAddParticipants || isCreator;

  return (
    <Box className={classes.detailView} style={{ height: 'calc(100vh - var(--navbar-height))' }}>
      <div className={classes.detailHeader}>
        <Group justify="space-between" align="center">
          <Group>
            {onBack && (
              <ActionIcon onClick={onBack} variant="subtle" aria-label="Back to conversations">
                <IconArrowLeft />
              </ActionIcon>
            )}
            <Title order={4}>{threadData.name}</Title>
          </Group>
          {canAddParticipants && (
            <Button
              size="xs"
              onClick={() =>
                notifications.show({
                  title: 'Add Participant',
                  message: 'Functionality to be implemented.',
                })
              }
            >
              Add Participant
            </Button>
          )}
        </Group>
        <Text size="sm" c="dimmed">
          Participants: {Object.values(participants).join(', ')}
        </Text>
      </div>

      <ScrollArea className={classes.detailBody}>
        <Stack gap="md">
          {messages.map((msg) => {
            const isCurrentUser = msg.senderId === currentUser.uid;
            const senderName = participants[msg.senderId] || 'Unknown';
            return (
              <div
                key={msg.id}
                className={`${classes.messageBubbleContainer} ${isCurrentUser ? classes.userMessage : classes.otherMessage}`}
              >
                {!isCurrentUser && (
                  <Text size="xs" c="dimmed" className={classes.bubbleHeader}>
                    {senderName}
                  </Text>
                )}
                <Paper
                  shadow="sm"
                  className={`${classes.messageBubble} ${isCurrentUser ? classes.userBubble : classes.otherBubble}`}
                >
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{msg.body}</Text>
                  {msg.complexContent && (
                    <Text size="xs" c="dimmed" mt="xs">
                      [Complex Content]
                    </Text>
                  )}
                </Paper>
                <Group justify={isCurrentUser ? 'flex-end' : 'flex-start'} gap="xs">
                  <Text size="xs" c="dimmed" className={classes.bubbleMeta}>
                    {new Date(msg.sentAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                  {isCurrentUser && (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="xs"
                      onClick={() => handleDeleteMessage(msg.id)}
                    >
                      <IconTrash size={12} />
                    </ActionIcon>
                  )}
                </Group>
              </div>
            );
          })}
        </Stack>
      </ScrollArea>

      <div className={classes.replySection}>
        <Group wrap="nowrap" align="flex-end">
          <Textarea
            placeholder="Type your message..."
            value={newMessageBody}
            onChange={(event) => setNewMessageBody(event.currentTarget.value)}
            minRows={1}
            maxRows={4}
            autosize
            style={{ flexGrow: 1 }}
          />
          <Button onClick={handleSendMessage} rightSection={<IconSend size={16} />}>
            Send
          </Button>
        </Group>
      </div>
    </Box>
  );
};

export default MessageDetail;
