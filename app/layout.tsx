import '@mantine/core/styles.css';
import './globals.css'; // Ensure globals.css is imported

import React from 'react';
import { Nunito } from 'next/font/google';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import FeedbackModalWrapper from '../components/feedback/FeedbackModalWrapper';
import Nav from '../components/navbar/Nav';
import AuthProvider from '../context/AuthProvider';
import WeatherProvider from '../context/WeatherProvider';
import { theme } from '../theme';

const nunito = Nunito({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito',
});

export const metadata = {
  title: 'plantcamp',
  description: 'A planning and logistics app for tree planting camps.',
};

import { StatusBar } from '@capacitor/status-bar';

// ... (rest of your imports)

export default function RootLayout({ children }: { children: any }) {
  // Set the status bar to not overlay the webview
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor) {
      StatusBar.setOverlaysWebView({ overlay: false });
    }
  }, []);

  return (
    <html lang="en" className={nunito.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <ModalsProvider>
            <Notifications position="top-right" />
            <WeatherProvider>
              <AuthProvider>
                <Nav />
                <main className="mainContent">{children}</main>
                <FeedbackModalWrapper />
              </AuthProvider>
            </WeatherProvider>
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
