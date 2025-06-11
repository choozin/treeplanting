'use client';

import React, { useState, useEffect } from 'react';
import { database } from '../../firebase/firebase';
import { ref, onValue, get, update, push, serverTimestamp, query, orderByChild, equalTo } from 'firebase/database';
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
    Stack,
    Paper
} from '@mantine/core';
import { IconSend, IconCheck, IconX, IconArrowLeft } from '@tabler/icons-react';
import classes from './Messages.module.css';

const MessageDetail = ({ messageId, currentUser, onBack }) => {
    const [thread, setThread] = useState([]);
    const [participants, setParticipants] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userResponse, setUserResponse] = useState(null);

    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [replyType, setReplyType] = useState(null);

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
                const initialMsg = initialMsgSnap.val();
                const threadId = initialMsg.threadId || messageId;

                const messagesRef = query(ref(database, 'messages'), orderByChild('threadId'), equalTo(threadId));
                const threadSnapshot = await get(messagesRef);

                let messagesInThread = [];
                if (threadSnapshot.exists()) {
                    messagesInThread = Object.entries(threadSnapshot.val()).map(([id, data]) => ({ id, ...data }));
                } else {
                    messagesInThread.push({ id: messageId, ...initialMsg });
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
                setError("Could not load the conversation. Ensure database rules are set correctly.");
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

    const handleSendReply = async () => {
        if (!replyText.trim() || thread.length === 0) return;
        setIsSending(true);

        const originalMessage = thread.find(m => m.id === messageId) || thread[0];
        const rootMessage = thread[0];

        const newRecipients = {};
        if (replyType === 'reply') {
            if (originalMessage.senderId !== currentUser.uid) {
                newRecipients[originalMessage.senderId] = true;
            }
        } else {
            Object.keys(originalMessage.recipients || {}).forEach(uid => {
                if (uid !== currentUser.uid) newRecipients[uid] = true;
            });
            if (originalMessage.senderId !== currentUser.uid) {
                newRecipients[originalMessage.senderId] = true;
            }
        }

        const recipientIds = Object.keys(newRecipients);
        if (recipientIds.length === 0) {
            notifications.show({ title: 'No recipients', message: "You are the only one in this conversation.", color: 'orange' });
            setIsSending(false);
            return;
        }

        const replyMessage = {
            senderId: currentUser.uid,
            sentAt: serverTimestamp(),
            subject: `Re: ${rootMessage.subject}`,
            body: replyText,
            messageType: rootMessage.messageType,
            areRecipientsVisible: true,
            parentMessageId: messageId,
            threadId: rootMessage.threadId || rootMessage.id,
            liveCopies: recipientIds.length,
            recipients: newRecipients,
        };

        const newMessageRef = push(ref(database, 'messages'));
        const newId = newMessageRef.key;

        const fanOutUpdates = {};
        fanOutUpdates[`/messages/${newId}`] = replyMessage;

        const senderName = currentUser.displayName || currentUser.email;

        recipientIds.forEach(uid => {
            fanOutUpdates[`/user-inboxes/${uid}/${newId}`] = {
                isRead: false,
                senderName: senderName,
                subject: replyMessage.subject,
                sentAt: serverTimestamp(),
                messageType: replyMessage.messageType,
                recipientCount: recipientIds.length,
                areRecipientsVisible: true
            };
        });

        try {
            await update(ref(database), fanOutUpdates);
            notifications.show({ title: 'Reply Sent', message: 'Your message has been sent successfully.', color: 'blue' });
            setIsReplying(false);
            setReplyText('');
        } catch (err) {
            console.error("Failed to send reply:", err);
            notifications.show({ title: 'Error', message: 'Failed to send your reply.', color: 'red' });
        } finally {
            setIsSending(false);
        }
    };

    if (loading) return <Text>Loading message...</Text>;
    if (error) return <Alert color="red" title="Error">{error}</Alert>;
    if (thread.length === 0) return <Text>Message not found.</Text>;

    const rootMessage = thread[0];
    const originalMessage = thread.find(m => m.id === messageId) || rootMessage;

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
                {isReplying ? (
                    <Box>
                        <Textarea placeholder="Type your reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} minRows={3} />
                        <Group justify="flex-end" mt="sm">
                            <Button variant="default" onClick={() => setIsReplying(false)}>Cancel</Button>
                            <Button loading={isSending} onClick={handleSendReply} leftSection={<IconSend size={16} />}>Send Reply</Button>
                        </Group>
                    </Box>
                ) : userResponse ? (
                    <Badge color={userResponse === 'Confirmed' ? 'green' : 'red'} size="lg" variant="light">You responded: {userResponse}</Badge>
                ) : (
                    <Group>
                        <Button variant="outline" onClick={() => { setIsReplying(true); setReplyType('reply'); }}>Reply</Button>
                        {Object.keys(originalMessage?.recipients || {}).length > 1 && <Button variant="outline" onClick={() => { setIsReplying(true); setReplyType('replyAll'); }}>Reply All</Button>}
                        <Button color="green" leftSection={<IconCheck size={16} />} onClick={() => handleAction('Confirmed')}>Confirm</Button>
                        <Button color="red" leftSection={<IconX size={16} />} onClick={() => handleAction('Denied')}>Deny</Button>
                    </Group>
                )}
            </div>
        </Box>
    );
};

export default MessageDetail;