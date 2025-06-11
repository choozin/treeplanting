import '@mantine/core/styles.css';

import React from 'react';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { theme } from '../theme';
import { WeatherProvider } from '../context/WeatherProvider';

export const metadata = {
  title: 'Tree Planting Camp App',
  description: 'An app to help with stuff in a tree planting camp.',
};

export default function RootLayout({ children }: { children: any }) {
  const mainStyle = {
    paddingTop: '60px', // The height of our fixed navbar
  };

  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body suppressHydrationWarning>
        <MantineProvider theme={theme}>
          <ModalsProvider>
            <Notifications />
            <WeatherProvider>
              {/* All children will now be rendered inside this main tag with top padding */}
              <main style={mainStyle}>{children}</main>
            </WeatherProvider>
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}