import '@mantine/core/styles.css';

import React from 'react';
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { theme } from '../theme';
import WeatherProvider from '../context/WeatherProvider';
import AuthProvider from '../context/AuthProvider';
import Nav from '../components/navbar/Nav';

export const metadata = {
  title: 'Plantiful',
  description: 'A planning and logistics app for tree planting camps.',
};

export default function RootLayout({ children }: { children: any }) {
  const mainStyle: React.CSSProperties = {
    paddingTop: 'var(--navbar-height)',
  };

  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <ModalsProvider>
            <Notifications />
            <WeatherProvider>
              <AuthProvider>
                <Nav />
                <main style={mainStyle}>{children}</main>
              </AuthProvider>
            </WeatherProvider>
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}