// components/weather/WeatherPage.js
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useWeather } from '../../hooks/useWeather';
import { database } from '../../firebase/firebase';
import { ref, get } from 'firebase/database';
import {
    Container, Title, Text, Paper, Alert, Button, Center, Group,
    Card, Badge, Flex, Grid, Stack, ScrollArea, Tabs, Divider
} from '@mantine/core';
import SetLocationModal from './SetLocationModal';
import { notifications } from '@mantine/notifications';

// Helper function to map weather codes to icons and descriptions
const getWeatherIconAndDescription = (code, isDay) => {
    const descriptions = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog', 51: 'Drizzle light', 53: 'Drizzle moderate',
        55: 'Drizzle dense', 56: 'Freezing Drizzle light', 57: 'Freezing Drizzle dense',
        61: 'Rain slight', 63: 'Rain moderate', 65: 'Rain heavy', 66: 'Freezing Rain light',
        67: 'Freezing Rain heavy', 71: 'Snow fall slight', 73: 'Snow fall moderate',
        75: 'Snow fall heavy', 77: 'Snow grains', 80: 'Rain showers slight',
        81: 'Rain showers moderate', 82: 'Rain showers violent', 85: 'Snow showers slight',
        86: 'Snow showers heavy', 95: 'Thunderstorm light', 96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail',
    };

    const numericCode = typeof code === 'number' && !isNaN(code) ? code : null;
    const description = descriptions[numericCode] || 'Unknown Weather';

    let iconContent;

    switch (numericCode) {
        case 0: case 1: iconContent = isDay ? '☀️' : '✨'; break;
        case 2: iconContent = '🌤️'; break;
        case 3: iconContent = '☁️'; break;
        case 45: case 48: iconContent = '🌫️'; break;
        case 51: case 53: case 55: case 56: case 57: iconContent = '🌧️'; break;
        case 61: case 63: case 65: case 67: iconContent = '☔'; break;
        case 66: iconContent = '💧❄️'; break;
        case 71: case 73: case 75: case 77: iconContent = '🌨️'; break;
        case 80: case 81: case 82: iconContent = '⛈️'; break;
        case 85: case 86: iconContent = '🌨️'; break;
        case 95: case 96: case 99: iconContent = '⚡'; break;
        default: iconContent = '❓'; break;
    }

    return { icon: <span style={{ fontSize: '36px' }}>{iconContent}</span>, description: description };
};

// Helper function for cardinal wind direction
const getCardinalDirection = (degrees) => {
    if (typeof degrees !== 'number' || isNaN(degrees)) return 'N/A';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    // Round to the nearest 22.5-degree increment (360 / 16)
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
};

// New: WeatherLocationDisplay Component
const WeatherLocationDisplay = ({ weatherData, locationInfo, backgroundColor, effectiveRole, onOpenSettings }) => {
    const current = weatherData.current;
    const hourly = weatherData.hourly;
    const daily = weatherData.daily;

    const currentWeather = getWeatherIconAndDescription(current?.weather_code, current?.is_day);

    // Use useRef to store a stable 'now' for hydration consistency
    const stableNowRef = useRef(null);
    if (stableNowRef.current === null) {
        const tempNow = new Date();
        tempNow.setMinutes(0, 0, 0); // Round down to the nearest hour for display consistency
        stableNowRef.current = tempNow;
    }
    const now = stableNowRef.current;


    const currentHourTime = now.getTime();

    const startIndexHourly = hourly?.time.findIndex(timeStr => new Date(timeStr).getTime() >= currentHourTime) || 0;
    const next12Hours = hourly?.time?.slice(startIndexHourly, startIndexHourly + 12) || [];

    const handleCopyCoordinates = () => {
        if (locationInfo?.latitude && locationInfo?.longitude) {
            const coords = `${locationInfo.latitude.toFixed(6)},${locationInfo.longitude.toFixed(6)}`; // ToFixed for precision
            navigator.clipboard.writeText(coords)
                .then(() => {
                    notifications.show({ title: 'Copied!', message: `Coordinates ${coords} copied to clipboard for Google Maps.`, color: 'green' });
                })
                .catch(err => {
                    notifications.show({ title: 'Copy Failed', message: 'Could not copy coordinates.', color: 'red' });
                    console.error('Failed to copy:', err);
                });
        }
    };

    if (!weatherData) {
        return (
            <Paper p="xl" shadow="md" radius="lg" style={{ background: backgroundColor, border: '1px solid var(--mantine-color-gray-3)', minHeight: '300px' }}>
                <Center style={{ height: '100%' }}>
                    <Text c="dimmed">No weather data available for this location.</Text>
                </Center>
            </Paper>
        );
    }

    return (
        <Paper
            p="xl"
            shadow="md"
            radius="lg"
            style={{
                background: backgroundColor, // Dynamic background color
                marginBottom: 'var(--mantine-spacing-xl)',
                border: '1px solid var(--mantine-color-gray-3)'
            }}
        >
            <Group justify="space-between" align="center" mb="lg">
                <Stack gap={2}>
                    <Title order={2} style={{ color: 'var(--mantine-color-blue-9)' }}>
                        {locationInfo?.name || 'Unknown Location'}
                    </Title>
                    <Group gap="xs" align="center">
                        <Text size="sm" c="dimmed">
                            Lat: {locationInfo?.latitude?.toFixed(4)}, Long: {locationInfo?.longitude?.toFixed(4)}
                        </Text>
                        <Button size="xs" variant="light" onClick={handleCopyCoordinates} compact="true"> {/* Changed compact prop */}
                            Copy Coords
                        </Button>
                    </Group>
                </Stack>
                {/* "Change Location" button moved to Settings tab content */}
            </Group>

            {/* Current Weather - Prominent Display */}
            <Card shadow="sm" p="lg" radius="md" withBorder mb="xl" style={{ backgroundColor: 'var(--mantine-color-white)' }}>
                <Flex align="center" justify="space-between" mb="lg" wrap="wrap">
                    <Group>
                        {currentWeather.icon}
                        <Stack gap={0}>
                            <Text fw={700} size="xl" style={{ color: 'var(--mantine-color-dark-8)' }}>
                                {current?.temperature_2m}°C
                            </Text>
                            <Text size="sm" c="dimmed">Feels like: {current?.apparent_temperature}°C</Text>
                            <Text size="md" fw={500}>{currentWeather.description}</Text>
                        </Stack>
                    </Group>
                    <Stack gap="xs" style={{ minWidth: '150px' }}>
                        <Group gap="xs">
                            <span style={{ fontSize: '18px', color: 'var(--mantine-color-blue-5)' }}>💧</span>
                            <Text size="sm">Humidity: {current?.relative_humidity_2m}%</Text>
                        </Group>
                        <Group gap="xs">
                            <span style={{ fontSize: '18px', color: 'var(--mantine-color-gray-6)' }}>🌬️</span>
                            <Text size="sm">Wind: {current?.wind_speed_10m} km/h</Text>
                        </Group>
                        {current?.wind_direction_10m !== undefined && (
                            <Group gap="xs">
                                <span style={{ fontSize: '18px', color: 'var(--mantine-color-gray-6)', transform: `rotate(${current.wind_direction_10m}deg)` }}>🧭</span>
                                <Text size="sm">Dir: {getCardinalDirection(current.wind_direction_10m)} ({current.wind_direction_10m}°) </Text>
                            </Group>
                        )}
                    </Stack>
                </Flex>

                <Grid gutter="sm">
                    <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
                        <Badge variant="light" color="blue" fullWidth leftSection={<span style={{ fontSize: '14px' }}>⚖️</span>}>
                            Pressure: {current?.pressure_msl} hPa
                        </Badge>
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
                        <Badge variant="light" color="grape" fullWidth leftSection={<span style={{ fontSize: '14px' }}>🌡️</span>}>
                            Dew Point: {current?.dewpoint_2m}
                        </Badge>
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
                        <Badge variant="light" color="yellow" fullWidth leftSection={<span style={{ fontSize: '14px' }}>☀️</span>}>
                            UV Index: {current?.uv_index}
                        </Badge>
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
                        <Badge variant="light" color="gray" fullWidth leftSection={<span style={{ fontSize: '14px' }}>☁️</span>}>
                            Cloud Cover: {current?.cloudcover}%
                        </Badge>
                    </Grid.Col>
                    <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
                        <Badge variant="light" color="orange" fullWidth leftSection={<span style={{ fontSize: '14px' }}>👁️</span>}>
                            Visibility: {current?.visibility ? `${(current.visibility / 1000).toFixed(1)} km` : 'N/A'}
                        </Badge>
                    </Grid.Col>
                    {current?.snowfall !== undefined && (
                        <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
                            <Badge variant="light" color="cyan" fullWidth leftSection={<span style={{ fontSize: '14px' }}>❄️</span>}>
                                Snowfall: {current?.snowfall} mm
                            </Badge>
                        </Grid.Col>
                    )}
                    {daily?.sunrise?.[0] && (
                        <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
                            <Badge variant="light" color="red" fullWidth leftSection={<span style={{ fontSize: '14px' }}>🌅</span>}>
                                Sunrise: {new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Badge>
                        </Grid.Col>
                    )}
                    {daily?.sunset?.[0] && (
                        <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
                            <Badge variant="light" color="dark" fullWidth leftSection={<span style={{ fontSize: '14px' }}>🌇</span>}>
                                Sunset: {new Date(daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Badge>
                        </Grid.Col>
                    )}
                </Grid>
            </Card>

            {/* Hourly Forecast */}
            <Title order={3} mb="md" style={{ color: 'var(--mantine-color-dark-8)' }}> {/* Changed color here */}
                <span style={{ fontSize: '24px', verticalAlign: 'middle', marginRight: '8px' }}>🕒</span>
                Next 12 Hours
            </Title>
            <ScrollArea type="always" scrollbarSize={8} offsetScrollbars
                styles={{
                    // Scrollbar styling needs to be in global CSS for full control and cross-browser consistency.
                    // This inline style won't affect the scrollbar itself, but will be applied to the wrapper.
                    // Recommendation: Add custom scrollbar styles to app/globals.css for .mantine-ScrollArea-thumb and .mantine-ScrollArea-track
                    // Example (in globals.css):
                    // ::-webkit-scrollbar-thumb { background-color: var(--mantine-color-gray-5); }
                    // ::-webkit-scrollbar-track { background-color: var(--mantine-color-gray-2); }
                }}
            >
                <Flex direction="row" gap="md" py="xs" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '15px' }}>
                    {next12Hours.map((timeStr, index) => {
                        const hourlyIndex = startIndexHourly + index;
                        if (hourlyIndex >= (hourly.time?.length || 0)) return null;

                        const hour = new Date(timeStr);
                        const hourlyWeather = getWeatherIconAndDescription(
                            hourly.weather_code?.[hourlyIndex],
                            hourly.is_day?.[hourlyIndex] === 1
                        );

                        return (
                            <Card
                                key={timeStr}
                                shadow="xs"
                                p="sm"
                                radius="md"
                                withBorder
                                style={{
                                    minWidth: '100px',
                                    flexShrink: 0,
                                    textAlign: 'center',
                                    background: 'var(--mantine-color-white)',
                                    border: '1px solid var(--mantine-color-gray-2)'
                                }}
                            >
                                <Text size="sm" fw={700} mb="xs">
                                    {hour.toLocaleTimeString([], { hour: 'numeric', hour12: true })}
                                </Text>
                                <Center mb="xs">{hourlyWeather.icon}</Center>
                                <Text size="md" fw={500} mb={4}>
                                    {hourly.temperature_2m?.[hourlyIndex]}°C
                                </Text>
                                <Text size="xs" c="dimmed">{hourlyWeather.description}</Text>
                                {hourly.precipitation_probability?.[hourlyIndex] !== undefined && (
                                    <Text size="xs" c="blue">Precip: {hourly.precipitation_probability[hourlyIndex]}%</Text>
                                )}
                                {/* Added Hourly Wind Direction */}
                                {hourly.wind_speed_10m?.[hourlyIndex] !== undefined && (
                                    <Text size="xs" c="gray">
                                        Wind: {hourly.wind_speed_10m[hourlyIndex]} km/h{' '}
                                        {hourly.wind_direction_10m?.[hourlyIndex] !== undefined && (
                                            <span style={{ whiteSpace: 'nowrap' }}>
                                                ({getCardinalDirection(hourly.wind_direction_10m[hourlyIndex])})
                                            </span>
                                        )}
                                    </Text>
                                )}
                                {hourly.pressure_msl?.[hourlyIndex] !== undefined && (
                                    <Text size="xs" c="dimmed">Pres: {hourly.pressure_msl[hourlyIndex]} hPa</Text>
                                )}
                                {hourly.uv_index?.[hourlyIndex] !== undefined && (
                                    <Text size="xs" c="yellow">UV: {hourly.uv_index[hourlyIndex]}</Text>
                                )}
                                {hourly.cloudcover?.[hourlyIndex] !== undefined && (
                                    <Text size="xs" c="dimmed">Cloud: {hourly.cloudcover[hourlyIndex]}%</Text>
                                )}
                                {hourly.visibility?.[hourlyIndex] !== undefined && (
                                    <Text size="xs" c="dimmed">Vis: {hourly.visibility[hourlyIndex] / 1000} km</Text>
                                )}
                            </Card>
                        );
                    })}
                </Flex>
            </ScrollArea>

            {/* Daily Forecast - Now in horizontal scroll format */}
            <Title order={3} mt="xl" mb="md" style={{ color: 'var(--mantine-color-dark-8)' }}> {/* Changed color here */}
                <span style={{ fontSize: '24px', verticalAlign: 'middle', marginRight: '8px' }}>🗓️</span>
                Next 7 Days
            </Title>
            <ScrollArea type="always" scrollbarSize={8} offsetScrollbars
                styles={{
                    // Scrollbar styling needs to be in global CSS for full control and cross-browser consistency.
                    // This inline style won't affect the scrollbar itself, but will be applied to the wrapper.
                    // Recommendation: Add custom scrollbar styles to app/globals.css for .mantine-ScrollArea-thumb and .mantine-ScrollArea-track
                }}
            >
                <Flex direction="row" gap="md" py="xs" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '15px' }}>
                    {daily?.time?.slice(0, 7).map((timeStr, index) => {
                        const day = new Date(`${timeStr}T00:00:00`);
                        if (index >= (daily.time?.length || 0)) return null;

                        const dailyWeather = getWeatherIconAndDescription(daily.weather_code?.[index], true);

                        return (
                            <Card
                                key={timeStr}
                                shadow="xs"
                                p="md"
                                radius="md"
                                withBorder
                                style={{
                                    minWidth: '120px',
                                    flexShrink: 0,
                                    textAlign: 'center',
                                    background: 'var(--mantine-color-white)',
                                    border: '1px solid var(--mantine-color-gray-2)'
                                }}
                            >
                                <Text size="sm" fw={700} mb="xs">
                                    {index === 0 ? 'Today' : day.toLocaleDateString([], { weekday: 'short' })}
                                </Text>
                                <Center mb="xs">{dailyWeather.icon}</Center>
                                <Text size="md" fw={500} mb={4}>
                                    {daily.temperature_2m_max?.[index]}° / {daily.temperature_2m_min?.[index]}°C
                                </Text>
                                <Text size="xs" c="dimmed">{dailyWeather.description}</Text>

                                {daily.precipitation_sum?.[index] !== undefined && (
                                    <Text size="xs" c="blue">Precip: {daily.precipitation_sum[index]} mm</Text>
                                )}
                                {daily.wind_speed_10m_max?.[index] !== undefined && (
                                    <Text size="xs" c="gray">
                                        Wind: {daily.wind_speed_10m_max[index]} km/h{' '}
                                        {daily.wind_direction_10m_dominant?.[index] !== undefined && (
                                            <span style={{ whiteSpace: 'nowrap' }}>
                                                ({getCardinalDirection(daily.wind_direction_10m_dominant[index])})
                                            </span>
                                        )}
                                    </Text>
                                )}
                                {daily.uv_index_max?.[index] !== undefined && (
                                    <Text size="xs" c="yellow">UV: {daily.uv_index_max[index]}</Text>
                                )}
                                {daily.wind_gusts_10m_max?.[index] !== undefined && (
                                    <Text size="xs" c="gray">Gusts: {daily.wind_gusts_10m_max[index]} km/h</Text>
                                )}
                                {daily.shortwave_radiation_sum?.[index] !== undefined && (
                                    <Text size="xs" c="dimmed">Solar Rad: {daily.shortwave_radiation_sum[index]} W/m²</Text>
                                )}
                            </Card>
                        );
                    })}
                </Flex>
            </ScrollArea>
        </Paper>
    );
};

// Main WeatherPage component with tabs
const WeatherPage = ({ effectiveRole }) => {
    const { primary, secondary, temporary, campID, primaryLocationId, fetchTemporaryWeather, clearTemporaryWeather } = useWeather();
    const [activeTab, setActiveTab] = useState('camp_primary');
    const [modalOpened, setModalOpened] = useState(false); // For SetLocationModal
    const [allSecondaryLocations, setAllSecondaryLocations] = useState([]);
    const [loadingSecondaryLocations, setLoadingSecondaryLocations] = useState(true);
    const [errorSecondaryLocations, setErrorSecondaryLocations] = useState(null);

    // Fetch all secondary locations for the current primary camp location
    useEffect(() => {
        console.log("WeatherPage: useEffect for secondary locations triggered.");
        console.log("WeatherPage: campID:", campID);
        console.log("WeatherPage: primaryLocationId:", primaryLocationId); // This is primary.primaryLocationId from context

        // FIX: Explicitly check primary.primaryLocationId which comes from useWeather
        if (!campID || !primary.primaryLocationId) { // Check primary.primaryLocationId directly from the object
            console.log("WeatherPage: Skipping secondary fetch: campID or primary.primaryLocationId is missing.");
            setAllSecondaryLocations([]);
            setLoadingSecondaryLocations(false);
            return;
        }

        const fetchSecondaryLocs = async () => {
            setLoadingSecondaryLocations(true);
            setErrorSecondaryLocations(null);
            const currentYear = new Date().getFullYear();
            // Use primary.primaryLocationId directly here as well
            const secondaryLocsRef = ref(database, `camps/${campID}/campLocations/${currentYear}/${primary.primaryLocationId}/secondaryLocations`);

            console.log("WeatherPage: Fetching secondary locations from path:", `camps/${campID}/campLocations/${currentYear}/${primary.primaryLocationId}/secondaryLocations`);

            try {
                const snapshot = await get(secondaryLocsRef);
                console.log("WeatherPage: Secondary locations snapshot exists:", snapshot.exists());
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    console.log("WeatherPage: Raw secondary locations data:", data);
                    const locsArray = Object.entries(data).map(([id, loc]) => ({
                        id,
                        name: loc.name,
                        latitude: loc.latLong.latitude,
                        longitude: loc.latLong.longitude,
                        type: 'secondary'
                    }));
                    setAllSecondaryLocations(locsArray);
                    console.log("WeatherPage: Processed secondary locations array:", locsArray);
                } else {
                    setAllSecondaryLocations([]);
                }
            } catch (err) {
                console.error("WeatherPage: Error fetching secondary locations:", err);
                setErrorSecondaryLocations("Failed to load secondary locations.");
            } finally {
                setLoadingSecondaryLocations(false);
                console.log("WeatherPage: Finished fetching secondary locations. Loading state:", false);
            }
        };

        fetchSecondaryLocs();
    }, [campID, primary.primaryLocationId]); // Dependency array also uses primary.primaryLocationId


    // Determine all tabs and their content
    const tabsConfig = useMemo(() => {
        console.log("WeatherPage: tabsConfig useMemo triggered.");
        console.log("WeatherPage: Primary location status:", primary.status, "data:", primary.data, "location:", primary.location);
        console.log("WeatherPage: All secondary locations state:", allSecondaryLocations);
        console.log("WeatherPage: Temporary location data:", temporary.data);

        const tabs = [];

        // 1. Camp's Primary Location Tab
        // Only add if primary location data is available or loading (not an error state initially)
        if (primary.location || primary.loading || primary.error) {
            tabs.push({
                value: 'camp_primary',
                label: primary.location?.name || 'Camp Location',
                colorType: 'camp',
                data: primary.data,
                locationInfo: primary.location,
                loading: primary.loading,
                error: primary.error,
                status: primary.status,
                id: primary.primaryLocationId,
            });
        }

        // 2. All Secondary Locations Tabs
        if (loadingSecondaryLocations) {
            tabs.push({
                value: 'loading_secondary',
                label: 'Loading Secondary...',
                colorType: 'settings', // Gray for loading
                data: null, locationInfo: null, loading: true, error: null, status: 'loading'
            });
        } else if (errorSecondaryLocations) {
            tabs.push({
                value: 'error_secondary',
                label: 'Sec. Loc. Error',
                colorType: 'settings', // Gray for error
                data: null, locationInfo: null, loading: false, error: errorSecondaryLocations, status: 'error'
            });
        } else {
            allSecondaryLocations.sort((a, b) => a.name.localeCompare(b.name)).forEach(secLoc => {
                // Determine if this secondary location is the one currently being fetched by WeatherProvider.secondary
                const isPreferredSecondary = secondary.location && secondary.location.latitude === secLoc.latitude && secondary.location.longitude === secLoc.longitude;

                tabs.push({
                    value: `secondary_${secLoc.id}`,
                    label: secLoc.name,
                    colorType: 'block',
                    // Pass the secondary location's info directly.
                    // If this secondary location matches the one WeatherProvider is fetching data for, use that data.
                    data: isPreferredSecondary ? secondary.data : null, // This will be null if not the preferred secondary location
                    locationInfo: secLoc,
                    loading: isPreferredSecondary ? secondary.loading : false,
                    error: isPreferredSecondary ? secondary.error : null,
                    status: isPreferredSecondary ? secondary.status : 'idle',
                    id: secLoc.id,
                });
            });
        }

        // 3. Custom Location Tab
        if (temporary.data || temporary.loading || temporary.error) {
            tabs.push({
                value: 'custom_location',
                label: 'Custom Location',
                colorType: 'custom',
                data: temporary.data,
                locationInfo: temporary.location || { name: 'Custom Location', latitude: null, longitude: null },
                loading: temporary.loading,
                error: temporary.error,
                status: temporary.status,
            });
        }

        // 4. Settings Tab (always last)
        tabs.push({
            value: 'settings',
            label: 'Settings ⚙️',
            colorType: 'settings',
            data: null, // No weather data for settings
            locationInfo: null,
            loading: false, error: null, status: 'ok'
        });

        // Set default tab if no primary location is set or if current tab is no longer available
        const defaultTabValue = primary.location ? 'camp_primary' : (tabs.length > 0 && tabs[0].value !== 'loading_secondary' ? tabs[0].value : 'settings'); // Fallback to first non-loading tab, then settings
        console.log("WeatherPage: Current activeTab before adjustment:", activeTab);
        if (!tabs.some(tab => tab.value === activeTab)) { // If current activeTab is not in the new list
            console.log("WeatherPage: Active tab not found in new tabsConfig. Setting to default:", defaultTabValue);
            setActiveTab(defaultTabValue);
        } else if (activeTab === 'camp_primary' && !primary.location && !primary.loading) { // If was primary, but primary is now gone/error after loading
            console.log("WeatherPage: Primary tab active but primary.location gone. Setting to default:", defaultTabValue);
            setActiveTab(defaultTabValue);
        } else if (activeTab.startsWith('secondary_') && !allSecondaryLocations.some(loc => `secondary_${loc.id}` === activeTab) && !loadingSecondaryLocations) {
            // If active tab was a secondary one, but it's no longer in the list
            console.log("WeatherPage: Secondary tab active but secondary location gone. Setting to default:", defaultTabValue);
            setActiveTab(defaultTabValue);
        } else if (activeTab === 'custom_location' && !temporary.data && !temporary.loading && !temporary.error) {
            // If active tab was custom, but custom data is no longer active
            console.log("WeatherPage: Custom tab active but custom data gone. Setting to default:", defaultTabValue);
            setActiveTab(defaultTabValue);
        }

        console.log("WeatherPage: Final tabsConfig:", tabs);
        return tabs;
    }, [primary, secondary, temporary, campID, primary.primaryLocationId, allSecondaryLocations, loadingSecondaryLocations, errorSecondaryLocations, activeTab]); // Added primary.primaryLocationId to dependencies

    // Determine current tab's background color
    const currentTabConfig = useMemo(() => tabsConfig.find(tab => tab.value === activeTab), [activeTab, tabsConfig]);

    const backgroundColors = useMemo(() => ({
        'camp': '#dcc6a4',
        'block': '#86a389',
        'custom': 'var(--mantine-color-blue-1)', // Light Mantine blue
        'settings': 'var(--mantine-color-gray-1)', // Light Mantine grey
    }), []);

    const currentBackgroundColor = currentTabConfig ? backgroundColors[currentTabConfig.colorType] : 'var(--mantine-color-gray-0)';

    // Adjust initial active tab if it's 'camp_primary' but primary.location is not yet loaded or valid
    useEffect(() => {
        console.log("WeatherPage: useEffect for activeTab adjustment triggered. Primary loading:", primary.loading, "Primary location:", primary.location, "Active tab:", activeTab);
        if (!primary.loading && !primary.location && activeTab === 'camp_primary') {
            console.log("WeatherPage: Primary not loaded/available, activeTab is primary. Setting to settings.");
            setActiveTab('settings');
        } else if (primary.location && activeTab === 'settings' && !temporary.data && !temporary.loading && !temporary.error) {
            console.log("WeatherPage: Primary location available, activeTab is settings, no custom data. Setting to primary.");
            setActiveTab('camp_primary');
        }
    }, [primary.loading, primary.location, activeTab, temporary.data, temporary.loading, temporary.error]);


    // Show overall loading if primary data is loading or secondary locations list is loading
    if ((primary.loading && primary.status === 'loading' && !primary.data) || loadingSecondaryLocations) {
        console.log("WeatherPage: Showing overall loading spinner.");
        return <Center style={{ height: '80vh' }}><Text>Loading weather locations...</Text></Center>;
    }


    return (
        <Container size="lg" py="md">
            <SetLocationModal opened={modalOpened} onClose={() => setModalOpened(false)} effectiveRole={effectiveRole} />

            {/* Overall alerts for camp/location status */}
            {primary.status === 'no_camp_selected' && (
                <Alert icon={<span style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '8px' }}>⚠️</span>} title="No Camp Selected" color="orange" withCloseButton mb="md">
                    Please select a camp from the navigation menu to see weather information, or use the Settings tab to add a custom location.
                </Alert>
            )}
            {primary.status === 'using_default_location' && (
                <Alert icon={<span style={{ fontSize: '1rem', verticalAlign: 'middle', marginRight: '8px' }}>⚠️</span>} title="Showing Default Location" color="orange" withCloseButton mb="md">
                    A primary location has not been set for this camp. Showing weather for Prince George, BC. Use the Settings tab to set a camp location.
                </Alert>
            )}


            <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
                <Tabs.List grow>
                    {tabsConfig.map(tab => (
                        <Tabs.Tab
                            key={tab.value}
                            value={tab.value}
                            style={{
                                backgroundColor: backgroundColors[tab.colorType] || 'transparent',
                                color: 'var(--mantine-color-dark-7)',
                                borderBottom: activeTab === tab.value ? `2px solid ${backgroundColors[tab.colorType]}` : 'none',
                                fontWeight: activeTab === tab.value ? 700 : 500,
                            }}
                        >
                            {tab.label}
                        </Tabs.Tab>
                    ))}
                </Tabs.List>

                {tabsConfig.map(tab => (
                    <Tabs.Panel key={tab.value} value={tab.value} pt="xl">
                        {tab.value === 'settings' ? (
                            <Paper p="xl" shadow="md" radius="lg" style={{ background: backgroundColors.settings, border: '1px solid var(--mantine-color-gray-3)' }}>
                                <Title order={3} mb="md">Location Settings</Title>
                                <Text c="dimmed" mb="md">Manage primary, secondary, and custom weather locations.</Text>
                                <Button onClick={() => setModalOpened(true)} color="blue">
                                    Set Location (Primary / Custom)
                                </Button>
                                <Divider my="md" />
                                <Text size="sm" c="dimmed">
                                    More settings coming soon! This area will allow you to configure weather widget display, notification preferences, and more.
                                </Text>
                            </Paper>
                        ) : tab.loading || !tab.data ? (
                            <Paper p="xl" shadow="md" radius="lg" style={{ background: backgroundColors[tab.colorType], border: '1px solid var(--mantine-color-gray-3)', minHeight: '300px' }}>
                                <Center style={{ height: '100%' }}>
                                    {tab.loading ? (
                                        <Text>Loading weather data for {tab.label}...</Text>
                                    ) : tab.error ? (
                                        <Alert color="red" title="Error">{tab.error}</Alert>
                                    ) : (
                                        <Text c="dimmed">No weather data available for {tab.label}.</Text>
                                    )}
                                </Center>
                            </Paper>
                        ) : (
                            <WeatherLocationDisplay
                                weatherData={tab.data}
                                locationInfo={tab.locationInfo}
                                backgroundColor={backgroundColors[tab.colorType]}
                                effectiveRole={effectiveRole}
                                onOpenSettings={() => setActiveTab('settings')}
                            />
                        )}
                    </Tabs.Panel>
                ))}
            </Tabs>

            <SetLocationModal opened={modalOpened} onClose={() => setModalOpened(false)} effectiveRole={effectiveRole} />
        </Container>
    );
};

export default WeatherPage;