'use client';
import { Title, Text, Center, Stack } from '@mantine/core';

export default function HomePage() {
  return (
    <Center style={{ height: 'calc(100vh - 60px)' }}>
      <Stack align="center">
        <Title order={1} ta="center">
          Why did the tree get stumped?
        </Title>
        <Text size="xl" ta="center">
          Because it couldn&apos;t get to the root of the problem!
        </Text>
        <Text c="dimmed" ta="center" mt="xl">
          Click on the menu button to access app features.
        </Text>
      </Stack>
    </Center>
  );
}