'use client';

import React from 'react';
import { IconSpeakerphone } from '@tabler/icons-react';
import { get, limitToLast, orderByChild, query, ref } from 'firebase/database';
import useSWR from 'swr';
import { Button, Center, Group, Paper, Skeleton, Stack, Text, Title } from '@mantine/core';
import { database } from '../../firebase/firebase';
import { useAuth } from '../../hooks/useAuth';

const announcementsFetcher = async (path: string) => {
  const announcementsRef = query(ref(database, path), orderByChild('createdAt'), limitToLast(1));
  const snapshot = await get(announcementsRef);
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.val();
  const [latestAnnouncement] = Object.values(data);
  return latestAnnouncement as any;
};

const AnnouncementsWidget = () => {
  const { campID } = useAuth();
  const announcementsPath = campID ? `camps/${campID}/announcements` : null;

  const { data: announcement, error, isLoading } = useSWR(announcementsPath, announcementsFetcher);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Stack>
          <Skeleton height={20} width="70%" radius="sm" />
          <Skeleton height={16} radius="sm" />
          <Skeleton height={16} radius="sm" />
          <Skeleton height={16} width="85%" radius="sm" />
        </Stack>
      );
    }

    if (error) {
      return <Text c="red">Error loading announcements.</Text>;
    }

    if (!announcement) {
      return <Text c="dimmed">No announcements yet.</Text>;
    }

    return (
      <Stack>
        <Title order={4}>{announcement.title}</Title>
        <Text lineClamp={3}>{announcement.content}</Text>
        <Text size="xs" c="dimmed">
          Posted on {new Date(announcement.createdAt).toLocaleDateString()}
        </Text>
      </Stack>
    );
  };

  return (
    <Paper withBorder p="lg" radius="md" style={{ flex: '1 1 400px', minWidth: '300px' }}>
      <Group justify="space-between" align="center" mb="md">
        <Group>
          <IconSpeakerphone size={24} />
          <Title order={3}>Latest Announcement</Title>
        </Group>
        <Button size="xs" variant="light" disabled={!announcement}>
          View All
        </Button>
      </Group>
      <Center>{renderContent()}</Center>
    </Paper>
  );
};

export default AnnouncementsWidget;
