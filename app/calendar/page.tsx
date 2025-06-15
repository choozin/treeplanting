'use client';

import CalendarViews from '../../components/calendar/CalendarViews';
import { useAuth } from '../../hooks/useAuth';
import { Center, Loader } from '@mantine/core';

export default function CalendarPage() {
    const { user, campID, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><Loader /></Center>;
    }

    return <CalendarViews user={user} campID={campID} />;
}