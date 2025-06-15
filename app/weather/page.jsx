'use client';

import WeatherPage from '../../components/weather/WeatherPage';
import { useAuth } from '../../hooks/useAuth';
import { Center, Loader } from '@mantine/core';

export default function Weather() {
    const { effectiveRole, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><Loader /></Center>;
    }
    
    return <WeatherPage effectiveRole={effectiveRole} />;
}