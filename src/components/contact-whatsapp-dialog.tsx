'use client';

import * as React from 'react';
import { MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Contact, Listing } from '@/lib/types';
import { WhatsAppDraftDialog } from '@/components/whatsapp-draft-dialog';
import { isListingAvailable } from '@/lib/crm-status';

interface ContactWhatsAppDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact: Contact;
  listings: Listing[];
}

export function ContactWhatsAppDialog({
  isOpen,
  onOpenChange,
  contact,
  listings,
}: ContactWhatsAppDialogProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isDraftOpen, setDraftOpen] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) setSelectedIds(contact.offeredListings || []);
  }, [contact.offeredListings, isOpen]);

  const availableListings = listings.filter(isListingAvailable);
  const selectedListings = availableListings.filter((listing) => selectedIds.includes(listing.id));

  const toggleListing = (id: string) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((listingId) => listingId !== id)
      : [...current, id]);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create WhatsApp Draft</DialogTitle>
            <DialogDescription>
              Choose the listings to personalize for {contact.name}.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[420px] pr-4">
            <div className="space-y-2 py-2">
              {availableListings.map((listing) => (
                <label
                  key={listing.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
                >
                  <Checkbox
                    className="mt-1"
                    checked={selectedIds.includes(listing.id)}
                    onCheckedChange={() => toggleListing(listing.id)}
                  />
                  <span className="min-w-0 text-sm">
                    <span className="block font-medium">{listing.listingName}</span>
                    <span className="block text-muted-foreground">
                      {listing.bhkConfiguration} {listing.propertyType} · {listing.location} · INR {listing.basePrice} Cr
                    </span>
                  </span>
                </label>
              ))}
              {availableListings.length === 0 && (
                <p className="py-12 text-center text-sm text-muted-foreground">No listings are available.</p>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={selectedListings.length === 0} onClick={() => setDraftOpen(true)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Preview Draft ({selectedListings.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isDraftOpen && (
        <WhatsAppDraftDialog
          isOpen={isDraftOpen}
          onOpenChange={setDraftOpen}
          recipient={{ id: contact.id, name: contact.name, phone: contact.phone, type: 'contact' }}
          listings={selectedListings}
        />
      )}
    </>
  );
}
