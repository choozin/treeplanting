'use client';

import { Center, Loader } from '@mantine/core';
import DayOffRidesPage from '../../components/dayOffRides/DayOffRidesPage';
import { useAuth } from '../../hooks/useAuth';

export default function DayOffRides() {
  const { campID, effectiveRole, loading } = useAuth();

  if (loading) {
    return (
      <Center style={{ height: '80vh' }}>
        <Loader />
      </Center>
    );
  }

  return <DayOffRidesPage campID={campID} effectiveRole={effectiveRole} />;
}
