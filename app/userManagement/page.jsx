'use client';

import UserManagement from '../../components/management/UserManagement';
import { useAuth } from '../../hooks/useAuth';
import { Center } from '@mantine/core';
import CustomLoader from '@/components/common/CustomLoader';

export default function UserManagementPage() {
    const { user, campID, effectiveRole, loading } = useAuth();

    if (loading || !user) {
        return <Center style={{ height: '80vh' }}><CustomLoader /></Center>;
    }

    return <UserManagement currentUser={user} campID={campID} effectiveRole={effectiveRole} />;
}
// comments to help it save