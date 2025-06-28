'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { database } from '../../firebase/firebase';
import { ref, onValue, set, push as firebasePush, serverTimestamp, get, update } from 'firebase/database';
import { Modal, Button, TextInput, Textarea, MultiSelect, Checkbox, Group, Alert, Center, Loader } from '@mantine/core';
import { notifications } from '@mantine/notifications';

const ComposeMessage = () => {
    const { user: currentUser, userData, campID, effectiveRole, isComposeModalOpen, closeComposeModal, composeInitialState } = useAuth();

    const [campUsers, setCampUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isFormal, setIsFormal] = useState(false);

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const resetState = () => {
        setSelectedUsers([]);
        setSubject('');
        setBody('');
        setIsFormal(false);
        setError('');
        setCampUsers([]);
    };

    useEffect(() => {
        if (!isComposeModalOpen || !campID) return;

        const loadData = async () => {
            setIsLoadingData(true);
            try {
                const usersRef = ref(database, 'users');
                const usersSnapshot = await get(usersRef);
                const allUsersData = usersSnapshot.val() || {};

                const usersInCamp = Object.keys(allUsersData)
                    .map(uid => ({ id: uid, ...allUsersData[uid] }))
                    .filter(u => u.assignedCamps && u.assignedCamps[campID]);

                setCampUsers(usersInCamp);

                if (composeInitialState) {
                    setSelectedUsers(composeInitialState.recipientId ? [composeInitialState.recipientId] : []);
                    setSubject(composeInitialState.subject || '');
                }

            } catch (err) {
                console.error("Error fetching initial data for composer:", err);
                setError("Could not load recipient data.");
            } finally {
                setIsLoadingData(false);
            }
        };

        loadData();

    }, [isComposeModalOpen, campID, composeInitialState]);

    const handleClose = () => {
        closeComposeModal();
        resetState();
    };

    const handleSend = async () => {
        if (selectedUsers.length === 0) {
            setError("Please select at least one recipient.");
            return;
        }
        if (!subject.trim()) {
            setError("Subject cannot be empty.");
            return;
        }
        if (!body.trim()) {
            setError("Message body cannot be empty.");
            return;
        }

        setIsSubmitting(true);
        setError('');

        const senderName = userData?.name || currentUser.displayName;

        if (!senderName) {
            setError("Could not determine your sender name. Please try again.");
            setIsSubmitting(false);
            return;
        }

        // **FIX:** Use the imported alias `firebasePush` instead of `push`
        const newMessageRef = firebasePush(ref(database, 'messages'));
        const messageId = newMessageRef.key;

        const messageData = {
            senderId: currentUser.uid,
            subject: subject.trim(),
            body: body.trim(),
            sentAt: serverTimestamp(),
            recipients: selectedUsers.reduce((acc, userId) => {
                acc[userId] = true;
                return acc;
            }, {}),
            isFormal: isFormal,
            campId: campID,
            threadId: messageId,
            liveCopies: selectedUsers.length,
            messageType: isFormal ? 'Formal' : 'Social',
            areRecipientsVisible: true,
        };

        const fanOutUpdates = {};
        fanOutUpdates[`/messages/${messageId}`] = messageData;

        selectedUsers.forEach(uid => {
            const inboxItem = {
                isRead: false,
                senderName: senderName,
                subject: messageData.subject,
                sentAt: serverTimestamp(),
                messageType: messageData.messageType,
                recipientCount: selectedUsers.length,
                areRecipientsVisible: messageData.areRecipientsVisible,
            };
            fanOutUpdates[`/user-inboxes/${uid}/${messageId}`] = inboxItem;
        });

        try {
            await update(ref(database), fanOutUpdates);
            notifications.show({
                title: 'Message Sent!',
                message: 'Your message has been successfully sent.',
                color: 'green',
            });
            handleClose();
        } catch (e) {
            console.error("Error sending message:", e);
            setError("Failed to send message. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const userOptions = useMemo(() => {
        if (isLoadingData) return [];

        const options = (campUsers || [])
            .filter(user => user.id !== currentUser?.uid)
            .map(user => ({
                value: user.id,
                label: user.profile?.nickname || user.name || user.email
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        if (composeInitialState?.recipientId && !options.some(opt => opt.value === composeInitialState.recipientId)) {
            options.unshift({
                value: composeInitialState.recipientId,
                label: composeInitialState.recipientName,
            });
        }

        return options;
    }, [isLoadingData, campUsers, currentUser, composeInitialState]);

    return (
        <Modal opened={isComposeModalOpen} onClose={handleClose} title="Compose Message" size="lg">
            {error && <Alert color="red" title="Error" withCloseButton onClose={() => setError('')} mb="md">{error}</Alert>}

            {isLoadingData ? (
                <Center style={{ height: 280 }}>
                    <Loader />
                </Center>
            ) : (
                <>
                    <MultiSelect
                        label="To:"
                        placeholder="Select recipients"
                        data={userOptions}
                        value={selectedUsers}
                        onChange={setSelectedUsers}
                        searchable
                        required
                        mb="sm"
                    />
                    <TextInput
                        label="Subject:"
                        placeholder="Enter message subject"
                        value={subject}
                        onChange={(e) => setSubject(e.currentTarget.value)}
                        required
                        mb="sm"
                    />
                    <Textarea
                        label="Message:"
                        placeholder="Your message here..."
                        value={body}
                        onChange={(e) => setBody(e.currentTarget.value)}
                        required
                        minRows={6}
                        mb="sm"
                    />

                    {effectiveRole >= 5 && (
                        <Checkbox
                            label="Send as Formal Announcement"
                            checked={isFormal}
                            onChange={(e) => setIsFormal(e.currentTarget.checked)}
                            mb="md"
                        />
                    )}
                </>
            )}

            <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleSend} loading={isSubmitting} disabled={isLoadingData}>Send</Button>
            </Group>
        </Modal>
    );
};

export default ComposeMessage;