'use client';

import MessagesPage from '../../components/messages/MessagesPage';
import { useAuth } from '../../hooks/useAuth';
import { Center, Loader } from '@mantine/core';

export default function Messages() {
    const { user, effectiveRole, campID, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><Loader /></Center>;
    }

    return <MessagesPage user={user} effectiveRole={effectiveRole} campID={campID} />;
}