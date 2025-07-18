'use client';

import { Center } from '@mantine/core';
import CustomLoader from '@/components/common/CustomLoader';
import SettingsPage from '../../components/settings/SettingsPage';
import { useAuth } from '../../hooks/useAuth';

export default function AccountSettingsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center style={{ height: '80vh' }}>
        <CustomLoader />
      </Center>
    );
  }

  return <SettingsPage />;
}
