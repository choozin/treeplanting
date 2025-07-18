'use client';

import { Center } from '@mantine/core';
import CustomLoader from '@/components/common/CustomLoader';
import MyProfile from '../../components/MyAccount/MyProfile';
import { useAuth } from '../../hooks/useAuth';

export default function MyAccountPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center style={{ height: '80vh' }}>
        <CustomLoader />
      </Center>
    );
  }

  return <MyProfile />;
}
