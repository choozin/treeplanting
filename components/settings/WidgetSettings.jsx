'use client';

import React, { useEffect, useState } from 'react';
import { IconArrowDown, IconArrowUp } from '@tabler/icons-react';
import { ref, update } from 'firebase/database';
import {
  ActionIcon,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { database } from '../../firebase/firebase';
import { useAuth } from '../../hooks/useAuth';

const ALL_WIDGETS = [
  { id: 'announcements', label: 'Announcements' },
  { id: 'weather', label: 'Weather' },
  { id: 'birthdays', label: 'Upcoming Birthdays' },
  { id: 'polls', label: 'Active Poll' },
  { id: 'quote', label: 'Quote' },
];

const WidgetSettings = () => {
  const { user, userData, refreshUserData, loading: authLoading } = useAuth();
  const [layout, setLayout] = useState(ALL_WIDGETS.map((w) => w.id));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userData?.dashboardPreferences?.layout) {
      const userLayout = userData.dashboardPreferences.layout;
      const allWidgetIds = ALL_WIDGETS.map((w) => w.id);
      const newLayout = [...userLayout];
      allWidgetIds.forEach((id) => {
        if (!newLayout.includes(id)) {
          newLayout.push(id);
        }
      });
      setLayout(newLayout);
    } else {
      setLayout(ALL_WIDGETS.map((w) => w.id));
    }
  }, [userData]);

  const handleToggleWidget = (widgetId, checked) => {
    if (checked) {
      setLayout((prev) => [...prev, widgetId]);
    } else {
      setLayout((prev) => prev.filter((id) => id !== widgetId));
    }
  };

  const handleMove = (index, direction) => {
    const newLayout = [...layout];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newLayout.length) return;
    [newLayout[index], newLayout[newIndex]] = [newLayout[newIndex], newLayout[index]];
    setLayout(newLayout);
  };

  const handleSave = async () => {
    if (!user) {
      notifications.show({ color: 'red', title: 'Error', message: 'You must be logged in.' });
      return;
    }
    setIsSaving(true);
    try {
      // **FIX:** Explicitly define the type for the 'updates' object.
      const updates = {};
      updates[`users/${user.uid}/dashboardPreferences/layout`] = layout;
      await update(ref(database), updates);
      await refreshUserData();
      notifications.show({
        title: 'Success!',
        message: 'Your dashboard layout has been saved.',
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Save Failed',
        message: 'Error saving dashboard layout: ' + err.message,
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  const availableWidgets = ALL_WIDGETS.filter((w) => !layout.includes(w.id));

  return (
    <Paper p="md" mt="xl" withBorder>
      <Title order={4} mb="md">
        Dashboard Widgets
      </Title>
      <Text size="sm" c="dimmed" mb="lg">
        Drag (coming soon) or use the arrows to reorder. Toggled-off widgets can be re-enabled from
        the list at the bottom.
      </Text>
      <Stack>
        {layout.map((widgetId, index) => {
          const widget = ALL_WIDGETS.find((w) => w.id === widgetId);
          if (!widget) {
            return null;
          }
          return (
            <Paper key={widgetId} p="xs" withBorder radius="sm">
              <Group justify="space-between">
                <Switch
                  label={widget.label}
                  checked
                  onChange={(e) => handleToggleWidget(widget.id, e.currentTarget.checked)}
                />
                <Group gap="xs">
                  <ActionIcon onClick={() => handleMove(index, 'up')} disabled={index === 0}>
                    <IconArrowUp size={16} />
                  </ActionIcon>
                  <ActionIcon
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === layout.length - 1}
                  >
                    <IconArrowDown size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>
          );
        })}

        {availableWidgets.length > 0 && (
          <>
            <Title order={5} mt="lg" mb="sm">
              Hidden Widgets
            </Title>
            {availableWidgets.map((widget) => (
              <Switch
                key={widget.id}
                label={widget.label}
                checked={false}
                onChange={(e) => handleToggleWidget(widget.id, e.currentTarget.checked)}
              />
            ))}
          </>
        )}

        <Group justify="flex-end" mt="xl">
          <Button onClick={handleSave} loading={isSaving}>
            Save Layout
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
};

export default WidgetSettings;
