// components/MyAccount/MyAccount.js
'use client';

import React, { useState, useEffect } from 'react';
import { auth, database } from '../../firebase/firebase';
import { ref, get, set, update } from 'firebase/database';

const MyAccount = ({ user, setUserData }) => {
    const [fullName, setFullName] = useState('');
    const [nickname, setNickname] = useState('');
    const [birthday, setBirthday] = useState(''); // YYYY-MM-DD format
    const [isFullNameVisible, setIsFullNameVisible] = useState(false);
    const [isBirthdayVisible, setIsBirthdayVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saveStatus, setSaveStatus] = useState(''); // To show success/error message after saving

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const userProfileRef = ref(database, `users/${user.uid}/profile`);
        get(userProfileRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const profileData = snapshot.val();
                    setFullName(profileData.fullName || '');
                    setNickname(profileData.nickname || '');
                    setBirthday(profileData.birthday || '');
                    setIsFullNameVisible(profileData.isFullNameVisible || false);
                    setIsBirthdayVisible(profileData.isBirthdayVisible || false);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching user profile:', err);
                setError('Failed to load profile data.');
                setLoading(false);
            });
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
            const userRef = ref(database, `users/${user.uid}/profile`);
            await set(userRef, profileData); // Use set to overwrite or create the profile node
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
                    marginTop: '10px'
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