'use client';

import React, { useMemo } from 'react';
import { IconSettings } from '@tabler/icons-react';
import { Button, Center, Container, Flex, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuth } from '../../hooks/useAuth';
import AnnouncementsWidget from '../annoucements/AnnouncementsWidget';
import BirthdaysWidget from '../Birthdays/BirthdaysWidget';
import CustomLoader from '../common/CustomLoader';
import PollsWidget from '../polls/PollsWidget';
import QuoteWidget from './QuoteWidget';
import WidgetSettings from '../settings/WidgetSettings';
import WeatherWidget from '../weather/WeatherWidget';

// Define a specific type for our widget IDs for better type safety
type WidgetId = 'announcements' | 'weather' | 'birthdays' | 'polls' | 'quote';

// Widget Registry now uses the specific WidgetId type
const WIDGET_MAP: Record<WidgetId, React.ComponentType> = {
  announcements: AnnouncementsWidget,
  weather: WeatherWidget,
  birthdays: BirthdaysWidget,
  polls: PollsWidget,
  quote: QuoteWidget,
};

const DEFAULT_LAYOUT: WidgetId[] = ['announcements', 'weather', 'birthdays', 'polls', 'quote'];

const Dashboard = () => {
  const { userData, loading } = useAuth();
  const [opened, { open, close }] = useDisclosure(false);

  const userLayout = useMemo(() => {
    const savedLayout = userData?.dashboardPreferences?.layout;
    if (Array.isArray(savedLayout)) {
      const newLayout = [...savedLayout];
      DEFAULT_LAYOUT.forEach((widgetId) => {
        if (!newLayout.includes(widgetId)) {
          newLayout.push(widgetId);
        }
      });
      return newLayout.filter((widgetId) => widgetId in WIDGET_MAP) as WidgetId[];
    }
    return DEFAULT_LAYOUT;
  }, [userData]);

  if (loading) {
    return (
      <Center style={{ height: '80vh' }}>
        <CustomLoader />
      </Center>
    );
  }

  return (
    <Container size="xl" my="lg">
      <Modal opened={opened} onClose={close} title="Customize My Dashboard" size="lg" centered>
        <WidgetSettings />
      </Modal>

      <Group justify="space-between" align="center" mb="xl">
        <Stack gap={0}>
          <Title order={2}>Camp Hub</Title>
          <Text c="dimmed">
            Welcome, {userData?.profile?.nickname || userData?.name || 'User'}!
          </Text>
        </Stack>
        <Button onClick={open} leftSection={<IconSettings size={16} />} variant="outline">
          Customize My Dashboard
        </Button>
      </Group>

      <Flex mih={50} gap="md" justify="flex-start" align="flex-start" direction="row" wrap="wrap">
        {userLayout.map((widgetId) => {
          const Widget = WIDGET_MAP[widgetId];
          return Widget ? <Widget key={widgetId} /> : null;
        })}
      </Flex>
    </Container>
  );
};

export default Dashboard;
