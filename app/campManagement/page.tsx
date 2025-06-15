'use client';

import CampManagement from '../../components/management/CampManagement';
import { useAuth } from '../../hooks/useAuth';
import { Center, Loader } from '@mantine/core';

export default function CampManagementPage() {
    const { campID, effectiveRole, loading } = useAuth();
    
    if (loading) {
        return <Center style={{ height: '80vh' }}><Loader /></Center>;
    }

    return <CampManagement campID={campID} effectiveRole={effectiveRole} />;
}