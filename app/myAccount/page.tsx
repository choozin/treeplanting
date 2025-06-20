'use client';

import MyAccount from '../../components/MyAccount/MyAccount';
import { useAuth } from '../../hooks/useAuth';
import { Center } from '@mantine/core';
import CustomLoader from '@/components/common/CustomLoader';

export default function MyAccountPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><CustomLoader /></Center>;
    }

    return <MyAccount />;
}