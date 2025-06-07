'use client';

import React, { useState } from 'react';
import { useWeather } from '../../hooks/useWeather';
import { Container, Title, Text, Paper, Alert, Button, Center } from '@mantine/core';
import SetLocationModal from './SetLocationModal';

const WeatherPage = ({ effectiveRole }) => {
    const { primary, secondary, temporary, refresh } = useWeather();
    const [modalOpened, setModalOpened] = useState(false);

    const dataToShow = temporary.data || primary.data;
    const locationName = temporary.data ? "Manual Entry" : primary.location?.name;
    const isLoading = primary.loading || temporary.loading;
    const error = primary.error || temporary.error;

    if (isLoading) {
        return <Center><Text>Loading weather...</Text></Center>;
    }

    if (primary.status === 'no_location_set') {
        return (
            <Container size="sm">
                <SetLocationModal opened={modalOpened} onClose={() => setModalOpened(false)} effectiveRole={effectiveRole} />
                <Paper withBorder p="xl" radius="md" style={{ textAlign: 'center' }}>
                    <Title order={3} mb="sm">No Location Set</Title>
                    <Text c="dimmed" mb="xl">A primary location has not been set for this camp.</Text>
                    <Button onClick={() => setModalOpened(true)}>Set Camp Location</Button>
                </Paper>
            </Container>
        );
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