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
import { Textarea } from '@/components/ui/textarea';
import type { Contact, Listing, MatchMetadata } from '@/lib/types';
import type { PropertyMatcherOutput } from '@/ai/flows/property-matcher';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Copy, Check, MessageCircle } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WhatsAppDraftDialog } from './whatsapp-draft-dialog';
import { MatchSourceBadge } from './match-source-badge';

type SuggestedProperty = PropertyMatcherOutput['suggestedProperties'][number];

interface PropertyMatchDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact: Contact;
  allListings: Listing[];
}

export function PropertyMatchDialog({ isOpen, onOpenChange, contact, allListings }: PropertyMatchDialogProps) {
  const [isMatching, startTransition] = React.useTransition();
  const [recommendations, setRecommendations] = React.useState('');
  const [suggestedProperties, setSuggestedProperties] = React.useState<SuggestedProperty[]>([]);
  const [matchMetadata, setMatchMetadata] = React.useState<MatchMetadata | null>(null);
  const [draftListing, setDraftListing] = React.useState<(Listing & { matchReason?: string }) | null>(null);
  const { toast } = useToast();
  const findMatchedListing = (property: SuggestedProperty) => allListings.find((listing) =>
    listing.id === property.id
    || listing.listingId === property.id
    || listing.listingName.toLowerCase() === String(property.name || '').toLowerCase()
  );

  const handleMatch = React.useCallback(() => {
    if (!contact) return;
    startTransition(async () => {
      setRecommendations('');
      setSuggestedProperties([]);
      setMatchMetadata(null);
      try {
          const response = await fetch('/api/ai/property-matches', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contact })
          });
          const result = await response.json();
          if (result.success && result.data) {
            setRecommendations(result.data.recommendations);
            setSuggestedProperties(result.data.suggestedProperties || []);
            setMatchMetadata(result.data.matchMetadata);
          } else {
            toast({
              title: 'Matching Failed',
              description: result.error || 'Could not get property matches from AI.',
              variant: 'destructive',
            });
          }
      } catch (error) {
          toast({
              title: 'An error occurred',
              description: 'Could not connect to AI service.',
              variant: 'destructive',
            });
      }
    });
  }, [contact, toast]);

  React.useEffect(() => {
    if (isOpen) {
      handleMatch();
    } else {
        // Reset state on close
        setRecommendations('');
        setSuggestedProperties([]);
        setMatchMetadata(null);
    }
  }, [isOpen, handleMatch]);

  const formattedRecommendations = recommendations.replace(/\n-/g, '\n\n-');

  const copyMessage = `Hello ${contact?.name},\n\nBased on your preferences, I have found a few properties I think you will love. Here are my top recommendations:\n\n${formattedRecommendations}\n\nLet me know which ones catch your eye, and I would be happy to share more details or arrange a viewing.\n\nBest Regards,\nINDAH LIVING`;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyMessage).catch(console.error);
    toast({
        title: 'Copied',
        description: 'Recommendations copied to clipboard.',
    });
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            AI Property Matcher
          </DialogTitle>
          <DialogDescription>
            <span className="flex flex-wrap items-center gap-2">
              Property recommendations for {contact.name}.
              <MatchSourceBadge metadata={matchMetadata} />
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
            <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-6">
                    {isMatching && (
                        <div className='space-y-4 py-2'>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-28 w-full rounded-lg" />
                                <Skeleton className="h-28 w-full rounded-lg" />
                            </div>
                        </div>
                    )}
                    
                    {recommendations && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Match Analysis & Recommendations</h4>
                            <Textarea
                                id="property-recommendations"
                                readOnly
                                value={recommendations}
                                className="min-h-[140px] bg-muted/35 leading-relaxed text-sm resize-none"
                            />
                        </div>
                    )}

                    {suggestedProperties && suggestedProperties.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matched Listings</h4>
                            <div className="grid grid-cols-1 gap-4">
                                {suggestedProperties.map((property) => (
                                    <Card key={property.id} className="overflow-hidden border border-slate-100 hover:border-slate-200 transition-colors">
                                        <CardHeader className="bg-slate-50/50 pb-3">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <CardTitle className="text-base text-slate-900 font-semibold">{property.name}</CardTitle>
                                                    <CardDescription className="text-xs font-mono">Listing ID: {property.id}</CardDescription>
                                                </div>
                                                {property.matchScore != null && (
                                                    <Badge variant="secondary" className={`text-xs font-semibold px-2 py-0.5 select-none ${
                                                        property.matchScore >= 80 
                                                            ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                                            : property.matchScore >= 60 
                                                                ? 'bg-amber-100/80 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                                                                : 'bg-slate-100 text-slate-705 dark:bg-slate-800 dark:text-slate-350'
                                                    }`}>
                                                        {property.matchScore}% Match
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-3 text-sm space-y-3">
                                            <p className="text-muted-foreground leading-relaxed">{property.matchReason}</p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={!contact.phone || !findMatchedListing(property)}
                                                onClick={() => {
                                                    const listing = findMatchedListing(property);
                                                    if (listing) setDraftListing({ ...listing, matchReason: property.matchReason });
                                                }}
                                            >
                                                <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
                                                WhatsApp Draft
                                            </Button>
                                            
                                            {property.keySellingPoints && property.keySellingPoints.length > 0 && (
                                                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                                    <span className="text-xs font-semibold text-slate-650">Top Match Factors:</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {property.keySellingPoints.map((point: string, idx: number) => (
                                                            <span key={idx} className="inline-flex items-center gap-1 text-xs bg-slate-50 border text-slate-780 px-2 py-0.5 rounded">
                                                                <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                                                                {point}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Close
            </Button>
            <Button onClick={handleCopy} disabled={!recommendations || isMatching}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {draftListing && (
      <WhatsAppDraftDialog
        isOpen={!!draftListing}
        onOpenChange={(open) => {
          if (!open) setDraftListing(null);
        }}
        recipient={{ id: contact.id, name: contact.name, phone: contact.phone, type: 'contact' }}
        listings={[draftListing]}
      />
    )}
    </>
  );
}
