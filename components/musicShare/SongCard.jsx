'use client';

import React from 'react';
import { Card, Image, Text, Group, Button, Badge } from '@mantine/core';
import { IconDroplet, IconWind, IconPlant } from '@tabler/icons-react';

const SongCard = ({ song, onUpvote, currentUserId }) => {
  const {
    songTitle,
    artistName,
    albumArtUrl,
    bpm,
    genres = [],
    recommenderName,
    upvotes = [],
  } = song;

  const isUpvoted = currentUserId && upvotes.includes(currentUserId);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image src={albumArtUrl} height={180} alt={`Album art for ${songTitle}`} />
      </Card.Section>

      <Stack mt="md" mb="xs" gap="xs">
        <Text fw={500} truncate="end">{songTitle}</Text>
        <Text size="sm" c="dimmed">{artistName}</Text>
      </Stack>

      <Group justify="space-between" mb="xs">
        <Badge color="pink" variant="light">
          {Math.round(bpm)} BPM
        </Badge>
        <Text size="xs" c="dimmed">
          Shared by {recommenderName}
        </Text>
      </Group>

      {genres.length > 0 && (
        <Group gap={5} mb="md">
          {genres.slice(0, 3).map((genre) => (
            <Badge key={genre} variant="outline" color="gray" size="sm">{genre}</Badge>
          ))}
        </Group>
      )}

      <Button
        variant={isUpvoted ? "filled" : "light"}
        color="green"
        fullWidth
        mt="md"
        radius="md"
        leftSection={<IconPlant size={16} />}
        onClick={() => onUpvote(song.id)}
      >
        Upvote ({upvotes.length})
      </Button>
    </Card>
  );
};

export default SongCard;