'use client';

import React from 'react';
import { IconTrash } from '@tabler/icons-react';
import { ActionIcon, Box, Center, Group, ScrollArea, Text, Tooltip } from '@mantine/core';
import classes from './Messages.module.css';

const MessageList = ({
  threads,
  onSelectThread,
  selectedThreadId,
  currentUser,
  onDeleteThread,
  usersMap,
}) => {
  const getUserDisplayName = (uid) => {
    if (!uid) { return 'Unknown'; }
    return usersMap[uid] || 'Unknown';
  };

  const getRelativeTime = (timestamp) => {
    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
      if (typeof timestamp === 'object' && timestamp !== null && timestamp['.sv'] === 'timestamp') {
        return 'Sending...';
      }
      return 'Invalid Date';
    }

    const now = new Date();
    const messageDate = new Date(timestamp);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate()
    );

    if (today.getTime() === messageDay.getTime()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const diffDays = Math.round((today.getTime() - messageDay.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) { return 'Yesterday'; }
    if (diffDays < 7) { return `${diffDays} days ago`; }

    return messageDate.toLocaleDateString();
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Formal':
        return 'red';
      case 'Operational':
        return 'yellow';
      case 'Social':
        return 'green';
      case 'System':
        return 'blue';
      default:
        return 'gray';
    }
  };

  if (!threads || threads.length === 0) {
    return (
      <Center style={{ height: '200px' }}>
        <Text c="dimmed">Your inbox is empty.</Text>
      </Center>
    );
  }

  return (
    <ScrollArea style={{ height: 'calc(100vh - 180px)' }}>
      <Text size="xs" c="dimmed" p="xs">
        Your inbox shows your conversations.
      </Text>
      {threads.map((thread) => {
        const isSelected = selectedThreadId === thread.id;
        const isUnread = (thread.lastMessage?.sentAt || 0) > (thread.lastReadMessageTimestamp || 0);

        return (
          <Box
            key={thread.id}
            className={`${classes.messageListItem} ${isSelected ? classes.messageListItemSelected : ''}`}
          >
            <div
              className={classes.typeIndicator}
              style={{
                backgroundColor: `var(--mantine-color-${getTypeColor(thread.messageType)}-6)`,
              }}
            />
            <div className={classes.messageContent} onClick={() => onSelectThread(thread)}>
              <div className={classes.messageHeader}>
                <Text truncate className={isUnread ? classes.subjectUnread : classes.subject}>
                  {thread.name || '(No Subject)'}
                  {!isUnread && thread.creatorId && ` - ${getUserDisplayName(thread.creatorId)}`}
                </Text>
                <Text className={classes.messageDate}>
                  {getRelativeTime(thread.lastMessage?.sentAt)}
                </Text>
              </div>
              <Group justify="space-between" wrap="nowrap">
                <Text truncate className={isUnread ? classes.senderNameUnread : classes.senderName}>
                  {isUnread
                    ? `${thread.firstMessage?.body || 'No messages yet.'}`
                    : `${thread.lastMessage?.body || 'No messages yet.'}`}
                </Text>
                <Text c="dimmed" style={{ minWidth: '12ch', textAlign: 'right' }}>
                  {isUnread
                    ? `(Started by: ${getUserDisplayName(thread.creatorId)})`
                    : `(Last by: ${getUserDisplayName(thread.lastMessage?.senderId)})`}
                </Text>
              </Group>
            </div>
            <ActionIcon
              variant="subtle"
              color="gray"
              className={classes.deleteButton}
              onClick={(e) => {
                e.stopPropagation(); // Prevent selecting the thread
                onDeleteThread(thread.id);
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
            <div
              className={classes.bottomIndicator}
              style={{
                backgroundColor: `var(--mantine-color-${getTypeColor(thread.messageType)}-2)`,
              }}
            />
          </Box>
        );
      })}
    </ScrollArea>
  );
};

export default MessageList;
