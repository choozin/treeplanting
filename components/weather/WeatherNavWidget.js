'use client';

import React from 'react';
import { useWeather } from '../../hooks/useWeather';
import { Box, Text, Group, ActionIcon, Paper, Stack } from '@mantine/core';
import { IconSun, IconCloud, IconCloudRain, IconSnowflake, IconRefresh, IconWind, IconDroplet } from '@tabler/icons-react';

const getWeatherIcon = (code) => {
    if (code >= 0 && code <= 1) return <IconSun size={24} />;
    if (code >= 2 && code <= 3) return <IconCloud size={24} />;
    if (code >= 51 && code <= 99) return <IconCloudRain size={24} />;
    if (code >= 71 && code <= 77) return <IconSnowflake size={24} />;
    return <IconCloud size={24} />;
};


const WeatherNavWidget = () => {
    const { primary, preferences, refresh } = useWeather();

    if (!preferences?.navWidget?.visible || !primary.data) {
        return null;
    }

    const renderForecast = (data) => {
        if (!data) return null;

        const displayMode = preferences?.navWidget?.displayMode || 'hourly';
        let forecastItems = [];
        const now = new Date();

        if (displayMode === 'hourly' && data.hourly) {
            const startIndex = data.hourly.time.findIndex(time => new Date(time) >= now);
            if (startIndex !== -1) {
                const forecastSlice = data.hourly.time.slice(startIndex, startIndex + 4);
                forecastItems = forecastSlice.map((time, index) => {
                    const dataIndex = startIndex + index;
                    return {
                        label: new Date(time).toLocaleTimeString([], { hour: 'numeric', hour12: true }).replace(' ', ''),
                        temp: `${Math.round(data.hourly.temperature_2m[dataIndex])}°`,
                        icon: getWeatherIcon(data.hourly.weather_code[dataIndex]),
                        precip: `${Math.round(data.hourly.precipitation_probability[dataIndex])}%`,
                        wind: `${Math.round(data.hourly.wind_speed_10m[dataIndex])}km/h`
                    }
                });
            }
        } else if (displayMode === 'daily' && data.daily) {
            forecastItems = data.daily.time.slice(0, 4).map((time, index) => {
                // The 'T00:00:00' is added to ensure the date is parsed in the local timezone, not as UTC.
                const date = new Date(`${time}T00:00:00`);
                return {
                    label: date.toLocaleDateString([], { weekday: 'short' }),
                    temp: `${Math.round(data.daily.temperature_2m_max[index])}°/${Math.round(data.daily.temperature_2m_min[index])}°`,
                    icon: getWeatherIcon(data.daily.weather_code[index]),
                    precip: `${data.daily.precipitation_sum[index]}mm`,
                    wind: `${Math.round(data.daily.wind_speed_10m_max[index])}km/h`
                };
            });
        } else if (displayMode === '6-hour' && data.sixHourForecast) {
            forecastItems = data.sixHourForecast.slice(0, 4).map(chunk => ({
                label: chunk.name.substring(0, 4),
                temp: `${chunk.temperature}°`,
                icon: getWeatherIcon(chunk.weatherCode),
                precip: `${Math.round(chunk.precipitation)}%`,
                wind: `${chunk.windSpeed}km/h`
            }));
        }

        return (
            <Group justify="center" gap="lg" mt="sm">
                {forecastItems.map((item, index) => (
                    <Stack key={index} align="center" gap="xs">
                        <Text size="sm" fw={700}>{item.label}</Text>
                        {item.icon}
                        <Text size="lg" fw={500}>{item.temp}</Text>
                        <Group gap={4}>
                            <IconDroplet size={14} color="var(--mantine-color-blue-5)" />
                            <Text size="xs" c="dimmed">{item.precip}</Text>
                        </Group>
                        <Group gap={4}>
                            <IconWind size={14} color="var(--mantine-color-gray-6)" />
                            <Text size="xs" c="dimmed">{item.wind}</Text>
                        </Group>
                    </Stack>
                ))}
            </Group>
        );
    }

    return (
        <Paper withBorder p="xs" radius="md" mt="md">
            <Group justify="center" align="center" gap="xs">
                <Text size="sm" fw={700}>{primary.location?.name || 'Primary'}</Text>
                <ActionIcon onClick={refresh} loading={primary.loading} variant="subtle" size="sm">
                    <IconRefresh size={16} />
                </ActionIcon>
            </Group>
            <Box>
                {renderForecast(primary.data)}
            </Box>
        </Paper>
    );
};

export default WeatherNavWidget;