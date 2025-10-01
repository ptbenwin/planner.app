import '../styles/globals.css';
import DebugConsole from '../components/DebugConsole';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = { 
  title: 'Benwin Planner'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><link rel="manifest" href="/manifest.json" /></head>
      <body>
        {children}
        <DebugConsole />
      </body>
    </html>
  );
}
