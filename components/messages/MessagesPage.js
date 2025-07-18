'use client';

import React, { useEffect, useState } from 'react';
import { IconAlertCircle, IconPlus } from '@tabler/icons-react';
import { get, onValue, push, ref, serverTimestamp, set, update } from 'firebase/database';
import { Alert, Button, Center, Container, Grid, Group, Paper, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { database } from '../../firebase/firebase';
import { useAuth } from '../../hooks/useAuth';
import MessageDetail from './MessageDetail';
import MessageList from './MessageList';

const MessagesPage = ({ user, effectiveRole, campID }) => {
  const { openComposeModal } = useAuth(); // Use the global modal function
  const modals = useModals();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [usersMap, setUsersMap] = useState({}); // New state for user names

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = ref(database, 'users');
      onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val() || {};
        const map = {};
        for (const uid in usersData) {
          map[uid] =
            usersData[uid].profile?.nickname || usersData[uid].name || usersData[uid].email;
        }
        setUsersMap(map);
      });
    };
    fetchUsers();
  }, []); // Run once on mount

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const userInboxRef = ref(database, `user-inboxes/${user.uid}`);
    const unsubscribe = onValue(
      userInboxRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const inboxData = snapshot.val();
          const threadIds = Object.keys(inboxData);

          const fetchedThreads = [];
          for (const threadId of threadIds) {
            const threadRef = ref(database, `threads/${threadId}`);
            const threadSnapshot = await get(threadRef);
            if (threadSnapshot.exists()) {
              const threadData = threadSnapshot.val();
              // Get all messages for the thread
              const messagesRef = ref(database, `threads/${threadId}/messages`);
              const messagesSnapshot = await get(messagesRef);
              const messagesData = messagesSnapshot.val();

              let firstMessage = null;
              let lastMessage = null;

              if (messagesData) {
                const sortedMessageKeys = Object.keys(messagesData).sort();
                const firstMessageKey = sortedMessageKeys[0];
                const lastMessageKey = sortedMessageKeys[sortedMessageKeys.length - 1];

                firstMessage = messagesData[firstMessageKey];
                lastMessage = messagesData[lastMessageKey];
              }

              fetchedThreads.push({
                id: threadId,
                ...threadData,
                firstMessage: firstMessage,
                lastMessage: lastMessage,
                lastReadMessageTimestamp: inboxData[threadId].lastReadMessageTimestamp || 0,
              });
            }
          }
          fetchedThreads.sort(
            (a, b) => (b.lastMessage?.sentAt || 0) - (a.lastMessage?.sentAt || 0)
          );
          setThreads(fetchedThreads);
        } else {
          setThreads([]);
        }
        setIsLoading(false);
      },
      (err) => {
        notifications.show({
          title: 'Error',
          message: 'Error fetching threads: ' + err.message,
          color: 'red',
        });
        setError('Could not load your threads.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleSelectThread = async (thread) => {
    setSelectedThread(thread);
    // Update lastReadMessageTimestamp in user's inbox
    const lastMessageTimestamp = thread.lastMessage?.sentAt || 0;
    if (lastMessageTimestamp > (thread.lastReadMessageTimestamp || 0)) {
      const userThreadReadRef = ref(
        database,
        `user-inboxes/${user.uid}/${thread.id}/lastReadMessageTimestamp`
      );
      try {
        await set(userThreadReadRef, lastMessageTimestamp);
      } catch (err) {
        notifications.show({
          title: 'Error',
          message: 'Failed to update last read message timestamp: ' + err.message,
          color: 'red',
        });
      }
    }
  };

  const handleDeleteThread = async (threadId) => {
    modals.openConfirmModal({
      title: 'Remove Conversation',
      children: (
        <Text size="sm">
          Are you sure you want to remove this conversation from your inbox? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Remove', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await set(ref(database, `user-inboxes/${user.uid}/${threadId}`), null);
          notifications.show({
            title: 'Conversation Removed',
            message: 'The conversation has been removed from your inbox.',
            color: 'green',
          });
        } catch (err) {
          notifications.show({
            title: 'Error',
            message: 'Failed to remove conversation: ' + err.message,
            color: 'red',
          });
        }
      },
    });
  };

  if (isLoading) { return <Text>Loading Messages...</Text>; }
  if (error) { return <Alert color="red">{error}</Alert>; }

  if (!campID) {
    return (
      <Container size="xs" mt="xl">
        <Alert color="blue" title="Select a Camp" icon={<IconAlertCircle />}>
          Please select a camp from the main navigation menu to use messaging.
        </Alert>
      </Container>
    );
  }

  // On mobile, show either the list or the detail view. On desktop, show both.
  if (isMobile) {
    return (
      <Container fluid>
        {selectedThread ? (
          <MessageDetail
            threadId={selectedThread.id}
            currentUser={user}
            onBack={() => setSelectedThread(null)}
          />
        ) : (
          <Paper withBorder>
            <Group justify="space-between" p="md">
              <Title order={4}>Inbox</Title>
              <Button
                onClick={() => openComposeModal()}
                size="xs"
                leftSection={<IconPlus size={16} />}
              >
                New Message
              </Button>
            </Group>
            <MessageList
              threads={threads}
              onSelectThread={handleSelectThread}
              selectedThreadId={null} // No thread is "selected" when the list is visible
              currentUser={user}
              onDeleteThread={handleDeleteThread}
              usersMap={usersMap} // Pass usersMap
            />
          </Paper>
        )}
      </Container>
    );
  }

  // Desktop view
  return (
    <Container fluid>
      <Grid>
        <Grid.Col span={4}>
          <Paper withBorder>
            <Group justify="space-between" p="md">
              <Title order={4}>Inbox</Title>
              <Button
                onClick={() => openComposeModal()}
                size="xs"
                leftSection={<IconPlus size={16} />}
              >
                New Message
              </Button>
            </Group>
            <MessageList
              threads={threads}
              onSelectThread={handleSelectThread}
              selectedThreadId={selectedThread?.id}
              currentUser={user}
              onDeleteThread={handleDeleteThread}
              usersMap={usersMap} // Pass usersMap
            />
          </Paper>
        </Grid.Col>
        <Grid.Col span={8}>
          <Paper withBorder style={{ minHeight: 'calc(100vh - 120px)' }}>
            {selectedThread ? (
              <MessageDetail threadId={selectedThread.id} currentUser={user} />
            ) : (
              <Center style={{ height: '100%' }}>
                <Text c="dimmed">Select a conversation to read</Text>
              </Center>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
};

export default MessagesPage;
