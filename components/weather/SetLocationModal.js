'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, TextInput, Button, Group, Text, Alert, Radio, Select, Stack } from '@mantine/core';
import { useWeather } from '../../hooks/useWeather';
import { useAuth } from '../../hooks/useAuth';
import { ref, set, push as firebasePush, update, get } from 'firebase/database';
import { database } from '../../firebase/firebase';

const SetLocationModal = ({ opened, onClose }) => {
    const { campID, fetchTemporaryWeather, clearTemporaryWeather } = useWeather();
    const { user, userData, effectiveRole } = useAuth();

    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [locationScope, setLocationScope] = useState('Personal');
    const [selectedCrew, setSelectedCrew] = useState(null);
    const [crews, setCrews] = useState([]);
    const [personalLocationCount, setPersonalLocationCount] = useState(0);

    const isAuthorizedToSaveCamp = effectiveRole >= 5;
    const isAuthorizedToSaveCrew = effectiveRole >= 3;
    const canExceedPersonalLimit = effectiveRole >= 9;

    useEffect(() => {
        if (!opened) {
            // Reset form state on close
            setLat('');
            setLon('');
            setName('');
            setError('');
            setLocationScope('Personal');
            setSelectedCrew(null);
        } else {
            // Fetch necessary data when modal opens
            const fetchData = async () => {
                if (isAuthorizedToSaveCamp && campID) {
                    const crewsRef = ref(database, `camps/${campID}/crews`);
                    const snapshot = await get(crewsRef);
                    if (snapshot.exists()) {
                        const crewsData = snapshot.val();
                        const crewList = Object.keys(crewsData).map(crewId => ({
                            value: crewId,
                            label: crewsData[crewId].crewName
                        }));
                        setCrews(crewList);
                    }
                }
                if (user) {
                    const personalLocationsRef = ref(database, `users/${user.uid}/customLocations`);
                    const snapshot = await get(personalLocationsRef);
                    setPersonalLocationCount(snapshot.exists() ? Object.keys(snapshot.val()).length : 0);
                }
            };
            fetchData();
        }
    }, [opened, campID, user, isAuthorizedToSaveCamp]);


    const handleOneTimeFetch = () => {
        if (!lat || !lon) {
            setError('Latitude and Longitude are required.');
            return;
        }
        setError('');
        fetchTemporaryWeather(parseFloat(lat), parseFloat(lon));
        onClose();
    };

    const handleSaveNewLocation = async (setAsPrimary) => {
        if (!lat || !lon || !name) {
            setError('Latitude, Longitude, and Name are required to save a new location.');
            return;
        }

        if (locationScope === 'Personal' && personalLocationCount >= 5 && !canExceedPersonalLimit) {
            setError('You have reached your limit of 5 personal locations. Please delete one to add another.');
            return;
        }

        setError('');
        setLoading(true);

        const newLocationData = {
            campLocationName: name,
            latLong: {
                latitude: parseFloat(lat),
                longitude: parseFloat(lon)
            },
            createdBy: user.uid,
            createdAt: new Date().toISOString(),
        };

        let path;
        const year = new Date().getFullYear();

        try {
            switch (locationScope) {
                case 'Personal':
                    path = `users/${user.uid}/customLocations/${firebasePush(ref(database, `users/${user.uid}/customLocations`)).key}`;
                    await set(ref(database, path), newLocationData);
                    break;
                case 'Crew':
                    const userCrewId = userData?.assignedCamps?.[campID]?.crewId;
                    if (!userCrewId) {
                        throw new Error("You are not assigned to a crew.");
                    }
                    path = `camps/${campID}/crews/${userCrewId}/customLocations/${firebasePush(ref(database, `camps/${campID}/crews/${userCrewId}/customLocations`)).key}`;
                    await set(ref(database, path), newLocationData);
                    break;
                case 'Camp':
                    if (selectedCrew) {
                        path = `camps/${campID}/crews/${selectedCrew}/customLocations/${firebasePush(ref(database, `camps/${campID}/crews/${selectedCrew}/customLocations`)).key}`;
                    } else {
                        const newLocationRef = firebasePush(ref(database, `/camps/${campID}/campLocations/${year}`));
                        path = `/camps/${campID}/campLocations/${year}/${newLocationRef.key}`;

                        const updates = {};
                        updates[path] = newLocationData;
                        if (setAsPrimary) {
                            updates[`/camps/${campID}/activeLocationId`] = newLocationRef.key;
                        }
                        await update(ref(database), updates);
                    }
                    await set(ref(database, path), newLocationData);
                    break;
                default:
                    throw new Error("Invalid location scope.");
            }

            alert('Location saved successfully!');
            onClose();

        } catch (err) {
            console.error("Error saving location:", err);
            setError(`Failed to save location: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        clearTemporaryWeather();
        onClose();
    };

    return (
        <Modal opened={opened} onClose={handleClose} title="Set Weather Location" centered>
            <Stack>
                <Text size="sm" c="dimmed" mb="md">
                    Enter coordinates to get weather information. You can also save locations for future use.
                </Text>
                {error && <Alert color="red" title="Error" mb="md" withCloseButton onClose={() => setError('')}>{error}</Alert>}

                <TextInput
                    label="Location Name"
                    placeholder="e.g., Main Camp, Block 101"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    mb="sm"
                    required
                />
                <TextInput
                    label="Latitude"
                    placeholder="e.g., 43.0096"
                    value={lat}
                    onChange={(e) => setLat(e.currentTarget.value)}
                    mb="sm"
                    required
                />
                <TextInput
                    label="Longitude"
                    placeholder="e.g., -81.2453"
                    value={lon}
                    onChange={(e) => setLon(e.currentTarget.value)}
                    mb="md"
                    required
                />

                <Radio.Group
                    name="locationScope"
                    label="Save this location as:"
                    value={locationScope}
                    onChange={setLocationScope}
                >
                    <Group mt="xs">
                        <Radio value="Personal" label="Personal" />
                        {isAuthorizedToSaveCrew && <Radio value="Crew" label="Crew" />}
                        {isAuthorizedToSaveCamp && <Radio value="Camp" label="Camp-wide" />}
                    </Group>
                </Radio.Group>

                {isAuthorizedToSaveCamp && locationScope === 'Camp' && (
                    <Select
                        label="Assign to a specific crew (optional)"
                        placeholder="Or leave blank for a general camp location"
                        data={crews}
                        value={selectedCrew}
                        onChange={setSelectedCrew}
                        clearable
                        mt="sm"
                    />
                )}


                <Group justify="flex-end" mt="lg">
                    <Button variant="default" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleOneTimeFetch}>Get Weather (One-Time)</Button>
                    <Button loading={loading} onClick={() => handleSaveNewLocation(false)}>Save Location</Button>
                    {isAuthorizedToSaveCamp && locationScope === 'Camp' && !selectedCrew && (
                        <Button loading={loading} color="green" onClick={() => handleSaveNewLocation(true)}>Save and Set as Primary</Button>
                    )}
                </Group>
            </Stack>
        </Modal>
    );
};

export default SetLocationModal;