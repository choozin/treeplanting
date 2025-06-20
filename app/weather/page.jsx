'use client';

import WeatherPage from '../../components/weather/WeatherPage';
import { useAuth } from '../../hooks/useAuth';
import { Center } from '@mantine/core';
import CustomLoader from '@/components/common/CustomLoader';

export default function Weather() {
    const { effectiveRole, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><CustomLoader /></Center>;
    }

    return <WeatherPage effectiveRole={effectiveRole} />;
}