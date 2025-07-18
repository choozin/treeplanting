'use client';

import React, { useEffect, useState } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import { ref, update } from 'firebase/database';
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { database } from '../../firebase/firebase';
import { useAuth } from '../../hooks/useAuth';

const NotificationSettings = () => {
  const { user, userData, refreshUserData } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    enabled: false,
    types: ['For Sale', 'Wanted', 'For Free'],
    categories: ['Planting Gear', 'Other'],
    scope: 'Camp',
    keyword: '',
  });

  useEffect(() => {
    if (!('Notification' in window)) {
      notifications.show({
        title: 'Browser Support',
        message: 'This browser does not support desktop notification',
        color: 'blue',
      });
    } else if (Notification.permission === 'granted') {
      setIsSubscribed(true);
    }

    const classifiedsPrefs = userData?.notificationPreferences?.classifieds;

    if (classifiedsPrefs) {
      setPrefs((p) => ({ ...p, ...classifiedsPrefs }));
    }
  }, [userData]);

  const handleSubscribe = async () => {
    if (!('Notification' in window)) {
      notifications.show({
        color: 'red',
        title: 'Unsupported Browser',
        message: 'Your browser does not support push notifications.',
      });
      return;
    }

    if (Notification.permission === 'granted') {
      setIsSubscribed(true);
      notifications.show({
        color: 'blue',
        title: 'Already Enabled',
        message: 'Notifications are already enabled for this site.',
      });
      // TODO: Here we would proceed to get the subscription object
      return;
    }

    if (Notification.permission === 'denied') {
      notifications.show({
        color: 'red',
        title: 'Permission Denied',
        message: 'You have blocked notifications. Please enable them in your browser settings.',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setIsSubscribed(true);
      notifications.show({
        color: 'green',
        title: 'Success!',
        message: 'Push notifications have been enabled.',
      });
      // TODO: Get subscription object and save to DB
    }
  };

  const handlePrefChange = (field, value) => {
    setPrefs((prev) => ({ ...prev, [field]: value }));
  };

  const handleSavePrefs = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await update(ref(database, `users/${user.uid}/notificationPreferences/classifieds`), prefs);
      await refreshUserData();
      notifications.show({
        title: 'Preferences Saved',
        message: 'Your notification settings have been updated.',
        color: 'green',
      });
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Could not save your preferences: ' + err.message,
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Paper p="md" mt="xl" withBorder>
      <Title order={4} mb="md">
        Push Notifications
      </Title>
      {!isSubscribed ? (
        <Alert icon={<IconAlertCircle size="1.2rem" />} title="Enable Notifications" color="blue">
          <Text>
            To receive alerts for new classifieds, you first need to enable push notifications for
            this site in your browser.
          </Text>
          <Button onClick={handleSubscribe} mt="md" variant="light">
            Enable Notifications
          </Button>
        </Alert>
      ) : (
        <Stack>
          <Switch
            label="Receive notifications for new classifieds"
            checked={prefs.enabled}
            onChange={(e) => handlePrefChange('enabled', e.currentTarget.checked)}
          />
          <Checkbox.Group
            label="Notify for these listing types"
            value={prefs.types}
            onChange={(value) => handlePrefChange('types', value)}
          >
            <Group mt="xs">
              <Checkbox value="For Sale" label="For Sale" />
              <Checkbox value="For Free" label="For Free" />
              <Checkbox value="Wanted" label="Wanted" />
            </Group>
          </Checkbox.Group>
          <Checkbox.Group
            label="Notify for these categories"
            value={prefs.categories}
            onChange={(value) => handlePrefChange('categories', value)}
          >
            <Group mt="xs">
              <Checkbox value="Planting Gear" label="Planting Gear" />
              <Checkbox value="Other" label="Other" />
            </Group>
          </Checkbox.Group>
          <TextInput
            label="Notify for keyword matches"
            description="Receive a notification if a post's title or description contains this word (case-insensitive)."
            placeholder="e.g., boots, vikings, etc."
            value={prefs.keyword}
            onChange={(e) => handlePrefChange('keyword', e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="lg">
            <Button onClick={handleSavePrefs} loading={isSaving}>
              Save Preferences
            </Button>
          </Group>
        </Stack>
      )}
    </Paper>
  );
};

export default NotificationSettings;
