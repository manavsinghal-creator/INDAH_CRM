
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
import { Button } from '@/components/ui/button';
import type { Listing } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getListingById } from '@/app/actions';
// import { findContactMatches } ... moved to fetch
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { type ContactMatcherOutput } from '@/lib/types';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Mail, Users, Check, AlertTriangle, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { WhatsAppDraftDialog } from './whatsapp-draft-dialog';
import { MatchSourceBadge } from './match-source-badge';


interface ContactMatchDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  listingId: string;
}

export function ContactMatchDialog({ isOpen, onOpenChange, listingId }: ContactMatchDialogProps) {
  const [listing, setListing] = React.useState<Listing | null>(null);
  const [isMatching, startTransition] = React.useTransition();
  const [matchData, setMatchData] = React.useState<ContactMatcherOutput | null>(null);
  const [draftRecipient, setDraftRecipient] = React.useState<ContactMatcherOutput['matchedContacts'][number] | null>(null);
  const { toast } = useToast();

  const handleMatch = React.useCallback(async (id: string) => {
    startTransition(async () => {
      setMatchData(null);
      setListing(null);

      const listingData = await getListingById(id);
      
      if (!listingData) {
         toast({ title: 'Error', description: 'Listing not found.', variant: 'destructive' });
         return;
      }
      setListing(listingData);

      const response = await fetch('/api/ai/contact-matches', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ listing: listingData })
      });
      const result = await response.json();
      if (result.success && result.data) {
        setMatchData(result.data);
      } else {
        toast({
          title: 'Matching Failed',
          description: result.error || 'Could not get contact matches from AI.',
          variant: 'destructive',
        });
      }
    });
  }, [toast]);

  React.useEffect(() => {
    if (isOpen && listingId) {
      handleMatch(listingId);
    } else {
        setMatchData(null);
        setListing(null);
    }
  }, [isOpen, listingId, handleMatch]);

  const matchCount = matchData?.matchedContacts?.length ?? 0;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Contact Matcher</DialogTitle>
          {listing ? (
             <DialogDescription>
                Finding the best buyers for {listing.listingName}.
                {matchData && (
                    <span className="flex items-center gap-2 mt-2">
                        <Users className="h-4 w-4" />
                        {matchCount} {matchCount === 1 ? 'match found' : 'matches found'}.
                        <MatchSourceBadge metadata={matchData.matchMetadata} />
                    </span>
                )}
             </DialogDescription>
          ) : (
             <DialogDescription>
                Loading listing details and finding matches...
             </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4">
            <ScrollArea className="h-96 pr-4">
                <div className="space-y-4">
                    {isMatching && !matchData && (
                        Array.from({length: 3}).map((_, i) => (
                            <Card key={i}><CardHeader className='flex-row gap-4 items-center space-y-0'><Skeleton className='h-10 w-10 rounded-full'/><div className='space-y-2'><Skeleton className='h-4 w-32'/><Skeleton className='h-3 w-48'/></div></CardHeader></Card>
                        ))
                    )}
                    {matchData && matchData.matchedContacts.length > 0 ? (
                        matchData.matchedContacts.map((contact) => {
                            const initials = contact.name.split(' ').map((n: string) => n[0]).join('');

                            return (
                                <Card key={contact.id} className="overflow-hidden border border-slate-100 hover:border-slate-200 transition-colors">
                                    <CardHeader className="pb-2">
                                        <div className='flex flex-col gap-3 w-full sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
                                            <div className='flex min-w-0 items-center gap-4'>
                                                <Avatar>
                                                    <AvatarFallback>{initials}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <CardTitle className="text-lg">{contact.name}</CardTitle>
                                                        {contact.matchScore != null && (
                                                            <Badge className={`text-xs font-semibold px-2 py-0.5 select-none ${
                                                                contact.matchScore >= 80 
                                                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' 
                                                                    : contact.matchScore >= 60 
                                                                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' 
                                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-100'
                                                            }`}>
                                                                {contact.matchScore}% Fit
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 sm:flex-none"
                                                  disabled={!contact.phone}
                                                  title={contact.phone ? `Send ${listing?.listingName || 'property'} to ${contact.name}` : 'Add a phone number to send this property'}
                                                  onClick={() => setDraftRecipient(contact)}
                                                >
                                                  <MessageCircle className="mr-2 h-4 w-4" />
                                                  Send Property
                                                </Button>
                                                {contact.email && (
                                                    <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0">
                                                        <Link href={`mailto:${contact.email}`} aria-label={`Email ${contact.name}`}><Mail className="h-4 w-4"/></Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-3 pb-4">
                                        <p className="text-muted-foreground leading-relaxed">{contact.matchReason}</p>
                                        
                                        {((contact.keyFitFactors && contact.keyFitFactors.length > 0) || (contact.concernFactors && contact.concernFactors.length > 0)) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                                                {contact.keyFitFactors && contact.keyFitFactors.length > 0 && (
                                                    <div className="space-y-1">
                                                        <span className="font-semibold text-emerald-700 flex items-center gap-1 dark:text-emerald-400">
                                                            <Check className="h-3.5 w-3.5 shrink-0" />
                                                            Strengths
                                                        </span>
                                                        <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                                                            {contact.keyFitFactors.map((f: string, idx: number) => <li key={idx}>{f}</li>)}
                                                        </ul>
                                                    </div>
                                                )}
                                                {contact.concernFactors && contact.concernFactors.length > 0 && (
                                                    <div className="space-y-1">
                                                        <span className="font-semibold text-amber-700 flex items-center gap-1 dark:text-amber-400">
                                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                            Gaps
                                                        </span>
                                                        <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                                                            {contact.concernFactors.map((f: string, idx: number) => <li key={idx}>{f}</li>)}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })
                    ) : (!isMatching && (
                        <p className="text-center text-muted-foreground py-8">No potential matches found.</p>
                    ))}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {draftRecipient && listing && (
      <WhatsAppDraftDialog
        isOpen={!!draftRecipient}
        onOpenChange={(open) => {
          if (!open) setDraftRecipient(null);
        }}
        recipient={{
          id: draftRecipient.id,
          name: draftRecipient.name,
          phone: draftRecipient.phone || '',
          type: 'contact',
        }}
        listings={[{ ...listing, matchReason: draftRecipient.matchReason }]}
      />
    )}
    </>
  );
}
