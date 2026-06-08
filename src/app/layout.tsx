
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/app-shell';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'INDAH LIVING CRM v8',
  description: 'Contact management for real estate agencies.',
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={cn('min-h-screen bg-background font-body antialiased flex flex-col', inter.variable)}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
