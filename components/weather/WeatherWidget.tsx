'use client';

import React, { useState } from 'react';
import {
  IconCalendar,
  IconClock,
  IconCloud,
  IconCloudRain,
  IconCurrentLocation,
  IconMapPin,
  IconRefresh,
  IconSnowflake,
  IconSun,
} from '@tabler/icons-react';
import {
  ActionIcon,
  Box,
  Center,
  Flex,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useWeather } from '../../hooks/useWeather';

const getWeatherIcon = (code: number, size: number = 24) => {
  if (code >= 0 && code <= 1) {
    return <IconSun size={size} />;
  }
  if (code >= 2 && code <= 3) {
    return <IconCloud size={size} />;
  }
  if (code >= 51 && code <= 99) {
    return <IconCloudRain size={size} />;
  }
  if (code >= 71 && code <= 77) {
    return <IconSnowflake size={size} />;
  }
  return <IconCloud size={size} />;
};

const WeatherWidget = () => {
  const { primary, refresh } = useWeather();
  const [view, setView] = useState<'current' | 'hourly' | 'daily'>('current');

  const renderCurrentView = () => {
    const { current, daily } = primary.data!;
    const currentWeatherIcon = getWeatherIcon(current.weather_code, 48);

    return (
      <Stack>
        <Group>
          {currentWeatherIcon}
          <Stack gap={0}>
            <Text size="3rem" fw={700} lh={1}>
              {Math.round(current.temperature_2m)}°C
            </Text>
            <Text c="dimmed">Feels like {Math.round(current.apparent_temperature)}°</Text>
          </Stack>
        </Group>
        <Group justify="space-between" mt="md">
          <Stack align="center" gap="xs">
            <Text size="sm" c="dimmed">
              High
            </Text>
            <Text fw={500}>{Math.round(daily.temperature_2m_max[0])}°</Text>
          </Stack>
          <Stack align="center" gap="xs">
            <Text size="sm" c="dimmed">
              Low
            </Text>
            <Text fw={500}>{Math.round(daily.temperature_2m_min[0])}°</Text>
          </Stack>
          <Stack align="center" gap="xs">
            <Text size="sm" c="dimmed">
              Wind
            </Text>
            <Text fw={500}>{Math.round(current.wind_speed_10m)} km/h</Text>
          </Stack>
          <Stack align="center" gap="xs">
            <Text size="sm" c="dimmed">
              Humidity
            </Text>
            <Text fw={500}>{current.relative_humidity_2m}%</Text>
          </Stack>
        </Group>
      </Stack>
    );
  };

  const renderHourlyView = () => {
    const { hourly } = primary.data!;
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const startIndex =
      hourly.time.findIndex((timeStr) => new Date(timeStr).getTime() >= now.getTime()) || 0;
    const next12Hours = hourly.time.slice(startIndex, startIndex + 12);

    return (
      <ScrollArea type="always" scrollbarSize={8} offsetScrollbars>
        <Flex
          direction="row"
          gap="md"
          py="xs"
          style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '15px' }}
        >
          {next12Hours.map((timeStr, index) => {
            const hourlyIndex = startIndex + index;
            const hour = new Date(timeStr);
            const hourlyWeatherIcon = getWeatherIcon(hourly.weather_code[hourlyIndex]);
            return (
              <Paper
                key={timeStr}
                p="sm"
                radius="md"
                withBorder
                style={{ minWidth: '100px', textAlign: 'center' }}
              >
                <Text size="sm" fw={700} mb="xs">
                  {hour.toLocaleTimeString([], { hour: 'numeric', hour12: true })}
                </Text>
                {hourlyWeatherIcon}
                <Text size="lg" fw={500}>
                  {Math.round(hourly.temperature_2m[hourlyIndex])}°C
                </Text>
                <Text size="xs" c="blue">
                  {hourly.precipitation_probability[hourlyIndex]}%
                </Text>
              </Paper>
            );
          })}
        </Flex>
      </ScrollArea>
    );
  };

  const renderDailyView = () => {
    const { daily } = primary.data!;
    return (
      <ScrollArea type="always" scrollbarSize={8} offsetScrollbars>
        <Flex
          direction="row"
          gap="md"
          py="xs"
          style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '15px' }}
        >
          {daily.time.slice(0, 7).map((timeStr, index) => {
            const day = new Date(`${timeStr}T00:00:00`);
            const dailyWeatherIcon = getWeatherIcon(daily.weather_code[index]);
            return (
              <Paper
                key={timeStr}
                p="sm"
                radius="md"
                withBorder
                style={{ minWidth: '100px', textAlign: 'center' }}
              >
                <Text size="sm" fw={700} mb="xs">
                  {index === 0 ? 'Today' : day.toLocaleDateString([], { weekday: 'short' })}
                </Text>
                {dailyWeatherIcon}
                <Text size="md" fw={500}>
                  {Math.round(daily.temperature_2m_max[index])}°/
                  {Math.round(daily.temperature_2m_min[index])}°
                </Text>
                <Text size="xs" c="blue">
                  {daily.precipitation_probability_max[index]}%
                </Text>
              </Paper>
            );
          })}
        </Flex>
      </ScrollArea>
    );
  };

  const renderContent = () => {
    if (primary.loading && !primary.data) {
      return (
        <Stack mt="md">
          <Skeleton height={60} radius="sm" />
          <Skeleton height={20} width="70%" radius="sm" />
        </Stack>
      );
    }

    if (primary.error) {
      return (
        <Text c="red" mt="md">
          Could not load weather data.
        </Text>
      );
    }

    if (!primary.data) {
      return (
        <Text c="dimmed" mt="md">
          No weather data available for this location.
        </Text>
      );
    }

    if (view === 'current') {
      return renderCurrentView();
    }
    if (view === 'hourly') {
      return renderHourlyView();
    }
    if (view === 'daily') {
      return renderDailyView();
    }
    return null;
  };

  return (
    <Paper withBorder p="lg" radius="md" style={{ flex: '1 1 400px', minWidth: '300px' }}>
      <Group justify="space-between" align="center" mb="md">
        <Group>
          <IconMapPin size={24} />
          <Title order={3}>{primary.location?.name || 'Weather'}</Title>
        </Group>
        <ActionIcon onClick={refresh} loading={primary.loading} variant="subtle">
          <IconRefresh size={20} />
        </ActionIcon>
      </Group>

      <SegmentedControl
        fullWidth
        value={view}
        onChange={(value) => setView(value as any)}
        data={[
          {
            label: (
              <Center>
                <IconCurrentLocation size={16} />
                <Box ml="xs">Current</Box>
              </Center>
            ),
            value: 'current',
          },
          {
            label: (
              <Center>
                <IconClock size={16} />
                <Box ml="xs">Hourly</Box>
              </Center>
            ),
            value: 'hourly',
          },
          {
            label: (
              <Center>
                <IconCalendar size={16} />
                <Box ml="xs">Daily</Box>
              </Center>
            ),
            value: 'daily',
          },
        ]}
        mb="md"
      />

      <Box>{renderContent()}</Box>
    </Paper>
  );
};

export default WeatherWidget;
