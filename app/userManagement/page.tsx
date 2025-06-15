'use client';

import UserManagement from '../../components/management/UserManagement';
import { useAuth } from '../../hooks/useAuth';
import { Center, Loader } from '@mantine/core';

export default function UserManagementPage() {
    const { user, campID, effectiveRole, loading } = useAuth();

    if (loading || !user) {
        return <Center style={{ height: '80vh' }}><Loader /></Center>;
    }

    return <UserManagement currentUser={user} campID={campID} effectiveRole={effectiveRole} />;
}