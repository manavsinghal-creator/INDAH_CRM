'use client';

import * as React from 'react';
import {
  Check,
  Eye,
  Filter,
  MapPin,
  MessageCircle,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';

import { markContactPropertiesShared } from '@/app/actions';
import { RefreshButton } from '@/components/refresh-button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LeadStageBadge } from '@/components/lead-stage-badge';
import { ListingHeroImage } from '@/components/listing-hero-image';
import { ListingViewDialog } from '@/components/listing-view-dialog';
import { WhatsAppDraftDialog } from '@/components/whatsapp-draft-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { type BestBuyerMatch, type BestListingMatch, type BestMatchesData } from '@/lib/best-matches';
import { formatListingPrice, getListingDisplayTitle } from '@/lib/listing-display';
import type { Contact, Listing } from '@/lib/types';
import { cn } from '@/lib/utils';

type BestMatchesDashboardProps = {
  initialData: BestMatchesData;
};

function scoreLabel(score: number) {
  if (score >= 75) return 'Strong match';
  if (score >= 60) return 'Possible match';
  return 'Review match';
}

function interactionLabel(interaction: BestListingMatch['interaction']) {
  if (interaction === 'shared') return 'Already shared';
  if (interaction === 'visited') return 'Already visited';
  return 'New match';
}

function MatchBadge({ match }: { match: BestListingMatch }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge className={cn(
        'border-0',
        match.score >= 75 ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : match.score >= 60 ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100',
      )}>{match.score}% · {scoreLabel(match.score)}</Badge>
      {match.interaction !== 'new' && <Badge variant="outline" className="text-muted-foreground">{interactionLabel(match.interaction)}</Badge>}
    </div>
  );
}

function ListingMatchCard({
  match,
  selected,
  onSelect,
  onView,
}: {
  match: BestListingMatch;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
}) {
  const title = getListingDisplayTitle(match.listing);
  return (
    <div className={cn('rounded-md border p-3 transition-colors', selected && 'border-primary/50 bg-primary/[0.03]')}>
      <div className="flex items-start gap-3">
        <Checkbox
          className="mt-1 shrink-0"
          checked={selected}
          onCheckedChange={(checked) => onSelect(checked === true)}
          aria-label={`Select ${title}`}
        />
        <ListingHeroImage src={match.listing.heroImageUrl} alt={`${title} hero image`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>{match.listing.listingId || 'Listing ID not assigned'}</span>
                <button type="button" onClick={onView} className="font-medium text-primary underline underline-offset-2">View listing</button>
              </div>
            </div>
            <MatchBadge match={match} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{match.listing.location} · {match.listing.bhkConfiguration} · {formatListingPrice(match.listing)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{match.keyFitFactors.length ? match.keyFitFactors.map((factor) => <span key={factor} className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-xs text-muted-foreground"><Check className="h-3 w-3 text-emerald-600" />{factor}</span>) : <span className="text-xs text-muted-foreground">Review this match with the buyer&apos;s profile.</span>}</div>
        </div>
      </div>
    </div>
  );
}

export function BestMatchesDashboard({ initialData }: BestMatchesDashboardProps) {
  const [showHistory, setShowHistory] = React.useState(false);
  const [strongOnly, setStrongOnly] = React.useState(true);
  const [selectedByContact, setSelectedByContact] = React.useState<Record<string, string[]>>({});
  const [draftContact, setDraftContact] = React.useState<Contact | null>(null);
  const [viewingListing, setViewingListing] = React.useState<Listing | null>(null);
  const { toast } = useToast();

  const visibleBuyers = React.useMemo(() => initialData.buyers.map((buyer) => ({
    ...buyer,
    matches: buyer.matches.filter((match) => (
      (showHistory || match.interaction === 'new')
      && (!strongOnly || match.score >= 75)
    )),
  })).filter((buyer) => buyer.matches.length > 0), [initialData.buyers, showHistory, strongOnly]);

  const listingOpportunities = React.useMemo(() => {
    const map = new Map<string, { listing: Listing; buyers: Array<{ contact: Contact; match: BestListingMatch }> }>();
    visibleBuyers.forEach((buyer) => buyer.matches.forEach((match) => {
      const current = map.get(match.listing.id) || { listing: match.listing, buyers: [] };
      current.buyers.push({ contact: buyer.contact, match });
      map.set(match.listing.id, current);
    }));
    return [...map.values()]
      .map((item) => ({ ...item, buyers: item.buyers.sort((first, second) => second.match.score - first.match.score) }))
      .sort((first, second) => second.buyers[0].match.score - first.buyers[0].match.score);
  }, [visibleBuyers]);

  const setSelected = (contactId: string, listingId: string, checked: boolean) => {
    setSelectedByContact((current) => {
      const selected = current[contactId] || [];
      return {
        ...current,
        [contactId]: checked ? [...new Set([...selected, listingId])] : selected.filter((id) => id !== listingId),
      };
    });
  };

  const selectStrongNew = (buyer: BestBuyerMatch) => {
    setSelectedByContact((current) => ({
      ...current,
      [buyer.contact.id]: buyer.matches.filter((match) => match.interaction === 'new' && match.score >= 75).map((match) => match.listing.id),
    }));
  };

  const selectedMatches = draftContact
    ? (initialData.buyers.find((buyer) => buyer.contact.id === draftContact.id)?.matches || []).filter((match) => (selectedByContact[draftContact.id] || []).includes(match.listing.id))
    : [];

  const handleDraftOpened = () => {
    if (!draftContact || !selectedMatches.length) return;
    void markContactPropertiesShared(
      draftContact.id,
      selectedMatches.map((match) => match.listing.id),
      selectedMatches.map((match) => `${match.listing.listingId || 'Not assigned'} - ${getListingDisplayTitle(match.listing)}`),
      true,
    ).then((result) => {
      if (!result.success) toast({ title: 'Draft opened', description: 'The selected listings could not be saved to the contact.' });
    }).catch(() => toast({ title: 'Draft opened', description: 'The selected listings could not be saved to the contact.' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight"><Sparkles className="h-7 w-7 text-primary" />Best Matches</h1>
          <p className="mt-1 text-sm text-muted-foreground">A local, explainable shortlist of buyers and properties ready for a thoughtful follow-up.</p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Strong opportunities</p><p className="mt-1 text-3xl font-semibold">{initialData.strongOpportunityCount}</p><p className="mt-1 text-xs text-muted-foreground">New buyer-listing matches scoring 75% or higher.</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buyers ready to review</p><p className="mt-1 text-3xl font-semibold">{initialData.eligibleBuyerCount}</p><p className="mt-1 text-xs text-muted-foreground">Qualified buyers and active deal-stage leads.</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Available inventory</p><p className="mt-1 text-3xl font-semibold">{initialData.availableListingCount}</p><p className="mt-1 text-xs text-muted-foreground">Only currently shareable listings are considered.</p></CardContent></Card>
      </div>

      <Card className="border-primary/20 bg-muted/30"><CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">Match filters</p><p className="text-xs text-muted-foreground">Choose whether to focus only on fresh, strong opportunities.</p></div></div><div className="flex flex-wrap items-center gap-5"><div className="flex items-center gap-2"><Switch id="strong-only" checked={strongOnly} onCheckedChange={setStrongOnly} /><Label htmlFor="strong-only" className="text-sm">Strong matches only</Label></div><div className="flex items-center gap-2"><Switch id="show-history" checked={showHistory} onCheckedChange={setShowHistory} /><Label htmlFor="show-history" className="text-sm">Include shared and visited</Label></div></div></CardContent></Card>

      <Tabs defaultValue="buyers" className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 sm:w-[360px]"><TabsTrigger value="buyers">Buyer opportunities</TabsTrigger><TabsTrigger value="listings">Listing opportunities</TabsTrigger></TabsList>
        <TabsContent value="buyers" className="mt-0 space-y-4">
          <Accordion type="multiple" className="space-y-3">
            {visibleBuyers.map((buyer) => {
              const selectedIds = selectedByContact[buyer.contact.id] || [];
              const selectable = buyer.matches.filter((match) => match.interaction === 'new');
              const selectedCount = selectedIds.length;
              const topMatch = buyer.matches[0];
              return (
                <AccordionItem key={buyer.contact.id} value={buyer.contact.id} className="overflow-hidden rounded-md border bg-card shadow-sm">
                  <AccordionTrigger className="gap-3 bg-muted/25 px-4 py-4 text-left hover:no-underline">
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:pr-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-base font-semibold">{buyer.contact.name}</span>
                          <LeadStageBadge stage={buyer.contact.leadStage || 'New'} />
                        </div>
                        <p className="mt-1 truncate text-xs font-normal text-muted-foreground">
                          {buyer.contact.budget} Cr · {buyer.contact.locationPreference || 'Location not specified'} · {buyer.contact.propertyPreference?.join(', ') || 'Property type flexible'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Badge variant="outline">{buyer.matches.length} {buyer.matches.length === 1 ? 'match' : 'matches'}</Badge>
                        {topMatch && <MatchBadge match={topMatch} />}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 px-4 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                      <p className="text-xs text-muted-foreground">Review the properties, select the sensible options, then prepare one WhatsApp message.</p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => selectStrongNew(buyer)} disabled={!selectable.length}>Select strong</Button>
                        <Button type="button" size="sm" onClick={() => setDraftContact(buyer.contact)} disabled={!buyer.contact.phone || !selectedCount}><MessageCircle className="mr-2 h-4 w-4" />Send {selectedCount ? `(${selectedCount})` : ''}</Button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {buyer.matches.slice(0, 5).map((match) => <ListingMatchCard key={match.listing.id} match={match} selected={selectedIds.includes(match.listing.id)} onSelect={(checked) => setSelected(buyer.contact.id, match.listing.id, checked)} onView={() => setViewingListing(match.listing)} />)}
                    </div>
                    {buyer.matches.length > 5 && <p className="text-center text-xs text-muted-foreground">Showing the 5 best matches for this buyer.</p>}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
          {!visibleBuyers.length && <Card><CardContent className="py-16 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">No matches for these filters</p><p className="mt-1 text-sm text-muted-foreground">Try including possible matches or previously shared properties.</p></CardContent></Card>}
        </TabsContent>
        <TabsContent value="listings" className="mt-0 space-y-4">
          <Accordion type="multiple" className="space-y-3">
            {listingOpportunities.map((item) => (
              <AccordionItem key={item.listing.id} value={item.listing.id} className="overflow-hidden rounded-md border bg-card shadow-sm">
                <AccordionTrigger className="gap-3 px-4 py-3 text-left hover:no-underline">
                  <div className="flex min-w-0 flex-1 items-center gap-3 pr-3">
                    <ListingHeroImage src={item.listing.heroImageUrl} alt={`${getListingDisplayTitle(item.listing)} hero image`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{getListingDisplayTitle(item.listing)}</p>
                      <p className="mt-1 truncate text-xs font-normal text-muted-foreground">{item.listing.listingId || 'Listing ID not assigned'} · {item.listing.location} · {item.listing.bhkConfiguration} · {formatListingPrice(item.listing)}</p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                      <Badge variant="outline">{item.buyers.length} {item.buyers.length === 1 ? 'buyer' : 'buyers'}</Badge>
                      <MatchBadge match={item.buyers[0].match} />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-4 pt-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <p className="text-xs text-muted-foreground">Strongest eligible buyers for this listing.</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setViewingListing(item.listing)}><Eye className="mr-2 h-4 w-4" />View listing</Button>
                  </div>
                  {item.buyers.slice(0, 5).map(({ contact, match }) => <div key={contact.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{contact.name}</p><LeadStageBadge stage={contact.leadStage || 'New'} /></div><p className="mt-1 text-xs text-muted-foreground">{contact.budget} Cr · {contact.locationPreference || 'Location flexible'}</p></div><MatchBadge match={match} /></div>)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {!listingOpportunities.length && <Card><CardContent className="py-16 text-center"><MapPin className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">No listing opportunities for these filters</p></CardContent></Card>}
        </TabsContent>
      </Tabs>

      <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-4 py-3 text-xs text-muted-foreground"><Send className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Match scores come from local budget, location, property-type, and preference checks. The agent chooses what to send; opening a WhatsApp draft records the share and moves the buyer to Property Shared.</div>

      {draftContact && <WhatsAppDraftDialog isOpen={Boolean(draftContact)} onOpenChange={(open) => { if (!open) setDraftContact(null); }} onOpened={handleDraftOpened} recipient={{ id: draftContact.id, name: draftContact.name, phone: draftContact.phone, type: 'contact' }} listings={selectedMatches.map((match) => match.listing)} />}
      {viewingListing && <ListingViewDialog isOpen={Boolean(viewingListing)} onOpenChange={(open) => { if (!open) setViewingListing(null); }} listing={viewingListing} onDuplicate={() => {}} />}
    </div>
  );
}
