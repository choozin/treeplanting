// components/MyAccount/MyAccount.js
'use client';

import React, { useState, useEffect } from 'react';
import Cookies from "js-cookie";
import { auth, database } from '../../firebase/firebase';
import { ref, get, set, update, onValue } from 'firebase/database';
import { useWeather } from '../../hooks/useWeather';
import { Select, Switch, Paper, Title, Button, Group } from '@mantine/core';

const MyAccount = ({ user, setUserData }) => {
    const [fullName, setFullName] = useState('');
    const [nickname, setNickname] = useState('');
    const [birthday, setBirthday] = useState(''); // YYYY-MM-DD format
    const [isFullNameVisible, setIsFullNameVisible] = useState(false);
    const [isBirthdayVisible, setIsBirthdayVisible] = useState(false);

    // Weather Preferences State
    const [weatherPrefs, setWeatherPrefs] = useState({
        secondaryLocationKey: '',
        navWidget: { visible: true, displayMode: 'hourly' },
        homescreenWidget: { visible: true, showSecondaryLocation: true, hourlyForecastHours: 6, dailyForecastDays: 3 }
    });
    const [availableSecondaryLocations, setAvailableSecondaryLocations] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saveStatus, setSaveStatus] = useState(''); // To show success/error message after saving

    // Fetch primary user profile and weather preferences
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const userProfileRef = ref(database, `users/${user.uid}/profile`);
        const weatherPrefsRef = ref(database, `users/${user.uid}/weatherPreferences`);

        const fetchInitialData = async () => {
            try {
                const profileSnap = await get(userProfileRef);
                if (profileSnap.exists()) {
                    const profileData = profileSnap.val();
                    setFullName(profileData.fullName || '');
                    setNickname(profileData.nickname || '');
                    setBirthday(profileData.birthday || '');
                    setIsFullNameVisible(profileData.isFullNameVisible || false);
                    setIsBirthdayVisible(profileData.isBirthdayVisible || false);
                }

                const weatherPrefsSnap = await get(weatherPrefsRef);
                if (weatherPrefsSnap.exists()) {
                    setWeatherPrefs(p => ({ ...p, ...weatherPrefsSnap.val() }));
                }
            } catch (err) {
                console.error('Error fetching user data:', err);
                setError('Failed to load profile data.');
            } finally {
                setLoading(false);
            }
        }

        fetchInitialData();

    }, [user]);

    // Fetch available secondary locations for the user's active camp
    useEffect(() => {
        if (!user) return;

        const campId = Cookies.get("campID");
        if (!campId) {
            setAvailableSecondaryLocations([]);
            return;
        };

        const userCampRef = ref(database, `camps/${campId}/activeLocationId`);
        const unsub = onValue(userCampRef, async (activeLocIdSnap) => {
            if (activeLocIdSnap.exists()) {
                const activeLocationId = activeLocIdSnap.val();
                const year = new Date().getFullYear();
                const secondaryLocsRef = ref(database, `camps/${campId}/campLocations/${year}/${activeLocationId}/secondaryLocations`);

                const secondaryLocsSnap = await get(secondaryLocsRef);
                if (secondaryLocsSnap.exists()) {
                    const data = secondaryLocsSnap.val();
                    const options = Object.keys(data).map(key => ({
                        value: key,
                        label: data[key].name
                    }));
                    setAvailableSecondaryLocations(options);
                } else {
                    setAvailableSecondaryLocations([]);
                }
            }
        });

        return () => unsub();

    }, [user]);

    const handleSave = async () => {
        if (!user) {
            alert('You must be logged in to save your profile.');
            return;
        }

        setError(null);
        setSaveStatus('Saving...');

        try {
            const profileData = {
                fullName,
                nickname,
                birthday,
                isFullNameVisible,
                isBirthdayVisible,
            };
            const updates = {};
            updates[`users/${user.uid}/profile`] = profileData;
            updates[`users/${user.uid}/weatherPreferences`] = weatherPrefs;

            await update(ref(database), updates);
            setSaveStatus('Profile saved successfully!');
            setTimeout(() => setSaveStatus(''), 3000); // Clear message after 3 seconds

            // Update local userData state if needed
            setUserData(prevData => ({
                ...prevData,
                profile: profileData
            }));

        } catch (err) {
            console.error('Error saving user profile:', err);
            setError('Failed to save profile: ' + err.message);
            setSaveStatus('');
        }
    };

    const handleWeatherPrefChange = (path, value) => {
        setWeatherPrefs(prev => {
            const newPrefs = { ...prev };
            let current = newPrefs;
            const keys = path.split('.');
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newPrefs;
        });
    };

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading profile...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
    }

    if (!user) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                Please log in to manage your account settings.
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#333' }}>Account Settings</h2>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Full Name (First and Last):</label>
                <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                    placeholder="Enter your full name"
                />
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nickname (Always Public):</label>
                <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                    placeholder="Enter your nickname (optional)"
                />
            </div>

            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Birthday:</label>
                <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                />
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={isFullNameVisible}
                        onChange={(e) => setIsFullNameVisible(e.target.checked)}
                        style={{ transform: 'scale(1.2)' }}
                    />
                    <span style={{ fontSize: '15px' }}>Allow others to see my Full Name</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={isBirthdayVisible}
                        onChange={(e) => setIsBirthdayVisible(e.target.checked)}
                        style={{ transform: 'scale(1.2)' }}
                    />
                    <span style={{ fontSize: '15px' }}>Allow others to see my Birthday (Month/Day)</span>
                </label>
            </div>

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
                    checked={weatherPrefs.navWidget.visible}
                    onChange={(e) => handleWeatherPrefChange('navWidget.visible', e.currentTarget.checked)}
                />
                <Select
                    label="Nav Widget Forecast Type"
                    data={['hourly', '6-hour', 'daily']}
                    value={weatherPrefs.navWidget.displayMode}
                    onChange={(value) => handleWeatherPrefChange('navWidget.displayMode', value)}
                    mt="sm"
                    disabled={!weatherPrefs.navWidget.visible}
                />
            </Paper>

            <button
                onClick={handleSave}
                style={{
                    width: '100%',
                    padding: '12px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease',
                    marginTop: '20px'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
                Save Settings
            </button>
            {saveStatus && (
                <p style={{ textAlign: 'center', marginTop: '15px', color: saveStatus.includes('saved') ? 'green' : 'red' }}>
                    {saveStatus}
                </p>
            )}
        </div>
    );
};

export default MyAccount;