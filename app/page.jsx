'use client';
import { Center, Stack } from '@mantine/core';
import ContentBlurb from '@/components/common/ContentBlurb';

export default function HomePage() {
  return (
    <Center style={{ height: 'calc(100vh - 60px)' }}>
      <Stack align="center" gap="xl">
        <ContentBlurb />
      </Stack>
    </Center>
  );
}