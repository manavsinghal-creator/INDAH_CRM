'use client';

import * as React from 'react';
import { Mail, MessageCircle } from 'lucide-react';

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
import { EmailDraftDialog } from './email-draft-dialog';
import { Label } from './ui/label';
import { markContactPropertiesShared } from '@/app/actions';
import { formatListingPrice, getListingDisplayTitle } from '@/lib/listing-display';

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
  const [isEmailOpen, setEmailOpen] = React.useState(false);
  const [updatePipeline, setUpdatePipeline] = React.useState(true);

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
  const handleShared = () => {
    void markContactPropertiesShared(
      contact.id,
      selectedListings.map((listing) => listing.id),
      selectedListings.map((listing) => `${listing.listingId || 'Not assigned'} - ${listing.listingName}`),
      updatePipeline
    );
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
                    <span className="block font-medium">{getListingDisplayTitle(listing)}</span>
                    <span className="block text-muted-foreground">
                      {listing.bhkConfiguration} {listing.propertyType} · {listing.location} · {formatListingPrice(listing)}
                    </span>
                  </span>
                </label>
              ))}
              {availableListings.length === 0 && (
                <p className="py-12 text-center text-sm text-muted-foreground">No listings are available.</p>
              )}
            </div>
          </ScrollArea>
          <div className="flex items-center gap-2 border-t pt-3">
            <Checkbox id="contact-share-update-pipeline" checked={updatePipeline} onCheckedChange={(checked) => setUpdatePipeline(checked === true)} />
            <Label htmlFor="contact-share-update-pipeline" className="text-sm font-normal">Update pipeline to Property Shared after opening a draft</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" variant="outline" disabled={!contact.email || selectedListings.length === 0} onClick={() => setEmailOpen(true)}>
              <Mail className="mr-2 h-4 w-4" />
              Email ({selectedListings.length})
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
          onOpened={handleShared}
        />
      )}
      {isEmailOpen && contact.email && (
        <EmailDraftDialog
          isOpen={isEmailOpen}
          onOpenChange={setEmailOpen}
          recipient={{ id: contact.id, name: contact.name, email: contact.email, type: 'contact' }}
          listings={selectedListings}
          onOpened={handleShared}
        />
      )}
    </>
  );
}
