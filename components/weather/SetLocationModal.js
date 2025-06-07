'use client';
import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Text, Alert } from '@mantine/core';
import { useWeather } from '../../hooks/useWeather';
import { ref, set, push as firebasePush, update } from 'firebase/database';
import { database } from '../../firebase/firebase';

const SetLocationModal = ({ opened, onClose, effectiveRole }) => {
    const { campID, fetchTemporaryWeather, clearTemporaryWeather } = useWeather();
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isAuthorizedToSave = effectiveRole >= 5; // Crew Boss or higher
    const isAuthorizedToSetPrimary = effectiveRole >= 6; // Camp Boss or higher

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
        if (!lat || !lon || (isAuthorizedToSave && !name)) {
            setError('Latitude, Longitude, and Name are required to save a new location.');
            return;
        }
        setError('');
        setLoading(true);

        const year = new Date().getFullYear();
        const newLocationRef = firebasePush(ref(database, `/camps/${campID}/campLocations/${year}`));
        const newLocationId = newLocationRef.key;

        const newLocationData = {
            campLocationName: name,
            latLong: {
                latitude: parseFloat(lat),
                longitude: parseFloat(lon)
            },
            // You can add other default fields here if necessary
            secondaryLocations: {}
        };
        
        try {
            const updates = {};
            updates[`/camps/${campID}/campLocations/${year}/${newLocationId}`] = newLocationData;

            // If "Set as Primary" is clicked, also update the activeLocationId for the camp
            if (setAsPrimary) {
                updates[`/camps/${campID}/activeLocationId`] = newLocationId;
            }

            await update(ref(database), updates);
            alert('Location saved successfully!');
            onClose();
        } catch (err) {
            console.error("Error saving location:", err);
            setError('Failed to save location.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleClose = () => {
        // Also clear any temporary weather data when closing the modal
        clearTemporaryWeather();
        onClose();
    }

    return (
        <Modal opened={opened} onClose={handleClose} title="Set Weather Location" centered>
            <Text size="sm" c="dimmed" mb="md">
                Enter the coordinates for the location you want to see weather for.
            </Text>
            {error && <Alert color="red" title="Error" mb="md" withCloseButton onClose={() => setError('')}>{error}</Alert>}
            
            <TextInput
                label="Latitude"
                placeholder="e.g., 43.0096"
                value={lat}
                onChange={(e) => setLat(e.currentTarget.value)}
                mb="sm"
            />
            <TextInput
                label="Longitude"
                placeholder="e.g., -81.2453"
                value={lon}
                onChange={(e) => setLon(e.currentTarget.value)}
                mb="md"
            />

            {isAuthorizedToSave && (
                 <TextInput
                    label="Location Name"
                    placeholder="e.g., Main Camp"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    mb="lg"
                />
            )}
            
            <Group justify="flex-end">
                <Button variant="default" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleOneTimeFetch}>Get Weather (One-Time)</Button>
                {isAuthorizedToSave && <Button loading={loading} onClick={() => handleSaveNewLocation(false)}>Save Location</Button>}
                {isAuthorizedToSetPrimary && <Button loading={loading} color="green" onClick={() => handleSaveNewLocation(true)}>Save and Set as Primary</Button>}
            </Group>
        </Modal>
    );
};

export default SetLocationModal;