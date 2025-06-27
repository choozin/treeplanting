'use client';

import React, { useState, useEffect, useRef } from 'react';
import Cookies from "js-cookie";
import { database, storage } from '../../firebase/firebase';
import { ref as dbRef, get, update, onValue } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from '../../hooks/useAuth';
import {
    Select, Switch, Paper, Title, Button, Group, TextInput, Textarea, Loader, Center, Text, Stack, Avatar, FileInput, Modal, Image
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload } from '@tabler/icons-react';

const MyAccount = () => {
    const { user, userData, refreshUserData, loading: authLoading } = useAuth();
    const fileInputRef = useRef(null);

    const initialProfileState = {
        fullName: '',
        nickname: '',
        birthday: '',
        isFullNameVisible: false,
        isBirthdayVisible: false,
        bio: '',
        firstAidLevel: '',
        socials: {
            instagram: '', twitter: '', spotify: '', facebook: '',
            snapchat: '', youtube: '', tiktok: '',
        },
    };

    const [profile, setProfile] = useState(initialProfileState);
    const [weatherPrefs, setWeatherPrefs] = useState({
        secondaryLocationKey: '',
        navWidget: { visible: true, displayMode: 'hourly' },
        homescreenWidget: { visible: true, showSecondaryLocation: true, hourlyForecastHours: 6, dailyForecastDays: 3 }
    });

    const [profileImageFile, setProfileImageFile] = useState(null);
    const [profileImageURL, setProfileImageURL] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [availableSecondaryLocations, setAvailableSecondaryLocations] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userData) {
            setProfile({
                ...initialProfileState,
                ...userData.profile,
                socials: {
                    ...initialProfileState.socials,
                    ...(userData.profile?.socials || {})
                }
            });
            if (userData.weatherPreferences) {
                setWeatherPrefs(p => ({
                    ...p,
                    ...userData.weatherPreferences,
                    navWidget: { ...p.navWidget, ...(userData.weatherPreferences.navWidget || {}) },
                    homescreenWidget: { ...p.homescreenWidget, ...(userData.weatherPreferences.homescreenWidget || {}) },
                }));
            }
            setProfileImageURL(userData.profileImageURL || '');
        }
    }, [userData]);

    useEffect(() => {
        if (!user) return;
        const campId = Cookies.get(`campID_${user.uid}`);
        if (!campId) {
            setAvailableSecondaryLocations([]);
            return;
        }

        const activeLocIdRef = dbRef(database, `camps/${campId}/activeLocationId`);
        const unsub = onValue(activeLocIdRef, async (activeLocIdSnap) => {
            if (activeLocIdSnap.exists()) {
                const activeLocationId = activeLocIdSnap.val();
                const year = new Date().getFullYear();
                const secondaryLocsRef = dbRef(database, `camps/${campId}/campLocations/${year}/${activeLocationId}/secondaryLocations`);

                const secondaryLocsSnap = await get(secondaryLocsRef);
                if (secondaryLocsSnap.exists()) {
                    const data = secondaryLocsSnap.val();
                    const options = Object.entries(data)
                        .filter(([, value]) => value && typeof value === 'object' && value.name)
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

    const handleSocialChange = (platform, value) => {
        setProfile(prev => ({
            ...prev,
            socials: {
                ...prev.socials,
                [platform]: value
            }
        }));
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

    const handleFileChange = (file) => {
        if (file) {
            setProfileImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!user) {
            notifications.show({ color: 'red', title: 'Error', message: 'You must be logged in.' });
            return;
        }
        setIsSaving(true);
        try {
            const updates = {};
            let newImageURL = null;

            if (profileImageFile) {
                const imageRef = storageRef(storage, `profile-images/${user.uid}`);
                await uploadBytes(imageRef, profileImageFile);
                newImageURL = await getDownloadURL(imageRef);
                updates[`users/${user.uid}/profileImageURL`] = newImageURL;
            }

            updates[`users/${user.uid}/profile`] = profile;
            updates[`users/${user.uid}/weatherPreferences`] = weatherPrefs;

            await update(dbRef(database), updates);

            if (newImageURL) {
                setProfileImageURL(newImageURL);
            }

            await refreshUserData();

            notifications.show({
                title: 'Success!',
                message: 'Your settings have been saved.',
                color: 'green',
            });

            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error('Error saving user settings:', err);
            notifications.show({
                title: 'Save Failed',
                message: err.message,
                color: 'red',
            });
        } finally {
            setIsSaving(false);
            setImagePreview('');
            setProfileImageFile(null);
        }
    };

    const handleDeleteAccount = () => {
        console.log("Account deletion requested. This should open a confirmation modal.");
    };

    if (authLoading) {
        return <Center style={{ height: '80vh' }}><Loader /></Center>;
    }

    if (!user) {
        return <Center><Text>Please log in to view your account.</Text></Center>;
    }

    return (
        <>
            <Modal opened={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} size="xl" centered withCloseButton={false}>
                <Image src={imagePreview || profileImageURL} alt="Profile" style={{ width: '100%', height: 'auto' }} />
            </Modal>

            <Paper withBorder shadow="md" p="xl" radius="md" maw={600} mx="auto">
                <Title order={2} ta="center" mb="xl">Account Settings</Title>
                <Stack>
                    <Group justify="center">
                        <Avatar
                            src={imagePreview || profileImageURL}
                            size={120}
                            radius="100%"
                            onClick={() => (imagePreview || profileImageURL) && setIsImageModalOpen(true)}
                            style={{ cursor: 'pointer' }}
                        />
                    </Group>

                    <FileInput
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/png,image/jpeg"
                        onChange={handleFileChange}
                    />
                    <Button
                        leftSection={<IconUpload size={16} />}
                        onClick={() => fileInputRef.current.click()}
                        variant="outline"
                    >
                        Upload Profile Picture
                    </Button>

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
                    <Textarea
                        label="Bio"
                        placeholder="Tell us a little about yourself"
                        value={profile.bio || ''}
                        onChange={(e) => handleProfileChange('bio', e.currentTarget.value)}
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
                    <TextInput
                        label="First Aid Level"
                        placeholder="e.g., OFA 3, WFA, etc."
                        value={profile.firstAidLevel || ''}
                        onChange={(e) => handleProfileChange('firstAidLevel', e.currentTarget.value)}
                    />
                    <Title order={4} mt="lg">Social Media</Title>
                    <TextInput
                        label="Instagram"
                        placeholder="Your Instagram username"
                        value={profile.socials?.instagram || ''}
                        onChange={(e) => handleSocialChange('instagram', e.currentTarget.value)}
                    />
                    <TextInput
                        label="Twitter / X"
                        placeholder="Your Twitter/X username"
                        value={profile.socials?.twitter || ''}
                        onChange={(e) => handleSocialChange('twitter', e.currentTarget.value)}
                    />
                    <TextInput
                        label="Spotify"
                        placeholder="Your Spotify profile URL"
                        value={profile.socials?.spotify || ''}
                        onChange={(e) => handleSocialChange('spotify', e.currentTarget.value)}
                    />
                    <TextInput
                        label="Facebook"
                        placeholder="Your Facebook profile URL"
                        value={profile.socials?.facebook || ''}
                        onChange={(e) => handleSocialChange('facebook', e.currentTarget.value)}
                    />
                    <TextInput
                        label="Snapchat"
                        placeholder="Your Snapchat username"
                        value={profile.socials?.snapchat || ''}
                        onChange={(e) => handleSocialChange('snapchat', e.currentTarget.value)}
                    />
                    <TextInput
                        label="YouTube"
                        placeholder="Your YouTube channel URL"
                        value={profile.socials?.youtube || ''}
                        onChange={(e) => handleSocialChange('youtube', e.currentTarget.value)}
                    />
                    <TextInput
                        label="TikTok"
                        placeholder="Your TikTok username"
                        value={profile.socials?.tiktok || ''}
                        onChange={(e) => handleSocialChange('tiktok', e.currentTarget.value)}
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

                    <Group justify="space-between" mt="lg">
                        <Button color="red" variant="outline" onClick={handleDeleteAccount}>Delete Account</Button>
                        <Button onClick={handleSave} loading={isSaving}>Save Settings</Button>
                    </Group>
                </Stack>
            </Paper>
        </>
    );
};

export default MyAccount;