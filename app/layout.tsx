import '@mantine/core/styles.css';

import React from 'react';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { theme } from '../theme';
import { WeatherProvider } from '../context/WeatherProvider';

export const metadata = {
  title: 'Tree Planting Camp App',
  description: 'An app to help with stuff in a tree planting camp.',
};

export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body suppressHydrationWarning={true}>
        <MantineProvider theme={theme}>
          <WeatherProvider>
            {children}
          </WeatherProvider>
        </MantineProvider>
      </body>
    </html>
  );
}