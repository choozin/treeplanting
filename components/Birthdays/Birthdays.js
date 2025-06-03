// components/Birthdays/Birthdays.js
'use client';

import React, { useState, useEffect } from 'react';
import { database } from '../../firebase/firebase';
import { ref, onValue } from 'firebase/database';

const Birthdays = () => {
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const usersRef = ref(database, 'users');
        const unsubscribe = onValue(
            usersRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const usersData = snapshot.val();
                    const loadedUsers = Object.keys(usersData).map(uid => ({
                        uid,
                        ...usersData[uid],
                    }));
                    setAllUsers(loadedUsers);
                } else {
                    setAllUsers([]);
                }
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching users for birthdays:', err);
                setError('Failed to load birthday data.');
                setLoading(false);
            }
        );

        return () => unsubscribe(); // Cleanup the listener
    }, []);

    const getVisibleBirthdays = () => {
        const currentYear = new Date().getFullYear();
        const birthdays = [];

        allUsers.forEach(user => {
            if (user.profile && user.profile.isBirthdayVisible && user.profile.birthday) {
                try {
                    const [year, month, day] = user.profile.birthday.split('-').map(Number);
                    if (month && day) { // Basic validation for month and day existence
                        const birthdayDate = new Date(currentYear, month - 1, day); // month is 0-indexed
                        birthdays.push({
                            name: user.profile.nickname || user.profile.fullName || user.email,
                            date: birthdayDate,
                            originalBirthday: user.profile.birthday // Keep original for sorting reference if needed
                        });
                    }
                } catch (e) {
                    console.warn(`Invalid birthday format for user ${user.uid}: ${user.profile.birthday}`);
                }
            }
        });

        // Sort birthdays: upcoming first, then by date, then by name
        birthdays.sort((a, b) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize today's date

            // Calculate "time until birthday" for sorting purposes
            const aTime = a.date.getTime();
            const bTime = b.date.getTime();
            const todayTime = today.getTime();

            // Logic to put passed birthdays at the end of the list for the current year
            let aAdjustedDate = a.date;
            if (a.date < today) {
                aAdjustedDate = new Date(currentYear + 1, a.date.getMonth(), a.date.getDate());
            }

            let bAdjustedDate = b.date;
            if (b.date < today) {
                bAdjustedDate = new Date(currentYear + 1, b.date.getMonth(), b.date.getDate());
            }

            if (aAdjustedDate.getTime() !== bAdjustedDate.getTime()) {
                return aAdjustedDate.getTime() - bAdjustedDate.getTime();
            }

            // If same date, sort by name
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        return birthdays;
    };

    const upcomingBirthdays = getVisibleBirthdays();

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading birthdays...</div>;
    }

    if (error) {
        return <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>Error: {error}</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#333' }}>Upcoming Birthdays ({new Date().getFullYear()})</h2>
            {upcomingBirthdays.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>No public birthdays found or allowed for this year.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {upcomingBirthdays.map((bday, index) => (
                        <li key={index} style={{
                            padding: '10px 0',
                            borderBottom: '1px solid #eee',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontWeight: 'bold', color: '#555' }}>{bday.name}</span>
                            <span style={{ color: '#007bff' }}>
                                {bday.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Birthdays;