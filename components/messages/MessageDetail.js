'use client';

import React, { useState, useEffect } from 'react';
import { database } from '../../firebase/firebase';
import { ref, onValue, get, update, push, serverTimestamp } from 'firebase/database';
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
    Badge
} from '@mantine/core';
import { IconSend, IconCheck, IconX } from '@tabler/icons-react';
import classes from './Messages.module.css';

const MessageDetail = ({ messageId, currentUser }) => {
    const [message, setMessage] = useState(null);
    const [sender, setSender] = useState(null);
    const [recipients, setRecipients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userResponse, setUserResponse] = useState(null);

    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [replyType, setReplyType] = useState(null); // 'reply' or 'replyAll'

    useEffect(() => {
        setLoading(true);
        setIsReplying(false);
        setReplyText('');

        const userResponseRef = ref(database, `/user-inboxes/${currentUser.uid}/${messageId}/userResponse`);
        const unsubUserResponse = onValue(userResponseRef, (snapshot) => {
            setUserResponse(snapshot.val() || null);
        });

        const messageRef = ref(database, `messages/${messageId}`);
        const unsubscribeMessage = onValue(messageRef, async (snapshot) => {
            if (snapshot.exists()) {
                const messageData = snapshot.val();
                setMessage(messageData);

                const userIds = [messageData.senderId, ...Object.keys(messageData.recipients || {})];
                const userPromises = userIds.map(uid => get(ref(database, `users/${uid}`)));
                const userSnapshots = await Promise.all(userPromises);

                const usersData = userSnapshots.reduce((acc, snap) => {
                    if (snap.exists()) {
                        acc[snap.key] = { name: snap.val().name || snap.val().email, email: snap.val().email };
                    }
                    return acc;
                }, {});

                setSender(usersData[messageData.senderId] || { name: 'Unknown User' });
                setRecipients(Object.keys(messageData.recipients || {}).map(uid => usersData[uid]?.name || 'Unknown User'));

            } else {
                setError("Message not found. It may have been deleted.");
            }
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError("Failed to load message details.");
            setLoading(false);
        });

        return () => {
            unsubscribeMessage();
            unsubUserResponse();
        };
    }, [messageId, currentUser.uid]);

    const handleAction = async (action) => {
        const updates = {};
        updates[`/user-inboxes/${currentUser.uid}/${messageId}/userResponse`] = action;
        updates[`/messages/${messageId}/responses/${currentUser.uid}`] = action;

        try {
            await update(ref(database), updates);
            notifications.show({
                title: 'Response Recorded',
                message: `Your response "${action}" has been saved.`,
                color: 'green',
            });
        } catch (err) {
            console.error("Failed to record response:", err);
            notifications.show({
                title: 'Error',
                message: 'Could not record your response.',
                color: 'red',
            });
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        setIsSending(true);

        const newRecipients = {};
        if (replyType === 'reply') {
            newRecipients[message.senderId] = true;
        } else { // replyAll
            Object.keys(message.recipients || {}).forEach(uid => {
                if (uid !== currentUser.uid) newRecipients[uid] = true;
            });
            newRecipients[message.senderId] = true;
        }

        const recipientIds = Object.keys(newRecipients);

        const replyMessage = {
            senderId: currentUser.uid,
            sentAt: serverTimestamp(),
            subject: `Re: ${message.subject}`,
            body: replyText,
            messageType: message.messageType,
            areRecipientsVisible: true,
            parentMessageId: messageId,
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
    if (error) return <Alert color="red">{error}</Alert>;
    if (!message) return null;

    return (
        <Box className={classes.detailView}>
            <div className={classes.detailHeader}>
                <Title order={4}>{message.subject}</Title>
                <Text size="sm">From: <strong>{sender.name || 'Unknown Sender'}</strong></Text>
                {message.areRecipientsVisible && (
                    <Text size="xs" c="dimmed">To: {recipients.join(', ')}</Text>
                )}
            </div>

            <ScrollArea className={classes.detailBody}>
                <Text>{message.body}</Text>
            </ScrollArea>

            <div className={classes.replySection}>
                {isReplying ? (
                    <Box>
                        <Text size="sm" c="dimmed">
                            Replying to: {replyType === 'reply' ? (sender.name || 'Unknown Sender') : 'all recipients'}
                        </Text>
                        <Textarea
                            placeholder="Type your reply..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            minRows={3}
                        />
                        <Group justify="flex-end" mt="sm">
                            <Button variant="default" onClick={() => setIsReplying(false)}>Cancel</Button>
                            <Button loading={isSending} onClick={handleSendReply} leftSection={<IconSend size={16} />}>Send Reply</Button>
                        </Group>
                    </Box>
                ) : userResponse ? (
                    <Badge color="gray" size="lg">You responded: {userResponse}</Badge>
                ) : (
                    <Group>
                        <Button variant="outline" onClick={() => { setIsReplying(true); setReplyType('reply'); }}>Reply</Button>
                        {recipients.length > 1 && <Button variant="outline" onClick={() => { setIsReplying(true); setReplyType('replyAll'); }}>Reply All</Button>}
                        <Button color="green" leftSection={<IconCheck size={16} />} onClick={() => handleAction('Confirmed')}>Confirm</Button>
                        <Button color="red" leftSection={<IconX size={16} />} onClick={() => handleAction('Denied')}>Deny</Button>
                    </Group>
                )}
            </div>
        </Box>
    );
};

export default MessageDetail;