'use client';

import PollsPage from '../../components/polls/PollsPage';
import { useAuth } from '../../hooks/useAuth';
import { Center, Loader } from '@mantine/core';

export default function Polls() {
    const { user, campID, userData, effectiveRole, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><Loader /></Center>;
    }

    return <PollsPage user={user} campID={campID} userData={userData} effectiveRole={effectiveRole} />;
}

// to make sure git takes this