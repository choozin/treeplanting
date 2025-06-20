'use client';

import { Title, Text, Paper, Container, Group } from '@mantine/core';
import { useAuth } from '../../hooks/useAuth';
import CustomLoader from '@/components/common/CustomLoader';

export default function DashboardPage() {
  const { userData } = useAuth();

  return (
    <Container size="md" mt="lg">
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Title order={2} ta="center">
          Welcome to your Dashboard
        </Title>
        <Text c="dimmed" ta="center" mt="md">
          Hello, {userData?.profile?.nickname || userData?.name || 'User'}!
        </Text>
        <Text ta="center" mt="xl">
          This is the central hub for your camp activities. More widgets and features will be added
          here soon.
        </Text>
      </Paper>

      {/* Loader Preview Section */}
      <Paper withBorder shadow="md" p="xl" radius="md" mt="xl">
        <Title order={4} ta="center" mb="md">
          Custom Loader Preview
        </Title>
        <Group justify="center">
          <CustomLoader />
        </Group>
      </Paper>
    </Container>
  );
}