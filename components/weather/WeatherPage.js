'use client';

import React, { useState } from 'react';
import { useWeather } from '../../hooks/useWeather';
import { Container, Title, Text, Paper, Alert, Button, Center, Group } from '@mantine/core';
import SetLocationModal from './SetLocationModal';
import { IconAlertCircle } from '@tabler/icons-react';

const WeatherPage = ({ effectiveRole }) => {
    const { primary, secondary, temporary, refresh } = useWeather();
    const [modalOpened, setModalOpened] = useState(false);

    const dataToShow = temporary.data || primary.data;
    const locationName = temporary.data ? "Manual Entry" : primary.location?.name;
    const isLoading = primary.loading || temporary.loading;
    const error = primary.error || temporary.error;

    if (isLoading && !dataToShow) { // Only show full-page loader if there's no data to display
        return <Center><Text>Loading weather...</Text></Center>;
    }

    if (primary.status === 'no_camp_selected') {
        return (
            <Container size="sm">
                <Paper withBorder p="xl" radius="md" style={{ textAlign: 'center' }}>
                    <Title order={3} mb="sm">No Camp Selected</Title>
                    <Text c="dimmed">Please select a camp from the navigation menu to see weather information.</Text>
                </Paper>
            </Container>
        )
    }

    if (error) {
        return <Alert color="red" title="Error">{error}</Alert>;
    }

    if (!dataToShow) {
        return <Text>No weather data available. Please set a location.</Text>;
    }


    return (
        <Container>
            <SetLocationModal opened={modalOpened} onClose={() => setModalOpened(false)} effectiveRole={effectiveRole} />

            {primary.status === 'using_default_location' && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Showing Default Location" color="orange" withCloseButton mb="md">
                    A primary location has not been set for this camp. Showing weather for Prince George, BC.
                    <Button onClick={() => setModalOpened(true)} size="xs" variant="outline" color="orange" mt="sm">
                        Set Camp Location
                    </Button>
                </Alert>
            )}

            <Group justify="space-between" align="center">
                <Title order={2}>Weather Forecast</Title>
                <Button variant="outline" onClick={() => setModalOpened(true)}>Change Location</Button>
            </Group>

            <Paper p="md" shadow="sm" mt="md">
                <Title order={3}>{locationName}</Title>
                <Text>Current Temp: {dataToShow.current.temperature_2m}°C</Text>
                <Text>Feels like: {dataToShow.current.apparent_temperature}°C</Text>
            </Paper>

            {secondary.data && (
                <Paper p="md" shadow="sm" mt="md">
                    <Title order={4}>Secondary: {secondary.location?.name}</Title>
                    <Text>Current Temp: {secondary.data.current.temperature_2m}°C</Text>
                </Paper>
            )}
        </Container>
    );
};

export default WeatherPage;