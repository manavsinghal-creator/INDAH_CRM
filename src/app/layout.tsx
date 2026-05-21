
'use client';
import { useState } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

// Metadata can be defined as a static object when the page is a client component.
const metadata: Metadata = {
  title: 'INDAH LIVING CRM v8',
  description: 'Contact management for real estate agencies.',
};

function Footer() {
    return (
        <footer className="py-4 text-center text-sm text-muted-foreground border-t print-hidden">
          <div className="container mx-auto px-4 md:px-6">
            <div className="md:hidden flex flex-col items-center gap-2 mb-4">
              <div className="flex gap-4">
                  <Button variant="link" asChild><Link href="/">Contacts</Link></Button>
                  <Button variant="link" asChild><Link href="/listings">Listings</Link></Button>
              </div>
              <div className="flex gap-4">
                  <Button variant="link" asChild><Link href="/partners">Partners</Link></Button>
                  <Button variant="link" asChild><Link href="/metrics">Metrics</Link></Button>
              </div>
              <div className="flex gap-4">
                  <Button variant="link" asChild><Link href="/tasks">Tasks</Link></Button>
              </div>
            </div>
            <p>&copy; RealConnect by INDAH. All rights reserved. (v8)</p>
          </div>
        </footer>
    );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMenuOpen, setMenuOpen] = useState(false);

  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('min-h-screen bg-background font-body antialiased flex flex-col')}>
        <div className="flex-grow">
            <header className="sticky top-0 z-10 w-full border-b bg-card/95 backdrop-blur-sm print-hidden">
                <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-6">
                        <Link href="/" className="flex items-center gap-3">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-7 w-7 text-primary"
                                >
                                <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                                <path d="M12 3v7l4 2" />
                                <path d="m12 12-4 2" />
                            </svg>
                           <div className="flex flex-col">
                                <h1 className="text-lg font-bold tracking-tight">RealConnect</h1>
                                <p className="text-xs text-muted-foreground -mt-1">by INDAH</p>
                           </div>
                        </Link>
                        <nav className="hidden md:flex items-center gap-4">
                            <Button variant="link" asChild><Link href="/">Contacts</Link></Button>
                            <Button variant="link" asChild><Link href="/listings">Listings</Link></Button>
                            <Button variant="link" asChild><Link href="/partners">Channel Partners</Link></Button>
                            <Button variant="link" asChild><Link href="/metrics">Metrics</Link></Button>
                            <Button variant="link" asChild><Link href="/tasks">Tasks</Link></Button>
                        </nav>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="md:hidden">
                          <Sheet open={isMenuOpen} onOpenChange={setMenuOpen}>
                              <SheetTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                      <Menu className="h-6 w-6" />
                                      <span className="sr-only">Open Menu</span>
                                  </Button>
                              </SheetTrigger>
                              <SheetContent side="right">
                                  <div className="flex flex-col gap-4 py-6">
                                      <Link href="/" className="flex items-center gap-3 mb-4" onClick={() => setMenuOpen(false)}>
                                         <div className="flex flex-col">
                                            <h1 className="text-lg font-bold tracking-tight">RealConnect</h1>
                                            <p className="text-xs text-muted-foreground -mt-1">by INDAH</p>
                                         </div>
                                      </Link>
                                      <Button variant="ghost" className="justify-start text-base" asChild><Link href="/" onClick={() => setMenuOpen(false)}>Contacts</Link></Button>
                                      <Button variant="ghost" className="justify-start text-base" asChild><Link href="/listings" onClick={() => setMenuOpen(false)}>Listings</Link></Button>
                                      <Button variant="ghost" className="justify-start text-base" asChild><Link href="/partners" onClick={() => setMenuOpen(false)}>Channel Partners</Link></Button>
                                      <Button variant="ghost" className="justify-start text-base" asChild><Link href="/metrics" onClick={() => setMenuOpen(false)}>Metrics</Link></Button>
                                      <Button variant="ghost" className="justify-start text-base" asChild><Link href="/tasks" onClick={() => setMenuOpen(false)}>Tasks</Link></Button>
                                  </div>
                              </SheetContent>
                          </Sheet>
                        </div>
                    </div>
                </div>
            </header>
            {children}
        </div>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
