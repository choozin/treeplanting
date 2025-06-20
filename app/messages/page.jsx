'use client';

import MessagesPage from '../../components/messages/MessagesPage';
import { useAuth } from '../../hooks/useAuth';
import { Center } from '@mantine/core';
import CustomLoader from '@/components/common/CustomLoader';

export default function Messages() {
    const { user, effectiveRole, campID, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><CustomLoader /></Center>;
    }

    return <MessagesPage user={user} effectiveRole={effectiveRole} campID={campID} />;
}