'use client';

import React from 'react';
import Link from 'next/link';
import { IconChartBar } from '@tabler/icons-react';
import { get, limitToLast, orderByChild, query, ref } from 'firebase/database';
import useSWR from 'swr';
import { Button, Center, Group, Paper, Skeleton, Stack, Text, Title } from '@mantine/core';
import { database } from '../../firebase/firebase';
import { useAuth } from '../../hooks/useAuth';

const pollsFetcher = async (path: string) => {
  // This fetches the most recently created, approved, and open poll.
  // A more complex query would be needed to find the most recently *active* open poll.
  // For a widget, this is a reasonable simplification.
  const pollsRef = query(ref(database, path), orderByChild('createdAt'), limitToLast(1));
  const snapshot = await get(pollsRef);
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.val();
  const [latestPoll] = Object.values(data).filter(
    (p: any) => p.isApprovedForDisplay && p.isOpenForVoting
  );
  return latestPoll as any;
};

const PollsWidget = () => {
  const { campID } = useAuth();
  const pollsPath = campID ? `camps/${campID}/polls` : null;

  const { data: poll, error, isLoading } = useSWR(pollsPath, pollsFetcher);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Stack>
          <Skeleton height={20} width="80%" radius="sm" />
          <Skeleton height={36} width="50%" radius="sm" mt="md" />
        </Stack>
      );
    }

    if (error) {
      return <Text c="red">Error loading polls.</Text>;
    }

    if (!poll) {
      return <Text c="dimmed">There are no active polls right now.</Text>;
    }

    return (
      <Stack align="center">
        <Text ta="center" fw={500}>
          {poll.questionText}
        </Text>
        <Button component={Link} href="/polls" variant="light" size="sm" mt="xs">
          Vote Now
        </Button>
      </Stack>
    );
  };

  return (
    <Paper withBorder p="lg" radius="md" style={{ flex: '1 1 400px', minWidth: '300px' }}>
      <Group justify="space-between" align="center" mb="md">
        <Group>
          <IconChartBar size={24} />
          <Title order={3}>Active Poll</Title>
        </Group>
      </Group>
      <Center>{renderContent()}</Center>
    </Paper>
  );
};

export default PollsWidget;
