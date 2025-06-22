'use client';

import { createTheme } from '@mantine/core';

export const theme = createTheme({
  /* Put your mantine theme override here */
  // Apply Nunito font to all headings
  headings: {
    fontFamily: 'var(--font-nunito)',
  },
});
