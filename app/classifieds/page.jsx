'use client';

import ClassifiedsPage from '../../components/classifieds/ClassifiedsPage';
import { useAuth } from '../../hooks/useAuth';
import { Center } from '@mantine/core';
import CustomLoader from '@/components/common/CustomLoader';

export default function Classifieds() {
    const { user, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><CustomLoader /></Center>;
    }

    return <ClassifiedsPage />;
}