'use client';

import React, { useState, useEffect } from 'react';
import Cookies from "js-cookie";
import { database } from '../../firebase/firebase';
import { ref, get, update, onValue } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { Select, Switch, Paper, Title, Button, Group, TextInput, Loader, Center, Text, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';

const MyAccount = () => {
    const { user, userData, refreshUserData, loading: authLoading } = useAuth();

    // Local state for form inputs
    const [profile, setProfile] = useState({
        fullName: '',
        nickname: '',
        birthday: '',
        isFullNameVisible: false,
        isBirthdayVisible: false,
    });
    const [weatherPrefs, setWeatherPrefs] = useState({
        secondaryLocationKey: '',
        navWidget: { visible: true, displayMode: 'hourly' },
        homescreenWidget: { visible: true, showSecondaryLocation: true, hourlyForecastHours: 6, dailyForecastDays: 3 }
    });
    
    const [availableSecondaryLocations, setAvailableSecondaryLocations] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Populate form when userData is loaded from context
    useEffect(() => {
        if (userData) {
            if (userData.profile) {
                setProfile(p => ({ ...p, ...userData.profile }));
            }
            if (userData.weatherPreferences) {
                setWeatherPrefs(p => ({
                    ...p,
                    ...userData.weatherPreferences,
                    navWidget: { ...p.navWidget, ...(userData.weatherPreferences.navWidget || {}) },
                    homescreenWidget: { ...p.homescreenWidget, ...(userData.weatherPreferences.homescreenWidget || {}) },
                }));
            }
        }
    }, [userData]);

    // Fetch available secondary locations for the user's active camp
    useEffect(() => {
        if (!user) return;
        const campId = Cookies.get(`campID_${user.uid}`);
        if (!campId) {
            setAvailableSecondaryLocations([]);
            return;
        }

        const activeLocIdRef = ref(database, `camps/${campId}/activeLocationId`);
        const unsub = onValue(activeLocIdRef, async (activeLocIdSnap) => {
            if (activeLocIdSnap.exists()) {
                const activeLocationId = activeLocIdSnap.val();
                const year = new Date().getFullYear();
                const secondaryLocsRef = ref(database, `camps/${campId}/campLocations/${year}/${activeLocationId}/secondaryLocations`);

                const secondaryLocsSnap = await get(secondaryLocsRef);
                if (secondaryLocsSnap.exists()) {
                    const data = secondaryLocsSnap.val();
                    const options = Object.entries(data)
                        .filter(([key, value]) => value && typeof value === 'object' && value.name)
                        .map(([key, value]) => ({
                            value: key,
                            label: value.name
                        }));
                    setAvailableSecondaryLocations(options);
                } else {
                    setAvailableSecondaryLocations([]);
                }
            }
        });

        return () => unsub();
    }, [user]);

    const handleProfileChange = (field, value) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };
    
    const handleWeatherPrefChange = (path, value) => {
        setWeatherPrefs(prev => {
            const newPrefs = { ...prev };
            let current = newPrefs;
            const keys = path.split('.');
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newPrefs;
        });
    };

    const handleSave = async () => {
        if (!user) {
            notifications.show({ color: 'red', title: 'Error', message: 'You must be logged in.' });
            return;
        }
        setIsSaving(true);
        try {
            const updates = {};
            updates[`users/${user.uid}/profile`] = profile;
            updates[`users/${user.uid}/weatherPreferences`] = weatherPrefs;
            await update(ref(database), updates);
            
            notifications.show({
                title: 'Success!',
                message: 'Your settings have been saved.',
                color: 'green',
            });
            refreshUserData(); // Re-fetch global user data
        } catch (err) {
            console.error('Error saving user settings:', err);
            notifications.show({
                title: 'Save Failed',
                message: err.message,
                color: 'red',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading) {
        return <Center style={{ height: '80vh' }}><Loader /></Center>;
    }

    if (!user) {
        return <Center><Text>Please log in to view your account.</Text></Center>;
    }

    return (
        <Paper withBorder shadow="md" p="xl" radius="md" maw={600} mx="auto">
            <Title order={2} ta="center" mb="xl">Account Settings</Title>
            <Stack>
                <TextInput
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={profile.fullName || ''}
                    onChange={(e) => handleProfileChange('fullName', e.currentTarget.value)}
                />
                <Switch
                    label="Make full name visible to others"
                    checked={profile.isFullNameVisible || false}
                    onChange={(e) => handleProfileChange('isFullNameVisible', e.currentTarget.checked)}
                />
                <TextInput
                    label="Nickname"
                    description="How you'd like to be referred to in the app."
                    placeholder="Enter a nickname"
                    value={profile.nickname || ''}
                    onChange={(e) => handleProfileChange('nickname', e.currentTarget.value)}
                />
                <TextInput
                    label="Birthday"
                    type="date"
                    value={profile.birthday || ''}
                    onChange={(e) => handleProfileChange('birthday', e.currentTarget.value)}
                />
                <Switch
                    label="Make birthday visible to others"
                    checked={profile.isBirthdayVisible || false}
                    onChange={(e) => handleProfileChange('isBirthdayVisible', e.currentTarget.checked)}
                />

                <Paper p="md" mt="xl" withBorder>
                    <Title order={4} mb="md">Weather Preferences</Title>
                    <Select
                        label="Secondary Weather Location"
                        placeholder="Choose a location"
                        data={availableSecondaryLocations}
                        value={weatherPrefs.secondaryLocationKey}
                        onChange={(value) => handleWeatherPrefChange('secondaryLocationKey', value)}
                        clearable
                    />
                    <Switch
                        mt="md"
                        label="Show Nav Widget"
                        checked={weatherPrefs.navWidget?.visible}
                        onChange={(e) => handleWeatherPrefChange('navWidget.visible', e.currentTarget.checked)}
                    />
                    <Select
                        label="Nav Widget Forecast Type"
                        data={['hourly', '6-hour', 'daily']}
                        value={weatherPrefs.navWidget?.displayMode}
                        onChange={(value) => handleWeatherPrefChange('navWidget.displayMode', value)}
                        mt="sm"
                        disabled={!weatherPrefs.navWidget?.visible}
                    />
                </Paper>

                <Group justify="flex-end" mt="lg">
                    <Button onClick={handleSave} loading={isSaving}>Save Settings</Button>
                </Group>
            </Stack>
        </Paper>
    );
};

export default MyAccount;