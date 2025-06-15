'use client';

import React from 'react';
import { useWeather } from '../../hooks/useWeather';
import { Box, Text, Group, Tooltip, ActionIcon, Paper } from '@mantine/core';
import { IconSun, IconCloud, IconCloudRain, IconSnowflake, IconRefresh } from '@tabler/icons-react';

const getWeatherIcon = (code) => {
    if (code >= 0 && code <= 1) return <IconSun size={20} />;
    if (code >= 2 && code <= 3) return <IconCloud size={20} />;
    if (code >= 51 && code <= 99) return <IconCloudRain size={20} />;
    if (code >= 71 && code <= 77) return <IconSnowflake size={20} />;
    return <IconCloud size={20} />;
};


const WeatherNavWidget = () => {
    const { primary, secondary, preferences, refresh, loading } = useWeather();

    if (!preferences?.navWidget?.visible || !primary.data) {
        return null;
    }

    const renderForecast = (data, locationName) => {
        if (!data) return null;

        const displayMode = preferences?.navWidget?.displayMode || 'hourly';

        let forecastItems = [];

        if (displayMode === 'hourly') {
            forecastItems = data.hourly.time.slice(1, 5).map((time, index) => ({
                label: new Date(time).toLocaleTimeString([], { hour: 'numeric', hour12: true }),
                temp: `${Math.round(data.hourly.temperature_2m[index + 1])}°`,
                icon: getWeatherIcon(data.hourly.weather_code[index + 1]),
            }));
        } else if (displayMode === 'daily') {
            forecastItems = data.daily.time.slice(1, 5).map((time, index) => ({
                label: new Date(time).toLocaleDateString([], { weekday: 'short' }),
                temp: `${Math.round(data.daily.temperature_2m_max[index + 1])}°/${Math.round(data.daily.temperature_2m_min[index + 1])}°`,
                icon: getWeatherIcon(data.daily.weather_code[index + 1]),
            }));
        } else if (displayMode === '6-hour' && data.sixHourForecast) {
            forecastItems = data.sixHourForecast.map(chunk => ({
                label: chunk.name,
                temp: `${chunk.temperature}°`,
                icon: getWeatherIcon(chunk.weatherCode)
            }));
        }

        return (
            <Box>
                <Text size="sm" fw={700}>{locationName}</Text>
                <Group>
                    {forecastItems.map((item, index) => (
                        <Tooltip key={index} label={`${item.label}: ${item.temp}`}>
                            <Group gap="xs">
                                {item.icon}
                                <Text size="xs">{item.temp}</Text>
                            </Group>
                        </Tooltip>
                    ))}
                </Group>
            </Box>
        )
    }

    return (
        <Paper withBorder p="xs" radius="md" mt="md">
            <Group justify="space-between">
                <Box>
                    {renderForecast(primary.data, primary.location?.name || 'Primary')}
                </Box>
                <ActionIcon onClick={refresh} loading={primary.loading || secondary.loading} variant="subtle">
                    <IconRefresh size={16} />
                </ActionIcon>
            </Group>
        </Paper>
    );
};

export default WeatherNavWidget;