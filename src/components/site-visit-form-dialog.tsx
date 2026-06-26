'use client';

import * as React from 'react';
import { CalendarClock, CheckCircle2 } from 'lucide-react';

import { addSiteVisit } from '@/app/actions';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Contact, Listing, SiteVisit } from '@/lib/types';

function toDateTimeLocal(value = new Date().toISOString()) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoFromLocal(value: string) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function listingLabel(listing: Listing) {
  return listing.listingId ? `${listing.listingId} - ${listing.listingName}` : listing.listingName;
}

type SiteVisitFormDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  listings: Listing[];
  initialContactId?: string;
  initialListingIds?: string[];
  onSaved?: (siteVisit: SiteVisit, contact?: Contact) => void;
};

export function SiteVisitFormDialog({
  isOpen,
  onOpenChange,
  contacts,
  listings,
  initialContactId,
  initialListingIds = [],
  onSaved,
}: SiteVisitFormDialogProps) {
  const eligibleContacts = React.useMemo(
    () => contacts.filter((contact) => contact.contactType !== 'Seller'),
    [contacts]
  );
  const [contactId, setContactId] = React.useState(initialContactId || eligibleContacts[0]?.id || '');
  const [listingIds, setListingIds] = React.useState<string[]>(initialListingIds);
  const [visitAt, setVisitAt] = React.useState(toDateTimeLocal());
  const [notes, setNotes] = React.useState('');
  const [updatePipeline, setUpdatePipeline] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const initialListingIdsKey = initialListingIds.join('|');
  const stableInitialListingIds = React.useMemo(
    () => initialListingIds,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialListingIdsKey]
  );

  React.useEffect(() => {
    if (!isOpen) return;
    setContactId(initialContactId || eligibleContacts[0]?.id || '');
    setListingIds(stableInitialListingIds);
    setVisitAt(toDateTimeLocal());
    setNotes('');
    setUpdatePipeline(true);
    setErrors({});
  }, [eligibleContacts, initialContactId, isOpen, stableInitialListingIds]);

  const selectedContact = contacts.find((contact) => contact.id === contactId);

  const toggleListing = (listingId: string) => {
    setListingIds((current) => current.includes(listingId)
      ? current.filter((id) => id !== listingId)
      : [...current, listingId]);
  };

  const handleSubmit = () => {
    startTransition(async () => {
      setErrors({});
      const result = await addSiteVisit({
        contactId,
        listingIds,
        visitAt: toIsoFromLocal(visitAt),
        notes,
        updatePipeline,
      });

      if (!result.success || !result.siteVisit) {
        setErrors(result.error || {});
        toast({
          title: 'Could not log site visit',
          description: result.error?._form?.[0] || 'Please check the selected contact.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Site visit logged',
        description: `${selectedContact?.name || 'Contact'} visit saved successfully.`,
      });
      onSaved?.(result.siteVisit, result.contact);
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Log Site Visit
          </DialogTitle>
          <DialogDescription>
            Record which buyer visited which listings. Time and agent are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleContacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} ({contact.serialNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.contactId?.[0] && <p className="text-xs text-destructive">{errors.contactId[0]}</p>}
            </div>

            <div className="space-y-2">
              <Label>Visit Time</Label>
              <Input
                type="datetime-local"
                value={visitAt}
                onChange={(event) => setVisitAt(event.target.value)}
              />
              {errors.visitAt?.[0] && <p className="text-xs text-destructive">{errors.visitAt[0]}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Listings Shown</Label>
              <span className="text-xs text-muted-foreground">{listingIds.length} selected</span>
            </div>
            <ScrollArea className="h-56 rounded-md border">
              <div className="divide-y">
                {listings.map((listing) => (
                  <label
                    key={listing.id}
                    className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={listingIds.includes(listing.id)}
                      onCheckedChange={() => toggleListing(listing.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{listingLabel(listing)}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {listing.location} · {listing.propertyType} · {listing.basePrice} Cr
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">Optional. Leave empty if the agent only wants to log the visit.</p>
          </div>

          <div className="space-y-2">
            <Label>Visit Notes</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Buyer feedback, concerns, documents requested, next discussion..."
            />
          </div>

          <label className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm">
            <Checkbox
              checked={updatePipeline}
              onCheckedChange={(checked) => setUpdatePipeline(Boolean(checked))}
              className="mt-0.5"
            />
            <span>
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Move contact to Site Visit pipeline
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Recommended when this visit is logged for an active buyer.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Visit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
