'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  push as firebasePush,
  get,
  onValue,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import {
  Alert,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Textarea,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { database } from '../../firebase/firebase';
import { useAuth } from '../../hooks/useAuth';

const ComposeMessage = () => {
  const {
    user: currentUser,
    userData,
    campID,
    effectiveRole,
    isComposeModalOpen,
    closeComposeModal,
    composeInitialState,
  } = useAuth();

  const [campUsers, setCampUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isFormal, setIsFormal] = useState(false);
  const [canAddParticipants, setCanAddParticipants] = useState(true); // New state variable

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
    if (!isComposeModalOpen || !campID) { return; }

    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        const allUsersData = usersSnapshot.val() || {};

        const usersInCamp = Object.keys(allUsersData)
          .map((uid) => ({ id: uid, ...allUsersData[uid] }))
          .filter((u) => u.assignedCamps && u.assignedCamps[campID]);

        setCampUsers(usersInCamp);

        if (composeInitialState) {
          setSelectedUsers(
            composeInitialState.recipientId ? [composeInitialState.recipientId] : []
          );
          setSubject(composeInitialState.subject || '');
        }
      } catch (err) {
        notifications.show({
          title: 'Error',
          message: 'Error fetching initial data for composer: ' + err.message,
          color: 'red',
        });
        setError('Could not load recipient data.');
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
      setError('Please select at least one recipient.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject cannot be empty.');
      return;
    }
    if (!body.trim()) {
      setError('Message body cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const senderName = userData?.name || currentUser.displayName;

    if (!senderName) {
      setError('Could not determine your sender name. Please try again.');
      setIsSubmitting(false);
      return;
    }

    const newThreadRef = firebasePush(ref(database, 'threads'));
    const threadId = newThreadRef.key;
    const messageTimestamp = Date.now(); // Use client-side timestamp for message key

    const threadParticipants = selectedUsers.reduce((acc, userId) => {
      acc[userId] = true;
      return acc;
    }, {});
    // Add sender to participants
    threadParticipants[currentUser.uid] = true;

    const threadData = {
      name: subject.trim(),
      creatorId: currentUser.uid,
      lastMessageTimestamp: messageTimestamp,
      canAddParticipants: canAddParticipants, // New state variable
      messageType: isFormal ? 'Formal' : 'Social', // Renamed from isFormal to messageType
      participants: threadParticipants,
    };

    const initialMessageData = {
      senderId: currentUser.uid,
      body: body.trim(),
      sentAt: messageTimestamp,
      readBy: { [currentUser.uid]: true }, // Sender has read it
      complexContent: null, // Placeholder for future complex messages
    };

    const fanOutUpdates = {};

    // Nest the initial message directly within the threadData
    threadData.messages = {
      [messageTimestamp]: initialMessageData,
    };

    fanOutUpdates[`/threads/${threadId}`] = threadData;

    // Update user inboxes for all participants
    Object.keys(threadParticipants).forEach((uid) => {
      fanOutUpdates[`/user-inboxes/${uid}/${threadId}`] = {
        lastReadMessageTimestamp: messageTimestamp, // Mark as read for all initial participants
      };
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
      notifications.show({
        title: 'Error',
        message: 'Error sending message: ' + e.message,
        color: 'red',
      });
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userOptions = useMemo(() => {
    if (isLoadingData) return [];

    const options = (campUsers || [])
      .filter((user) => user.id !== currentUser?.uid)
      .map((user) => ({
        value: user.id,
        label: user.profile?.nickname || user.name || user.email,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (
      composeInitialState?.recipientId &&
      !options.some((opt) => opt.value === composeInitialState.recipientId)
    ) {
      options.unshift({
        value: composeInitialState.recipientId,
        label: composeInitialState.recipientName,
      });
    }

    return options;
  }, [isLoadingData, campUsers, currentUser, composeInitialState]);

  return (
    <Modal opened={isComposeModalOpen} onClose={handleClose} title="Compose Message" size="lg">
      {error && (
        <Alert color="red" title="Error" withCloseButton onClose={() => setError('')} mb="md">
          {error}
        </Alert>
      )}

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

          <Checkbox
            label="Allow others to add participants"
            checked={canAddParticipants}
            onChange={(e) => setCanAddParticipants(e.currentTarget.checked)}
            mb="md"
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
        <Button variant="default" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSend} loading={isSubmitting} disabled={isLoadingData}>
          Send
        </Button>
      </Group>
    </Modal>
  );
};

export default ComposeMessage;
