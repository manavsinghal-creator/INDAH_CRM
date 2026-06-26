'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/toaster';
import { UserMenu } from '@/components/user-menu';
import type { SessionUser } from '@/lib/auth-server';

const navItems = [
  { href: '/', label: 'Contacts' },
  { href: '/listings', label: 'Listings' },
  { href: '/partners', label: 'Channel Partners' },
  { href: '/metrics', label: 'Metrics' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/site-visits', label: 'Site Visits' },
  { href: '/activity', label: 'Activity Log' },
];

function Brand() {
  return (
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
  );
}

function Footer() {
  return (
    <footer className="py-4 text-center text-sm text-muted-foreground border-t print-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="md:hidden flex flex-col items-center gap-2 mb-4">
          <div className="flex flex-wrap justify-center gap-4">
            {navItems.map((item) => (
              <Button key={item.href} variant="link" asChild>
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
        </div>
        <p>&copy; RealConnect by INDAH. All rights reserved. (v9)</p>
      </div>
    </footer>
  );
}

export function AppShell({ children, user }: { children: React.ReactNode; user: SessionUser | null }) {
  const [isMenuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="flex-grow">
        <header className="sticky top-0 z-10 w-full border-b bg-card/95 backdrop-blur-sm print-hidden">
          <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-6">
              <Brand />
              {user && <nav className="hidden md:flex items-center gap-4">
                {navItems.map((item) => (
                  <Button key={item.href} variant="link" asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </Button>
                ))}
              </nav>}
            </div>
            {user && <div className="flex items-center gap-2">
            <div className="md:hidden">
              <Sheet open={isMenuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetTitle className="sr-only">Main navigation</SheetTitle>
                  <SheetDescription className="sr-only">
                    Navigate between CRM sections.
                  </SheetDescription>
                  <div className="flex flex-col gap-4 py-6">
                    <Link href="/" className="flex items-center gap-3 mb-4" onClick={() => setMenuOpen(false)}>
                      <div className="flex flex-col">
                        <h1 className="text-lg font-bold tracking-tight">RealConnect</h1>
                        <p className="text-xs text-muted-foreground -mt-1">by INDAH</p>
                      </div>
                    </Link>
                    {navItems.map((item) => (
                      <Button key={item.href} variant="ghost" className="justify-start text-base" asChild>
                        <Link href={item.href} onClick={() => setMenuOpen(false)}>
                          {item.label}
                        </Link>
                      </Button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <UserMenu user={user} />
            </div>}
          </div>
        </header>
        {children}
      </div>
      {user && <Footer />}
      <Toaster />
    </>
  );
}
