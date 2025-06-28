'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { database } from '../../firebase/firebase';
import { ref, onValue, get, update } from 'firebase/database';
import { notifications } from '@mantine/notifications';
import {
    Box,
    Text,
    Title,
    Group,
    Button,
    Textarea,
    Divider,
    Alert,
    ActionIcon,
    Tooltip,
    ScrollArea,
    Badge,
    Paper,
    Stack
} from '@mantine/core';
import { IconSend, IconCheck, IconX, IconArrowLeft } from '@tabler/icons-react';
import classes from './Messages.module.css';

const MessageDetail = ({ messageId, currentUser, onBack }) => {
    const { openComposeModal } = useAuth();
    const [thread, setThread] = useState([]);
    const [participants, setParticipants] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userResponse, setUserResponse] = useState(null);

    useEffect(() => {
        if (!messageId || !currentUser) return;
        setLoading(true);

        const fetchThread = async () => {
            try {
                const initialMsgRef = ref(database, `messages/${messageId}`);
                const initialMsgSnap = await get(initialMsgRef);
                if (!initialMsgSnap.exists()) {
                    setError("Message not found. It may have been deleted.");
                    setLoading(false);
                    return;
                }
                const initialMsg = { id: messageId, ...initialMsgSnap.val() };
                const threadId = initialMsg.threadId || messageId;

                const messagesQuery = ref(database, 'messages');
                const allMessagesSnap = await get(messagesQuery);
                const allMessages = allMessagesSnap.val() || {};

                const messagesInThread = Object.entries(allMessages)
                    .map(([id, data]) => ({ id, ...data }))
                    .filter(msg => msg.threadId === threadId);

                if (!messagesInThread.some(msg => msg.id === messageId)) {
                    messagesInThread.push(initialMsg);
                }

                messagesInThread.sort((a, b) => a.sentAt - b.sentAt);

                const userIds = new Set(messagesInThread.map(msg => msg.senderId));
                const userPromises = Array.from(userIds).map(uid => get(ref(database, `users/${uid}`)));
                const userSnapshots = await Promise.all(userPromises);
                const usersData = userSnapshots.reduce((acc, snap) => {
                    if (snap.exists()) acc[snap.key] = snap.val().name || snap.val().email;
                    return acc;
                }, {});

                setParticipants(usersData);
                setThread(messagesInThread);

            } catch (err) {
                console.error("Failed to load message thread:", err);
                setError("Could not load the conversation.");
            } finally {
                setLoading(false);
            }
        };

        fetchThread();

        const userResponseRef = ref(database, `/user-inboxes/${currentUser.uid}/${messageId}/userResponse`);
        const unsubUserResponse = onValue(userResponseRef, (snapshot) => {
            setUserResponse(snapshot.val() || null);
        });

        return () => unsubUserResponse();
    }, [messageId, currentUser]);

    const handleAction = async (action) => {
        const updates = {};
        updates[`/user-inboxes/${currentUser.uid}/${messageId}/userResponse`] = action;
        updates[`/messages/${messageId}/responses/${currentUser.uid}`] = action;

        try {
            await update(ref(database), updates);
            notifications.show({ title: 'Response Recorded', message: `Your response "${action}" has been saved.`, color: 'green' });
        } catch (err) {
            console.error("Failed to record response:", err);
            notifications.show({ title: 'Error', message: 'Could not record your response.', color: 'red' });
        }
    };

    const handleReply = () => {
        const originalMessage = thread.find(m => m.id === messageId) || thread[0];
        openComposeModal({
            recipientId: originalMessage.senderId,
            recipientName: participants[originalMessage.senderId] || 'Unknown',
            subject: `Re: ${thread[0].subject}`,
        });
    };

    // NOTE: Reply All functionality would require more complex logic to gather all unique participants.
    // For now, it will function the same as a standard reply.
    const handleReplyAll = () => {
        const originalMessage = thread.find(m => m.id === messageId) || thread[0];
        openComposeModal({
            recipientId: originalMessage.senderId,
            recipientName: participants[originalMessage.senderId] || 'Unknown',
            subject: `Re: ${thread[0].subject}`,
        });
    };

    if (loading) return <Text>Loading message...</Text>;
    if (error) return <Alert color="red" title="Error">{error}</Alert>;
    if (thread.length === 0) return <Text>Message not found.</Text>;

    const rootMessage = thread[0];
    const originalMessage = thread.find(m => m.id === messageId) || rootMessage;
    const canReply = !userResponse;

    return (
        <Box className={classes.detailView} style={{ height: 'calc(100vh - var(--navbar-height))' }}>
            <div className={classes.detailHeader}>
                <Group>
                    {onBack && (
                        <ActionIcon onClick={onBack} variant="subtle" aria-label="Back to messages">
                            <IconArrowLeft />
                        </ActionIcon>
                    )}
                    <Title order={4}>{rootMessage.subject}</Title>
                </Group>
            </div>

            <ScrollArea className={classes.detailBody}>
                <Stack gap="md">
                    {thread.map(msg => {
                        const isCurrentUser = msg.senderId === currentUser.uid;
                        const senderName = participants[msg.senderId] || 'Unknown';
                        return (
                            <div key={msg.id} className={`${classes.messageBubbleContainer} ${isCurrentUser ? classes.userMessage : classes.otherMessage}`}>
                                {!isCurrentUser && (
                                    <Text size="xs" c="dimmed" className={classes.bubbleHeader}>{senderName}</Text>
                                )}
                                <Paper shadow="sm" className={`${classes.messageBubble} ${isCurrentUser ? classes.userBubble : classes.otherBubble}`}>
                                    <Text style={{ whiteSpace: 'pre-wrap' }}>{msg.body}</Text>
                                </Paper>
                                <Text size="xs" c="dimmed" className={classes.bubbleMeta}>{new Date(msg.sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                            </div>
                        );
                    })}
                </Stack>
            </ScrollArea>

            <div className={classes.replySection}>
                {canReply ? (
                    <Group>
                        <Button variant="outline" onClick={handleReply}>Reply</Button>
                        {Object.keys(originalMessage?.recipients || {}).length > 1 && <Button variant="outline" onClick={handleReplyAll}>Reply All</Button>}
                        <Button color="green" leftSection={<IconCheck size={16} />} onClick={() => handleAction('Confirmed')}>Confirm</Button>
                        <Button color="red" leftSection={<IconX size={16} />} onClick={() => handleAction('Denied')}>Deny</Button>
                    </Group>
                ) : (
                    <Badge color={userResponse === 'Confirmed' ? 'green' : 'red'} size="lg" variant="light">You responded: {userResponse}</Badge>
                )}
            </div>
        </Box>
    );
};

export default MessageDetail;