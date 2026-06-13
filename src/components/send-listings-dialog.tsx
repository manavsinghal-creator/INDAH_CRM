
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Listing, Contact, ChannelPartner } from '@/lib/types';
import { getContacts, getChannelPartners, markContactPropertiesShared } from '@/app/actions';
import { Label } from './ui/label';
import { Skeleton } from './ui/skeleton';
import { Mail, MessageCircle } from 'lucide-react';
import { WhatsAppDraftDialog } from './whatsapp-draft-dialog';
import { EmailDraftDialog } from './email-draft-dialog';
import { Checkbox } from './ui/checkbox';

type Recipient = (Contact | ChannelPartner) & { type: 'Contact' | 'Channel Partner' };

interface SendListingsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  listings: Listing[];
  onSendSuccess: () => void;
}

export function SendListingsDialog({
  isOpen,
  onOpenChange,
  listings,
  onSendSuccess
}: SendListingsDialogProps) {
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [partners, setPartners] = React.useState<ChannelPartner[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDraftOpen, setDraftOpen] = React.useState(false);
  const [isEmailOpen, setEmailOpen] = React.useState(false);
  const [updatePipeline, setUpdatePipeline] = React.useState(true);

  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([getContacts(), getChannelPartners()])
        .then(([contactsData, partnersData]) => {
            setContacts(contactsData);
            setPartners(partnersData);
        })
        .finally(() => setIsLoading(false));
    } else {
        // Reset state on close
        setSelectedRecipientId(null);
        setContacts([]);
        setPartners([]);
    }
  }, [isOpen]);
  
  const allRecipients = [
    ...contacts.map(c => ({ ...c, type: 'Contact' as const })),
    ...partners.map(p => ({ ...p, type: 'Channel Partner' as const })),
  ];

  const handleRecipientChange = (recipientId: string) => {
      setSelectedRecipientId(recipientId);
  };

  const isSendDisabled = !selectedRecipientId;
  const selectedRecipient = allRecipients.find((recipient) => recipient.id === selectedRecipientId);
  const handleShared = () => {
    if (!selectedRecipient || selectedRecipient.type !== 'Contact') return;
    void markContactPropertiesShared(
      selectedRecipient.id,
      listings.map((listing) => listing.id),
      listings.map((listing) => `${listing.listingId || 'Not assigned'} - ${listing.listingName}`),
      updatePipeline
    );
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create WhatsApp Draft</DialogTitle>
          <DialogDescription>
            Select a recipient for the {listings.length} selected listings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="contact-select">Select Existing Recipient</Label>
            {isLoading ? (
                <Skeleton className="h-10 w-full" />
            ) : (
                <Select
                    onValueChange={handleRecipientChange}
                    value={selectedRecipientId || ''}
                >
                    <SelectTrigger id="contact-select">
                        <SelectValue placeholder="Choose a contact or partner..." />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectGroup>
                            <SelectLabel>Contacts</SelectLabel>
                            {contacts.map(contact => (
                                <SelectItem key={contact.id} value={contact.id}>
                                    {contact.name} ({contact.phone})
                                </SelectItem>
                            ))}
                        </SelectGroup>
                        <SelectGroup>
                            <SelectLabel>Channel Partners</SelectLabel>
                             {partners.map(partner => (
                                <SelectItem key={partner.id} value={partner.id}>
                                    {partner.name} ({partner.companyName})
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            )}
          </div>
          {selectedRecipient?.type === 'Contact' && (
            <div className="flex items-center gap-2">
              <Checkbox id="listing-share-update-pipeline" checked={updatePipeline} onCheckedChange={(checked) => setUpdatePipeline(checked === true)} />
              <Label htmlFor="listing-share-update-pipeline" className="text-sm font-normal">Update pipeline to Property Shared after opening a draft</Label>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => setEmailOpen(true)} disabled={!selectedRecipient?.email}>
            <Mail className="mr-2 h-4 w-4" />
            Email Draft
          </Button>
          <Button onClick={() => setDraftOpen(true)} disabled={isSendDisabled}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Preview Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {isDraftOpen && selectedRecipient && (
      <WhatsAppDraftDialog
        isOpen={isDraftOpen}
        onOpenChange={setDraftOpen}
        onOpened={() => {
          handleShared();
          onSendSuccess();
          onOpenChange(false);
        }}
        recipient={{
          id: selectedRecipient.id,
          name: selectedRecipient.name,
          phone: selectedRecipient.phone,
          type: selectedRecipient.type === 'Contact' ? 'contact' : 'channelPartner',
        }}
        listings={listings}
      />
    )}
    {isEmailOpen && selectedRecipient?.email && (
      <EmailDraftDialog
        isOpen={isEmailOpen}
        onOpenChange={setEmailOpen}
        onOpened={() => {
          handleShared();
          onSendSuccess();
          onOpenChange(false);
        }}
        recipient={{
          id: selectedRecipient.id,
          name: selectedRecipient.name,
          email: selectedRecipient.email,
          type: selectedRecipient.type === 'Contact' ? 'contact' : 'channelPartner',
        }}
        listings={listings}
      />
    )}
    </>
  );
}
