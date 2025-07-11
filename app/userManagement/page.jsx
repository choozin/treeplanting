'use client';

import UserManagement from '../../components/management/UserManagement';
import { useAuth } from '../../hooks/useAuth';
import { Center } from '@mantine/core';
import CustomLoader from '@/components/common/CustomLoader';

export default function UserManagementPage() {
    const { user, userData, campID, effectiveRole, loading } = useAuth();

    if (loading || !user || !userData) {
        return <Center style={{ height: '80vh' }}><CustomLoader /></Center>;
    }

    return <UserManagement currentUser={user} campID={campID} effectiveRole={effectiveRole} globalRole={userData.role} />;
}
// comments to help it save