
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
import { getContacts, getChannelPartners } from '@/app/actions';
// findQuickPropertyMatches moved to fetch
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Search, Sparkles, Send } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuickPropertyMatcherInputSchema, budgetOptions, bhkOptions, type QuickPropertyMatcherOutput, type Contact, type ChannelPartner } from '@/lib/types';
import type { z } from 'zod';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';

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
  const [selectedRecipientId, setSelectedRecipientId] = React.useState<string | null>(null);
  const [newNumber, setNewNumber] = React.useState('');
  const [isRecipientDataLoading, setRecipientDataLoading] = React.useState(false);
  
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
      setNewNumber('');
      setRecipientDataLoading(true);
      Promise.all([getContacts(), getChannelPartners()])
        .then(([contactsData, partnersData]) => {
            setContacts(contactsData);
            setPartners(partnersData);
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
      prev.some(l => l.listingId === listing.listingId)
        ? prev.filter(l => l.listingId !== listing.listingId)
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
  
  const handleSend = () => {
    let recipientName = 'Valued Client';

    if (selectedRecipientId) {
        const selected = allRecipients.find(r => r.id === selectedRecipientId);
        if (selected) {
            recipientName = selected.name;
        }
    }

    const listingsText = selectedListings.map(l => 
        `*${l.listingName}* (ID: ${l.listingId})\n- Type: ${l.bhkConfiguration} ${l.propertyType}\n- Location: ${l.location}\n- Price: Rs. ${l.basePrice} Cr.\n- More Info: ${l.listingUrl || l.externalPublicLink || '(URL not available)'}`
    ).join('\n\n');

    const message = `Hello ${recipientName},\n\nAs per your request, here are some properties I found that match your criteria. Please find the details below:\n\n${listingsText}\n\nLet me know if any of these catch your eye. I look forward to hearing from you.\n\nBest Regards,\nINDAH LIVING`;
    navigator.clipboard.writeText(message).catch(console.error);
    setOpen(false);
  };

  return (
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
                <DialogDescription>Found {matchData?.matchedListings.length ?? 0} matching listings.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <ScrollArea className="h-64 pr-4">
                    <div className="space-y-4">
                        {matchData && matchData.matchedListings.length > 0 ? (
                           <>
                           <div className="flex items-center space-x-2">
                             <Checkbox id="select-all" checked={matchData.matchedListings.length > 0 && matchData.matchedListings.length === selectedListings.length} onCheckedChange={handleSelectAll} />
                             <Label htmlFor="select-all" className="font-medium">Select All ({selectedListings.length}/{matchData.matchedListings.length})</Label>
                           </div>
                           {matchData.matchedListings.map(listing => (
                               <div key={listing.listingId} className="flex items-start space-x-4">
                                   <Checkbox checked={selectedListings.some(l => l.listingId === listing.listingId)} onCheckedChange={() => handleToggleListing(listing)} className="mt-1" />
                                   <Card className="flex-1">
                                       <CardHeader className="p-4">
                                            <CardTitle className="text-base">{listing.listingName}</CardTitle>
                                            <CardDescription>{listing.bhkConfiguration} {listing.propertyType} in {listing.location}</CardDescription>
                                            <p className="text-sm font-semibold pt-1">Rs. {listing.basePrice} Cr.</p>
                                       </CardHeader>
                                   </Card>
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
                                <SelectGroup><SelectLabel>Partners</SelectLabel>{partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.companyName})</SelectItem>)}</SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
             <DialogFooter>
                <Button variant="ghost" onClick={() => setView('form')}>Back</Button>
                <Button onClick={handleSend} disabled={(!selectedRecipientId) || selectedListings.length === 0}><Send className="mr-2 h-4 w-4" /> Copy Details</Button>
             </DialogFooter>
           </>
        )}
      </DialogContent>
    </Dialog>
  );
}
