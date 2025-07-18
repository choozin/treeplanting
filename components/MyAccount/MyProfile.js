'use client';

import React, { useState, useEffect, useRef } from 'react';
import { database, storage } from '../../firebase/firebase';
import { ref as dbRef, get, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from '../../hooks/useAuth';
import {
    Select, Switch, Paper, Title, Button, Group, TextInput, Textarea, Loader, Center, Text, Stack, Avatar, FileInput, Modal, Image
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload } from '@tabler/icons-react';

const MyProfile = () => {
    const { user, userData, refreshUserData, loading: authLoading } = useAuth();
    const fileInputRef = useRef(null);

    const initialProfileState = {
        fullName: '',
        nickname: '',
        birthday: '',
        isFullNameVisible: false,
        isEmailVisible: false,
        isBirthdayVisible: false,
        bio: '',
        firstAidLevel: '',
        socials: {
            instagram: '', twitter: '', spotify: '', facebook: '',
            snapchat: '', youtube: '', tiktok: '',
        },
    };

    const [profile, setProfile] = useState(initialProfileState);
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [profileImageURL, setProfileImageURL] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userData) {
            setProfile({
                ...initialProfileState,
                ...userData.profile,
                fullName: userData.name || userData.profile?.fullName || '',
                socials: {
                    ...initialProfileState.socials,
                    ...(userData.profile?.socials || {})
                }
            });
            setProfileImageURL(userData.profileImageURL || '');
        }
    }, [userData]);

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

            await update(dbRef(database), updates);

            if (newImageURL) {
                setProfileImageURL(newImageURL);
            }

            await refreshUserData();

            notifications.show({
                title: 'Success!',
                message: 'Your account settings have been saved.',
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
                <Title order={2} ta="center" mb="xl">My Profile</Title>
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
                        label="Email Address"
                        value={user?.email || ''}
                        readOnly
                        disabled
                    />
                    <Switch
                        label="Make email visible to others"
                        checked={profile.isEmailVisible || false}
                        onChange={(e) => handleProfileChange('isEmailVisible', e.currentTarget.checked)}
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
                        label="First Aid Level (if applicable)"
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

                    <Group justify="space-between" mt="lg">
                        <Button color="red" variant="outline" onClick={handleDeleteAccount}>Delete Account</Button>
                        <Button onClick={handleSave} loading={isSaving}>Save Settings</Button>
                    </Group>
                </Stack>
            </Paper>
        </>
    );
};

export default MyProfile;