'use client';

import React from 'react';
import { Button, Paper, Text, CloseButton } from '@mantine/core'; // Using Mantine for consistent styling

const GeneralAnnouncement = ({ isVisible, onClose }) => {
  if (!isVisible) {
    return null;
  }

  // TODO: In the future, this message could potentially be fetched from a general announcements section in Firebase.
  const announcementParagraphs = [
    "Thanks for trying this app. It's currently in very early development stages, but I hope you'll find it useful. I'll be adding features throughout the season. If you have any ideas you'd like to suggest, talk direclty to Cam or use the 'Feedback' section, found in the nav menu.",
    "You'll likely encounter the occasional bug, and if so it would be greatly appreciated if you could let Cam know about it. Maybe take a screenshot too? Thank you in advance!",
    "Also, for anyone wondering, passwords are encrypted using Google's proprietary authentication software, and all login security and authentication happens externally from this app - so your password is protected and completely inaccessable to me or anyone else who views the source code for the app. That being said, you can use a non-secure password if you'd like since only our camp will be using this app for now and no one will be trying to hack you - most likely. If you'd like to view the source code yourself or see how the security works, ask any time!"
  ];

  return (
    <Paper
      shadow="md"
      p="lg" // Increased padding
      radius="md" // Rounded corners
      withBorder
      style={{
        backgroundColor: 'var(--mantine-color-pink-0, #FFF0F6)', // Slightly pink background
        marginBottom: 'var(--mantine-spacing-md, 16px)',
        position: 'relative', // For absolute positioning of the close button
      }}
    >
      <CloseButton
        title="Close this message"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 'var(--mantine-spacing-sm, 8px)',
          right: 'var(--mantine-spacing-sm, 8px)',
        }}
        aria-label="Close announcement"
      />
      {announcementParagraphs.map((paragraph, index) => (
        <Text 
          key={index} 
          size="sm" 
          style={{ 
            marginBottom: index < announcementParagraphs.length - 1 ? 'var(--mantine-spacing-sm, 12px)' : '0',
            lineHeight: 1.6 
          }}
        >
          {paragraph}
        </Text>
      ))}
    </Paper>
  );
};

export default GeneralAnnouncement;