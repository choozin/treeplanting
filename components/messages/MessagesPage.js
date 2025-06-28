'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { database } from '../../firebase/firebase';
import { ref, onValue, update, set, push, serverTimestamp } from 'firebase/database';
import { Container, Grid, Paper, Title, Text, Button, Alert, Center, Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconPlus, IconAlertCircle } from '@tabler/icons-react';
import MessageList from './MessageList';
import MessageDetail from './MessageDetail';

const MessagesPage = ({ user, effectiveRole, campID }) => {
    const { openComposeModal } = useAuth(); // Use the global modal function
    const [messages, setMessages] = useState([]);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMobile = useMediaQuery('(max-width: 768px)');

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const userInboxRef = ref(database, `user-inboxes/${user.uid}`);
        const unsubscribe = onValue(userInboxRef, (snapshot) => {
            if (snapshot.exists()) {
                const inboxData = snapshot.val();
                const messagesArray = Object.entries(inboxData).map(([id, data]) => ({
                    id,
                    ...data,
                }));
                messagesArray.sort((a, b) => b.sentAt - a.sentAt);
                setMessages(messagesArray);
            } else {
                setMessages([]);
            }
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching messages:", err);
            setError("Could not load your messages.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleSelectMessage = async (message) => {
        setSelectedMessage(message);
        if (!message.isRead) {
            const messageReadRef = ref(database, `user-inboxes/${user.uid}/${message.id}/isRead`);
            try {
                await set(messageReadRef, true);
            } catch (err) {
                console.error("Failed to mark message as read:", err);
            }
        }
    };
    
    if (isLoading) return <Text>Loading Messages...</Text>;
    if (error) return <Alert color="red">{error}</Alert>;

    if (!campID) {
        return (
            <Container size="xs" mt="xl"><Alert color="blue" title="Select a Camp" icon={<IconAlertCircle />}>Please select a camp from the main navigation menu to use messaging.</Alert></Container>
        );
    }

    // On mobile, show either the list or the detail view. On desktop, show both.
    if (isMobile) {
        return (
            <Container fluid>
                {selectedMessage ? (
                    <MessageDetail
                        messageId={selectedMessage.id}
                        currentUser={user}
                        onBack={() => setSelectedMessage(null)}
                    />
                ) : (
                    <Paper withBorder>
                        <Group justify="space-between" p="md">
                            <Title order={4}>Inbox</Title>
                            <Button onClick={() => openComposeModal()} size="xs" leftSection={<IconPlus size={16} />}>
                                New Message
                            </Button>
                        </Group>
                        <MessageList
                            messages={messages}
                            onSelectMessage={handleSelectMessage}
                            selectedMessageId={null} // No message is "selected" when the list is visible
                            currentUser={user}
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
                            <Button onClick={() => openComposeModal()} size="xs" leftSection={<IconPlus size={16} />}>
                                New Message
                            </Button>
                        </Group>
                        <MessageList
                            messages={messages}
                            onSelectMessage={handleSelectMessage}
                            selectedMessageId={selectedMessage?.id}
                            currentUser={user}
                        />
                    </Paper>
                </Grid.Col>
                <Grid.Col span={8}>
                    <Paper withBorder style={{ minHeight: 'calc(100vh - 120px)' }}>
                        {selectedMessage ? (
                            <MessageDetail
                                messageId={selectedMessage.id}
                                currentUser={user}
                            />
                        ) : (
                            <Center style={{ height: '100%' }}>
                                <Text c="dimmed">Select a message to read</Text>
                            </Center>
                        )}
                    </Paper>
                </Grid.Col>
            </Grid>
        </Container>
    );
};

export default MessagesPage;