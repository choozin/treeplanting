'use client';

import React from 'react';
import { Paper, Title, Text } from '@mantine/core';
import { IconUsersGroup } from '@tabler/icons-react';

const CrewManagement = () => {
  return (
    <Paper withBorder p="xl" radius="md" style={{ textAlign: 'center' }}>
      <IconUsersGroup size={48} stroke={1.5} style={{ color: 'var(--mantine-color-gray-5)', marginBottom: '1rem' }} />
      <Title order={3} mb="sm">Crew Management</Title>
      <Text c="dimmed">
        Features for managing individual crews, such as setting crew-specific goals or schedules, will be available here soon.
      </Text>
    </Paper>
  );
};

export default CrewManagement;