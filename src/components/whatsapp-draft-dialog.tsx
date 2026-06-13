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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  createWhatsAppUrl,
  generateWhatsAppDraft,
  normalizeWhatsAppPhone,
  type WhatsAppListing,
} from '@/lib/whatsapp';

type WhatsAppRecipient = {
  id: string;
  name: string;
  phone: string;
  type?: 'contact' | 'channelPartner';
};

interface WhatsAppDraftDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  recipient: WhatsAppRecipient;
  listings: WhatsAppListing[];
  onOpened?: () => void;
}

export function WhatsAppDraftDialog({
  isOpen,
  onOpenChange,
  recipient,
  listings,
  onOpened,
}: WhatsAppDraftDialogProps) {
  const [message, setMessage] = React.useState('');
  const { toast } = useToast();
  const normalizedPhone = normalizeWhatsAppPhone(recipient.phone);

  React.useEffect(() => {
    if (isOpen) setMessage(generateWhatsAppDraft(recipient.name, listings));
  }, [isOpen, listings, recipient.name]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    toast({ title: 'Draft copied', description: 'The WhatsApp message is ready to paste.' });
  };

  const handleOpenWhatsApp = () => {
    const url = createWhatsAppUrl(recipient.phone, message);
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
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientType: recipient.type || 'contact',
      phone: normalizedPhone || recipient.phone,
      listingIds: listings.map((listing) => listing.id),
      listingNames: listings.map((listing) => `${listing.listingId || 'Not assigned'} - ${listing.listingName}`),
    }).then((result) => {
      if (!result.success) {
        toast({
          title: 'WhatsApp opened',
          description: 'The draft opened, but its Activity Log entry could not be recorded.',
        });
      }
    }).catch(() => {
      toast({
        title: 'WhatsApp opened',
        description: 'The draft opened, but its Activity Log entry could not be recorded.',
      });
    });
    onOpened?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            WhatsApp Draft
          </DialogTitle>
          <DialogDescription>
            Review and edit this message for {recipient.name}. Opening WhatsApp records the draft in the Activity Log.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium">{recipient.name}</span>
              <span className="text-muted-foreground"> · {recipient.phone}</span>
              <p className="mt-1 text-xs text-muted-foreground">
                {listings.length} {listings.length === 1 ? 'listing' : 'listings'} included
              </p>
              {!normalizedPhone && (
                <p className="mt-1 text-xs font-medium text-destructive">
                  This recipient needs a valid WhatsApp phone number.
                </p>
              )}
            </div>
            <Textarea
              aria-label="WhatsApp message"
              className="min-h-[360px] resize-y leading-relaxed"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
        </ScrollArea>

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
