'use client';

import React from 'react';
import { Container, Title, Paper } from '@mantine/core';
import WidgetSettings from './WidgetSettings';
import NotificationSettings from './NotificationSettings';

const SettingsPage = () => {
  return (
    <Container size="md" my="lg">
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Title order={2} ta="center" mb="xl">
          App Settings
        </Title>
        <WidgetSettings />
        <NotificationSettings />
      </Paper>
    </Container>
  );
};

export default SettingsPage;