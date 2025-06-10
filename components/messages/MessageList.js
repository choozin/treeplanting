'use client';

import React from 'react';
import { ScrollArea, Box, Text, Group, Tooltip, Center } from '@mantine/core';
import classes from './Messages.module.css';

const MessageList = ({ messages, onSelectMessage, selectedMessageId, currentUser }) => {

    const getRelativeTime = (timestamp) => {
        if (!timestamp) return '';
        const now = new Date();
        const messageDate = new Date(timestamp);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());

        if (today.getTime() === messageDay.getTime()) {
            return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        const diffDays = Math.round((today - messageDay) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return messageDate.toLocaleDateString();
    };

    const getTypeColor = (type) => {
        switch(type) {
            case 'Formal': return 'red';
            case 'Operational': return 'yellow';
            case 'Social': return 'green';
            case 'System': return 'blue';
            default: return 'gray';
        }
    };

    if (!messages || messages.length === 0) {
        return (
            <Center style={{height: '200px'}}>
                <Text c="dimmed">Your inbox is empty.</Text>
            </Center>
        );
    }
    
    return (
        <ScrollArea style={{ height: 'calc(100vh - 180px)'}}>
             <Text size="xs" c="dimmed" p="xs">Your inbox shows the 20 most recent messages.</Text>
            {messages.map((message) => {
                const isSelected = selectedMessageId === message.id;
                const isUnread = !message.isRead;
                const recipientText = message.recipientCount > 1
                    ? `To: You + ${message.recipientCount - 1} others`
                    : 'To: You';

                return (
                    <Box
                        key={message.id}
                        className={`${classes.messageListItem} ${isSelected ? classes.messageListItemSelected : ''}`}
                        onClick={() => onSelectMessage(message)}
                    >
                        <div className={classes.typeIndicator} style={{ backgroundColor: `var(--mantine-color-${getTypeColor(message.messageType)}-6)` }} />
                        <div className={classes.messageContent}>
                            <div className={classes.messageHeader}>
                                <Text truncate className={isUnread ? classes.senderNameUnread : classes.senderName}>
                                    {message.senderName || 'Unknown Sender'}
                                </Text>
                                <Text className={classes.messageDate}>{getRelativeTime(message.sentAt)}</Text>
                            </div>
                            <Text truncate className={isUnread ? classes.subjectUnread : classes.subject}>
                                {message.subject || '(No Subject)'}
                            </Text>
                            <Text className={message.areRecipientsVisible ? classes.recipientCount : classes.recipientCountHidden}>
                                {recipientText}
                            </Text>
                        </div>
                        <div className={classes.bottomIndicator} style={{ backgroundColor: `var(--mantine-color-${getTypeColor(message.messageType)}-2)` }} />
                    </Box>
                )
            })}
        </ScrollArea>
    );
};

export default MessageList;