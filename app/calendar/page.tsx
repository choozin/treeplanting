'use client';

import CalendarViews from '../../components/calendar/CalendarViews';
import { useAuth } from '../../hooks/useAuth';
import { Center } from '@mantine/core';
import CustomLoader from '@/components/common/CustomLoader';

export default function CalendarPage() {
    const { user, campID, loading, effectiveRole } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><CustomLoader /></Center>;
    }

    return <CalendarViews user={user} campID={campID} effectiveRole={effectiveRole} />;
}