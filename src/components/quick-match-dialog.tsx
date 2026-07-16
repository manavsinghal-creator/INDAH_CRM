
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getContacts, getChannelPartners, getListings, markContactPropertiesShared } from '@/app/actions';
// findQuickPropertyMatches moved to fetch
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Mail, MessageCircle, PlusCircle, Sparkles } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuickPropertyMatcherInputSchema, budgetOptions, bhkOptions, type QuickPropertyMatcherOutput, type Contact, type ChannelPartner, type ContactFormData, type Listing } from '@/lib/types';
import type { z } from 'zod';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { WhatsAppDraftDialog } from './whatsapp-draft-dialog';
import { MatchSourceBadge } from './match-source-badge';
import { ContactForm } from './contact-form';
import { EmailDraftDialog } from './email-draft-dialog';
import { formatListingPrice, getListingDisplayTitle } from '@/lib/listing-display';
import { normalizeWhatsAppPhone } from '@/lib/whatsapp';
import { ListingHeroImage } from './listing-hero-image';
import { ListingViewDialog } from './listing-view-dialog';

type MatchedListing = QuickPropertyMatcherOutput['matchedListings'][0];
type FormData = z.infer<typeof QuickPropertyMatcherInputSchema>;

export function QuickMatchDialog() {
  const [isOpen, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [matchData, setMatchData] = React.useState<QuickPropertyMatcherOutput | null>(null);
  const [selectedListings, setSelectedListings] = React.useState<MatchedListing[]>([]);
  const [view, setView] = React.useState<'form' | 'results'>('form');

  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [partners, setPartners] = React.useState<ChannelPartner[]>([]);
  const [allListings, setAllListings] = React.useState<Listing[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = React.useState<string | null>(null);
  const [isRecipientDataLoading, setRecipientDataLoading] = React.useState(false);
  const [isDraftOpen, setDraftOpen] = React.useState(false);
  const [isEmailOpen, setEmailOpen] = React.useState(false);
  const [isContactFormOpen, setContactFormOpen] = React.useState(false);
  const [updatePipeline, setUpdatePipeline] = React.useState(true);
  const [quickPhone, setQuickPhone] = React.useState('');
  const [viewingListing, setViewingListing] = React.useState<Listing | null>(null);
  
  const { toast } = useToast();
  
  const form = useForm<FormData>({
    resolver: zodResolver(QuickPropertyMatcherInputSchema),
    defaultValues: {
      budget: '',
      locationPreference: '',
      bhkConfiguration: '',
    }
  });

  React.useEffect(() => {
    if (isOpen) {
      form.reset();
      setMatchData(null);
      setSelectedListings([]);
      setView('form');
      setSelectedRecipientId(null);
      setQuickPhone('');
      setViewingListing(null);
      setRecipientDataLoading(true);
      Promise.all([getContacts(), getChannelPartners(), getListings()])
        .then(([contactsData, partnersData, listingsData]) => {
            setContacts(contactsData);
            setPartners(partnersData);
            setAllListings(listingsData);
        })
        .finally(() => setRecipientDataLoading(false));
    }
  }, [isOpen, form]);

  const onSubmit = (data: FormData) => {
    startTransition(async () => {
      const response = await fetch('/api/ai/quick-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success && result.data) {
        setMatchData(result.data);
        setSelectedListings(result.data.matchedListings);
        setView('results');
      } else {
        toast({ title: 'Matching Failed', description: result.error || 'Could not get property matches.', variant: 'destructive' });
      }
    });
  };

  const handleToggleListing = (listing: MatchedListing) => {
    setSelectedListings(prev => 
      prev.some(l => l.recordId === listing.recordId)
        ? prev.filter(l => l.recordId !== listing.recordId)
        : [...prev, listing]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && matchData) {
      setSelectedListings(matchData.matchedListings);
    } else {
      setSelectedListings([]);
    }
  };

  const allRecipients = [
    ...contacts.map(c => ({ ...c, type: 'Contact' as const })),
    ...partners.map(p => ({ ...p, type: 'Channel Partner' as const })),
  ];
  
  const selectedRecipient = allRecipients.find((recipient) => recipient.id === selectedRecipientId);
  const quickShareRecipient = normalizeWhatsAppPhone(quickPhone)
    ? { id: `quick-${normalizeWhatsAppPhone(quickPhone)}`, name: 'Quick WhatsApp share', messageName: 'there', phone: quickPhone, type: 'quickShare' as const }
    : null;
  const draftRecipient = selectedRecipient || quickShareRecipient;
  const selectedShareListings = React.useMemo(() => selectedListings.map((listing) => {
    const fullListing = allListings.find((item) => item.id === listing.recordId);
    return fullListing ? { ...fullListing, matchReason: listing.matchReason } : { ...listing, id: listing.recordId };
  }), [allListings, selectedListings]);
  const newContactInitialValues = React.useMemo<Partial<ContactFormData>>(() => {
    const criteria = form.getValues();
    return {
      contactType: 'Buyer',
      leadStage: 'New',
      budget: budgetOptions.includes(criteria.budget as typeof budgetOptions[number])
        ? criteria.budget as ContactFormData['budget']
        : '<1',
      locationPreference: criteria.locationPreference || '',
    };
  }, [form]);

  const handleShared = () => {
    if (!selectedRecipient || selectedRecipient.type !== 'Contact') return;
    void markContactPropertiesShared(
      selectedRecipient.id,
      selectedListings.map((listing) => listing.recordId),
      selectedListings.map((listing) => `${listing.listingId || 'Not assigned'} - ${listing.listingName}`),
      updatePipeline
    );
  };

  const handleContactSaved = (contact: Contact) => {
    setContacts((current) => [contact, ...current.filter((item) => item.id !== contact.id)]);
    setSelectedRecipientId(contact.id);
    setContactFormOpen(false);
    setDraftOpen(true);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-accent/10 text-accent-foreground border-accent/30 hover:bg-accent/20">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Quick Match
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        {view === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>AI Property Quick Match</DialogTitle>
              <DialogDescription>Find relevant listings instantly. Fields are optional.</DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Budget (in Crores)</Label>
                    <Controller name="budget" control={form.control} render={({ field }) => (
                       <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Any Budget" /></SelectTrigger>
                            <SelectContent>{budgetOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                        </Select>
                    )} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="locationPreference">Location Preference</Label>
                    <Input id="locationPreference" {...form.register('locationPreference')} placeholder="e.g. South Goa" />
                  </div>
                  <div className="space-y-2">
                     <Label>BHK Configuration</Label>
                     <Controller name="bhkConfiguration" control={form.control} render={({ field }) => (
                       <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="Any BHK" /></SelectTrigger>
                            <SelectContent>{bhkOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                        </Select>
                    )} />
                  </div>
               </div>
               <DialogFooter>
                 <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                 <Button type="submit" disabled={isPending}>{isPending ? 'Searching...' : 'Find Matches'}</Button>
               </DialogFooter>
            </form>
          </>
        )}
        {view === 'results' && (
           <>
            <DialogHeader>
                <DialogTitle>Matching Properties</DialogTitle>
                <DialogDescription>
                  <span className="flex flex-wrap items-center gap-2">
                    Found {matchData?.matchedListings.length ?? 0} matching listings.
                    <MatchSourceBadge metadata={matchData?.matchMetadata} />
                  </span>
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <ScrollArea className="h-64 pr-4">
                    <div className="space-y-4">
                        {matchData && matchData.matchedListings.length > 0 ? (
                           <>
                           <div className="flex items-center space-x-2">
                             <Checkbox id="select-all" checked={matchData.matchedListings.length > 0 && matchData.matchedListings.length === selectedListings.length} onCheckedChange={handleSelectAll} />
                             <Label htmlFor="select-all" className="font-medium">Select All ({selectedListings.length}/{matchData.matchedListings.length})</Label>
                             <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedListings([])}>Deselect All</Button>
                           </div>
                           {matchData.matchedListings.map(listing => (
                               <div key={listing.recordId} className="flex items-start space-x-4">
                                   {(() => {
                                     const fullListing = allListings.find((item) => item.id === listing.recordId);
                                     return (
                                   <>
                                   <Checkbox checked={selectedListings.some(l => l.recordId === listing.recordId)} onCheckedChange={() => handleToggleListing(listing)} className="mt-1" />
                                   <Card className="flex-1">
                                       <CardHeader className="p-4">
                                            <div className="flex gap-3">
                                              <ListingHeroImage src={listing.heroImageUrl} alt={`${getListingDisplayTitle(listing)} hero image`} />
                                              <div className="min-w-0">
                                                <CardTitle className="text-base">{getListingDisplayTitle(listing)}</CardTitle>
                                                <p className="flex flex-wrap items-center gap-1 text-xs font-mono text-muted-foreground">
                                                  Listing ID: {listing.listingId || 'Not assigned'}
                                                  {fullListing && <button type="button" className="font-sans text-primary underline underline-offset-2" onClick={() => setViewingListing(fullListing)}>View listing</button>}
                                                </p>
                                                <CardDescription>{listing.bhkConfiguration} {listing.propertyType} in {listing.location}</CardDescription>
                                                <p className="text-sm font-semibold pt-1">{formatListingPrice(listing)}</p>
                                                {listing.matchScore != null && (
                                                  <p className="text-xs text-muted-foreground">
                                                    {listing.matchScore}% match{listing.matchReason ? ` · ${listing.matchReason}` : ''}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                       </CardHeader>
                                   </Card>
                                   </>
                                     );
                                   })()}
                               </div>
                           ))}
                           </>
                        ) : (
                            <Alert><Sparkles className="h-4 w-4" /><AlertTitle>No Matches Found</AlertTitle><AlertDescription>Try broadening your search.</AlertDescription></Alert>
                        )}
                    </div>
                </ScrollArea>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                       <Label>Recipient</Label>
                       <Select onValueChange={setSelectedRecipientId} value={selectedRecipientId || ''}>
                            <SelectTrigger><SelectValue placeholder="Choose recipient..." /></SelectTrigger>
                            <SelectContent>
                                <SelectGroup><SelectLabel>Contacts</SelectLabel>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone})</SelectItem>)}</SelectGroup>
                                <SelectGroup><SelectLabel>Partners</SelectLabel>{partners.map(p => <SelectItem key={p.id} value={p.id}>{p.companyName ? `${p.name} (${p.companyName})` : p.name}</SelectItem>)}</SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setContactFormOpen(true)} disabled={selectedListings.length === 0}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add New Contact
                    </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quick-match-phone">Quick WhatsApp phone number</Label>
                  <Input id="quick-match-phone" value={quickPhone} onChange={(event) => setQuickPhone(event.target.value)} inputMode="tel" placeholder="e.g. 9876543210" />
                  <p className="text-xs text-muted-foreground">Use this to send selected listings without creating a contact.</p>
                </div>
                {selectedRecipient?.type === 'Contact' && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="quick-match-update-pipeline" checked={updatePipeline} onCheckedChange={(checked) => setUpdatePipeline(checked === true)} />
                    <Label htmlFor="quick-match-update-pipeline" className="text-sm font-normal">Update pipeline to Property Shared after opening a draft</Label>
                  </div>
                )}
            </div>
             <DialogFooter>
                <Button variant="ghost" onClick={() => setView('form')}>Back</Button>
                <Button variant="outline" onClick={() => setEmailOpen(true)} disabled={!selectedRecipient?.email || selectedListings.length === 0}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email ({selectedListings.length})
                </Button>
                <Button onClick={() => setDraftOpen(true)} disabled={!draftRecipient || selectedListings.length === 0}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp ({selectedListings.length})
                </Button>
             </DialogFooter>
           </>
        )}
      </DialogContent>
    </Dialog>
    {isDraftOpen && draftRecipient && (
      <WhatsAppDraftDialog
        isOpen={isDraftOpen}
        onOpenChange={setDraftOpen}
        recipient={{
          id: draftRecipient.id,
          name: draftRecipient.name,
          phone: draftRecipient.phone,
          type: draftRecipient.type === 'Contact' ? 'contact' : draftRecipient.type === 'Channel Partner' ? 'channelPartner' : 'quickShare',
          messageName: 'messageName' in draftRecipient ? draftRecipient.messageName : undefined,
        }}
        onOpened={handleShared}
        listings={selectedShareListings}
      />
    )}
    {isEmailOpen && selectedRecipient?.email && (
      <EmailDraftDialog
        isOpen={isEmailOpen}
        onOpenChange={setEmailOpen}
        onOpened={handleShared}
        recipient={{
          id: selectedRecipient.id,
          name: selectedRecipient.name,
          email: selectedRecipient.email,
          type: selectedRecipient.type === 'Contact' ? 'contact' : 'channelPartner',
        }}
        listings={selectedShareListings}
      />
    )}
    <ContactForm
      isOpen={isContactFormOpen}
      onOpenChange={setContactFormOpen}
      allContacts={contacts}
      allListings={allListings}
      initialValues={newContactInitialValues}
      onSaved={handleContactSaved}
      />
    {viewingListing && (
      <ListingViewDialog
        isOpen={Boolean(viewingListing)}
        onOpenChange={(open) => { if (!open) setViewingListing(null); }}
        listing={viewingListing}
        onDuplicate={() => {}}
      />
    )}
    </>
  );
}
