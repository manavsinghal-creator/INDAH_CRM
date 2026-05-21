
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
import { getContacts, getChannelPartners } from '@/app/actions';
import { Label } from './ui/label';
import { Skeleton } from './ui/skeleton';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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

  const handleSend = () => {
    if (listings.length === 0) return;

    let recipientName = 'Valued Client';

    if (selectedRecipientId) {
        const selected = allRecipients.find(r => r.id === selectedRecipientId);
        if (selected) {
            recipientName = selected.name;
        }
    }

    const listingsText = listings.map(l => 
        `*${l.listingName}* (ID: ${l.listingId})\n- Type: ${l.bhkConfiguration} ${l.propertyType}\n- Location: ${l.location}\n- Price: Rs. ${l.basePrice} Cr.\n- More Info: ${l.listingUrl || l.externalPublicLink || '(URL not available)'}`
    ).join('\n\n');

    const message = `Hello ${recipientName},\n\nAs per our discussion, here are some properties I thought you might be interested in. Please find the details below:\n\n${listingsText}\n\nLet me know if any of these catch your eye. I look forward to hearing from you.\n\nBest Regards,\nINDAH LIVING`;
    
    navigator.clipboard.writeText(message).catch(console.error);
    toast({ title: 'Copied', description: 'Listings copied to clipboard.' });
    onSendSuccess();
    onOpenChange(false);
  };

  const handleRecipientChange = (recipientId: string) => {
      setSelectedRecipientId(recipientId);
  };

  const isSendDisabled = !selectedRecipientId;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Listings for Recipient</DialogTitle>
          <DialogDescription>
            Select a recipient to generate text for the {listings.length} selected listings.
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
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSendDisabled}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
