'use client';

import React from 'react';
import { Alert, Container, Paper, Title } from '@mantine/core';
import NotificationSettings from './NotificationSettings';
import WidgetSettings from './WidgetSettings';

const SettingsPage = () => {
  return (
    <Container size="md" my="lg">
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Title order={2} ta="center" mb="xl">
          App Settings
        </Title>
        <Alert variant="light" color="blue" title="Work in Progress" mb="xl">
          These features aren't fully working yet, but they're coming soon.
        </Alert>
        <WidgetSettings />
        <NotificationSettings />
      </Paper>
    </Container>
  );
};

export default SettingsPage;
