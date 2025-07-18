'use client';

import React, { useEffect, useState } from 'react';
import { Stack, Text, Title } from '@mantine/core';
import blurbs from '@/lib/blurbs.json';

interface Blurb {
  type: 'dadJoke' | 'pun' | 'wordplay' | 'haiku';
  content: {
    question?: string;
    answer?: string;
    text?: string;
    line1?: string;
    line2?: string;
    line3?: string;
  };
  specialCondition: string | null;
}

const ContentBlurb = () => {
  const [blurb, setBlurb] = useState<Blurb | null>(null);

  useEffect(() => {
    const keys = Object.keys(blurbs);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    setBlurb((blurbs as Record<string, Blurb>)[randomKey]);
  }, []);

  if (!blurb) {
    return null;
  }

  switch (blurb.type) {
    case 'dadJoke':
      return (
        <Stack align="center">
          <Title order={1} ta="center">
            {blurb.content.question}
          </Title>
          <Text size="xl" ta="center">
            {blurb.content.answer}
          </Text>
        </Stack>
      );
    case 'haiku':
      return (
        <Stack align="center" gap="xs">
          <Text size="lg" ta="center" ff="monospace">
            {blurb.content.line1}
          </Text>
          <Text size="lg" ta="center" ff="monospace">
            {blurb.content.line2}
          </Text>
          <Text size="lg" ta="center" ff="monospace">
            {blurb.content.line3}
          </Text>
        </Stack>
      );
    case 'pun':
    case 'wordplay':
    default:
      return (
        <Title order={2} ta="center" fw={500}>
          {blurb.content.text}
        </Title>
      );
  }
};

export default ContentBlurb;
