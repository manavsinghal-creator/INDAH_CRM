'use client';

import * as React from 'react';
import { Copy, ExternalLink, Mail } from 'lucide-react';

import { recordEmailDraftOpened } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createPropertyEmailUrl, generatePropertyEmail } from '@/lib/email';
import type { WhatsAppListing } from '@/lib/whatsapp';

type EmailRecipient = {
  id: string;
  name: string;
  email: string;
  type?: 'contact' | 'channelPartner';
};

interface EmailDraftDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  recipient: EmailRecipient;
  listings: WhatsAppListing[];
  onOpened?: () => void;
}

export function EmailDraftDialog({
  isOpen,
  onOpenChange,
  recipient,
  listings,
  onOpened,
}: EmailDraftDialogProps) {
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const { toast } = useToast();

  React.useEffect(() => {
    if (!isOpen) return;
    const draft = generatePropertyEmail(recipient.name, listings);
    setSubject(draft.subject);
    setBody(draft.body);
  }, [isOpen, listings, recipient.name]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    toast({ title: 'Email draft copied', description: 'The email is ready to paste.' });
  };

  const handleOpenEmail = () => {
    const url = createPropertyEmailUrl(recipient.email, subject, body);
    if (!url) return;

    window.open(url, '_blank', 'noopener,noreferrer');
    void recordEmailDraftOpened({
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientType: recipient.type || 'contact',
      email: recipient.email,
      listingIds: listings.map((listing) => listing.id),
      listingNames: listings.map((listing) => `${listing.listingId || 'Not assigned'} - ${listing.listingName}`),
    });
    onOpened?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Draft
          </DialogTitle>
          <DialogDescription>
            Review this property email for {recipient.name}. Opening email records it in the Activity Log.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="property-email-subject">Subject</Label>
              <Input id="property-email-subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property-email-body">Message</Label>
              <Textarea id="property-email-body" className="min-h-[360px] resize-y leading-relaxed" value={body} onChange={(event) => setBody(event.target.value)} />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="outline" onClick={handleCopy} disabled={!subject || !body}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button type="button" onClick={handleOpenEmail} disabled={!recipient.email || !subject || !body}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
