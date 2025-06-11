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
    Stack
} from '@mantine/core';
import { IconSend, IconCheck, IconX } from '@tabler/icons-react';
import classes from './Messages.module.css';

// A new sub-component to render each message in the thread
const MessageBubble = ({ message, senderName }) => (
    <Paper withBorder p="sm" mb="sm" shadow="xs">
        <Group justify="space-between" mb="xs">
            <Text fw={700} size="sm">{senderName || 'Unknown Sender'}</Text>
            <Text size="xs" c="dimmed">{new Date(message.sentAt).toLocaleString()}</Text>
        </Group>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{message.body}</Text>
    </Paper>
);


const MessageDetail = ({ messageId, currentUser }) => {
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
                // First, get the selected message to find its threadId or parentId
                const initialMsgRef = ref(database, `messages/${messageId}`);
                const initialMsgSnap = await get(initialMsgRef);
                if (!initialMsgSnap.exists()) {
                    setError("Message not found. It may have been deleted.");
                    setLoading(false);
                    return;
                }
                const initialMsg = initialMsgSnap.val();
                const threadId = initialMsg.threadId || messageId; // A message is its own thread root if it has no threadId

                // Now, query for all messages in that thread
                const messagesRef = query(ref(database, 'messages'), orderByChild('threadId'), equalTo(threadId));
                const threadSnapshot = await get(messagesRef);

                let messagesInThread = [];
                if (threadSnapshot.exists()) {
                    messagesInThread = Object.entries(threadSnapshot.val()).map(([id, data]) => ({ id, ...data }));
                }

                // Add the root message if it wasn't returned by the query (in case it has no threadId field)
                if (!messagesInThread.some(msg => msg.id === threadId)) {
                    messagesInThread.push({ id: threadId, ...initialMsg });
                }

                messagesInThread.sort((a, b) => b.sentAt - a.sentAt); // Newest first

                // Get all participant names for the thread
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

    const handleSendReply = async () => {
        if (!replyText.trim() || thread.length === 0) return;
        setIsSending(true);

        const originalMessage = thread.find(m => m.id === messageId) || thread[thread.length - 1];
        const rootMessage = thread[thread.length - 1];

        const newRecipients = {};
        if (replyType === 'reply') {
            newRecipients[originalMessage.senderId] = true;
        } else {
            Object.keys(originalMessage.recipients || {}).forEach(uid => {
                if (uid !== currentUser.uid) newRecipients[uid] = true;
            });
            newRecipients[originalMessage.senderId] = true;
        }

        const recipientIds = Object.keys(newRecipients);

        const replyMessage = {
            senderId: currentUser.uid,
            sentAt: serverTimestamp(),
            subject: `Re: ${rootMessage.subject}`,
            body: replyText,
            messageType: rootMessage.messageType,
            areRecipientsVisible: true,
            parentMessageId: messageId,
            threadId: rootMessage.id, // Link back to the root message
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

    const rootMessage = thread[thread.length - 1]; // Oldest message is the root
    const originalMessage = thread.find(m => m.id === messageId);

    const getBadgeColor = (response) => {
        if (response === 'Confirmed') return 'green';
        if (response === 'Denied') return 'red';
        return 'gray';
    };

    return (
        <Box className={classes.detailView}>
            <div className={classes.detailHeader}>
                <Title order={4}>{rootMessage.subject}</Title>
            </div>

            <ScrollArea className={classes.detailBody}>
                {thread.map(msg => (
                    <MessageBubble key={msg.id} message={msg} senderName={participants[msg.senderId]} />
                ))}
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
                    <Badge color={getBadgeColor(userResponse)} size="lg" variant="light">You responded: {userResponse}</Badge>
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