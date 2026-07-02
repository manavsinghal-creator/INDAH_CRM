'use client';

import * as React from 'react';
import { Copy, ExternalLink, MessageCircle } from 'lucide-react';

import { recordWhatsAppDraftOpened } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@/lib/types';
import { createWhatsAppUrl, normalizeWhatsAppPhone } from '@/lib/whatsapp';
import { getContactLeadStage } from '@/lib/crm-status';

function generateReconnectionDraft(contact: Contact) {
  const firstName = contact.name.trim().split(/\s+/)[0] || 'there';
  const stage = getContactLeadStage(contact);
  const location = contact.locationPreference || contact.city;
  const budget = contact.contactType === 'Buyer' ? `${contact.budget} Cr budget` : '';
  const preference = [
    budget,
    location ? `${location}` : '',
    contact.propertyPreference?.length ? contact.propertyPreference.join(', ') : '',
  ].filter(Boolean).join(' / ');

  return [
    `Hi ${firstName},`,
    '',
    preference
      ? `I was going through my notes and remembered your requirement around ${preference}.`
      : 'I was going through my notes and wanted to reconnect with you.',
    stage === 'Site Visit'
      ? 'Since we had already discussed or visited a few options, I wanted to check if you are still actively looking.'
      : 'Wanted to check if you are still exploring options or if your requirement has changed.',
    '',
    'Please reply when convenient, and I can share only the most relevant options instead of sending too many properties.',
    '',
    'Regards,',
    'INDAH Sales Team',
  ].join('\n');
}

export function ContactReconnectionDialog({
  isOpen,
  onOpenChange,
  contact,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact: Contact;
}) {
  const [message, setMessage] = React.useState('');
  const { toast } = useToast();
  const normalizedPhone = normalizeWhatsAppPhone(contact.phone);

  React.useEffect(() => {
    if (isOpen) setMessage(generateReconnectionDraft(contact));
  }, [contact, isOpen]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    toast({ title: 'Draft copied', description: 'The reconnection message is ready to paste.' });
  };

  const handleOpenWhatsApp = () => {
    const url = createWhatsAppUrl(contact.phone, message);
    if (!url) {
      toast({
        title: 'Phone number needs attention',
        description: 'Add a valid WhatsApp number before opening this draft.',
        variant: 'destructive',
      });
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
    void recordWhatsAppDraftOpened({
      recipientId: contact.id,
      recipientName: contact.name,
      recipientType: 'contact',
      phone: normalizedPhone || contact.phone,
      listingIds: [],
      listingNames: [],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            Reconnection Draft
          </DialogTitle>
          <DialogDescription>
            Review and personalize this WhatsApp message for {contact.name}.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label="Reconnection WhatsApp message"
          className="min-h-[320px] resize-y leading-relaxed"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={handleCopy} disabled={!message}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button type="button" onClick={handleOpenWhatsApp} disabled={!message || !normalizedPhone}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
