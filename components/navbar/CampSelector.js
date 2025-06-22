'use client';
import React, { useState, useEffect, forwardRef } from 'react';
import Cookies from 'js-cookie';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase/firebase';
import { ROLES } from '../../lib/constants';
import {
    Badge,
    Group,
    Text,
    Title,
    Divider,
} from '@mantine/core';

import classes from './Navbar.module.css';

const CampSelector = forwardRef(({ user, userData, campID, onCampSelect, effectiveRole }, forwardedRef) => {
    const [camps, setCamps] = useState({});
    const [loadingCamps, setLoadingCamps] = useState(true);
    const [errorCamps, setErrorCamps] = useState(null);

    const handleCampChange = (value) => {
        onCampSelect(value);
        if (value && user) {
            Cookies.set(`campID_${user.uid}`, value, { expires: 30 });
        } else if (user) {
            Cookies.remove(`campID_${user.uid}`);
        }
        window.dispatchEvent(new Event('campChange'));
    };

    useEffect(() => {
        if (!user || !user.uid) {
            setLoadingCamps(false);
            return;
        }

        const fetchAssignedCamps = async () => {
            setLoadingCamps(true);
            setErrorCamps(null);
            try {
                const userAssignedCampsRef = ref(database, `users/${user.uid}/assignedCamps`);
                const snapshot = await get(userAssignedCampsRef);
                let fetchedCampsData = {};

                if (snapshot.exists()) {
                    fetchedCampsData = snapshot.val();
                    setCamps(fetchedCampsData);
                } else {
                    setErrorCamps('You must be assigned to a camp to access camp-specific features.');
                }
            } catch (fetchError) {
                setErrorCamps('Error fetching assigned camps: ' + fetchError.message);
            }
            setLoadingCamps(false);
        };

        fetchAssignedCamps();
    }, [user]);

    const campOptions = Object.entries(camps).map(([id, campData]) => ({
        id,
        label: campData.campName || `Unnamed Camp (${id})`,
    }));

    const roleTitle = effectiveRole > 0 ? ROLES[effectiveRole] || 'Member' : 'N/A';
    const displayName = userData?.profile?.nickname || userData?.name;
    const currentCampName = userData?.assignedCamps?.[campID]?.campName; // Fixed line here

    return (
        <div ref={forwardedRef} style={{ width: '100%' }}>
            {loadingCamps ? (
                <Text>Loading camps...</Text>
            ) : campID ? (
                <>
                    <Title order={3} ta="center" className={classes.campTitle}>
                        {currentCampName || 'Selected Camp'}
                    </Title>
                    <Text size="sm" c="dimmed" ta="center">
                        Welcome, {roleTitle} {displayName}
                    </Text>
                    {campOptions.length > 1 && (
                        <>
                            <Divider my="sm" label="Switch Camp" labelPosition="center" />
                            <Group justify="center" gap="sm" className={classes.campBadgeContainer}>
                                {campOptions.map((camp) => (
                                    <Badge
                                        key={camp.id}
                                        size="xl"
                                        radius="sm"
                                        variant={camp.id === campID ? 'filled' : 'light'}
                                        color={camp.id === campID ? 'blue' : 'gray'}
                                        onClick={() => handleCampChange(camp.id)}
                                        className={classes.campBadge}
                                    >
                                        {camp.label}
                                    </Badge>
                                ))}
                            </Group>
                        </>
                    )}
                </>
            ) : (
                <>
                    <Text ta="center" fw={500} size="lg">
                        Please select your active camp:
                    </Text>
                    <Group justify="center" gap="sm" className={classes.campBadgeContainer}>
                        {campOptions.length > 0 ? (
                            campOptions.map((camp) => (
                                <Badge
                                    key={camp.id}
                                    size="xl"
                                    radius="sm"
                                    variant="light"
                                    onClick={() => handleCampChange(camp.id)}
                                    className={classes.campBadge}
                                >
                                    {camp.label}
                                </Badge>
                            ))
                        ) : (
                            <Text c="dimmed">
                                {errorCamps || 'You must be assigned to a camp to access camp-specific features.'}
                            </Text>
                        )}
                    </Group>
                </>
            )}
        </div>
    );
});

CampSelector.displayName = 'CampSelector';

export default CampSelector;