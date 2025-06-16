'use client';

import MyAccount from '../../components/MyAccount/MyAccount';
import { useAuth } from '../../hooks/useAuth';
import { Center, Loader } from '@mantine/core';

export default function MyAccountPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><Loader /></Center>;
    }

    return <MyAccount />;
}