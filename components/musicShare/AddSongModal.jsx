'use client';

import React, { useState, useEffect } from 'react';
import { Modal, TextInput, Button, Group, Loader, Center, Image, Text, Stack, Alert } from '@mantine/core';
import { database } from '../../firebase/firebase';
import { ref, push, serverTimestamp } from 'firebase/database';

const AddSongModal = ({ opened, onClose, user, campId, crewId }) => {
  const [songLink, setSongLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [songData, setSongData] = useState(null);

  useEffect(() => {
    // Reset state when modal is closed/reopened
    if (!opened) {
      setSongLink('');
      setIsLoading(false);
      setError(null);
      setSongData(null);
    }
  }, [opened]);

  const handleLinkChange = async (event) => {
    const url = event.currentTarget.value;
    setSongLink(url);
    setError(null);
    setSongData(null);

    // Basic URL validation
    if (url.startsWith('http')) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/process-music-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ musicUrl: url }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to process link');
        }

        const data = await response.json();
        setSongData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleShareSong = async () => {
    if (!songData || !user || !campId) return;

    const recommendation = {
      ...songData,
      recommenderId: user.uid,
      recommenderName: user.displayName || user.email,
      campId: campID,
      crewId: crewId || 'unknown',
      createdAt: serverTimestamp(),
      upvotes: [],
    };
    
    // Placeholder for offline queueing
    if (!navigator.onLine) {
        console.log("(Offline) Queuing song share:", recommendation);
        alert("You're offline! Your song will be shared when you're back online.");
        onClose();
        return;
    }

    try {
      const recommendationsRef = ref(database, `camps/${campId}/music_recommendations`);
      await push(recommendationsRef, recommendation);
      onClose();
    } catch (err) {
      setError('Failed to share song. Please try again.');
      console.error(err);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Share a New Song" centered>
      <Stack>
        <TextInput
          label="Song Link"
          placeholder="Paste a song link from Spotify, Apple Music, etc."
          value={songLink}
          onChange={handleLinkChange}
          rightSection={isLoading ? <Loader size="xs" /> : null}
        />

        {error && <Alert color="red" title="Error">{error}</Alert>}

        {songData && (
          <Paper p="md" withBorder>
            <Group>
              <Image src={songData.albumArtUrl} width={80} height={80} alt="Album Art" />
              <div style={{ flex: 1 }}>
                <Text fw={500}>{songData.songTitle}</Text>
                <Text size="sm" c="dimmed">{songData.artistName}</Text>
              </div>
            </Group>
          </Paper>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button onClick={handleShareSong} disabled={!songData || isLoading}>
            Share Song
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default AddSongModal;