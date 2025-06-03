'use client';

import React from 'react';
import { Button, Paper, Text, CloseButton } from '@mantine/core'; // Using Mantine for consistent styling

const GeneralAnnouncement = ({ isVisible, onClose }) => {
  if (!isVisible) {
    return null;
  }

  // TODO: In the future, this message could potentially be fetched from a general announcements section in Firebase.
  const announcementParagraphs = [
    "Thanks for trying this app. It's currently in very early development stages, and there are many features that aren't yet working.",
    "You'll likely encounter the occasional bug, and when you do it would be greatly appreciated if you could let Cam know about it. Thank you in advance.",
    "Also, for anyone wondering, passwords are encrypted using Google's proprietary authentication software, and all login security and authentication happens externally from this app - so your data is protected and completely unaccessable to me or anyone else who views the source code for the app."
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