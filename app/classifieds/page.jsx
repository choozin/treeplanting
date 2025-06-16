'use client';

import ClassifiedsPage from '../../components/classifieds/ClassifiedsPage';
import { useAuth } from '../../hooks/useAuth';
import { Center, Loader } from '@mantine/core';

export default function Classifieds() {
    const { user, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><Loader /></Center>;
    }
    
    return <ClassifiedsPage />;
}