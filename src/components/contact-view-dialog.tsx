
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Contact, Listing } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from './ui/avatar';
import { PropertyMatchDialog } from './property-match-dialog';
import { MessageCircle, Sparkles } from 'lucide-react';
import { ContactWhatsAppDialog } from './contact-whatsapp-dialog';
import { getContactLeadStage } from '@/lib/crm-status';
import { LeadStageBadge } from './lead-stage-badge';

interface ContactViewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact: Contact;
  allListings: Listing[];
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; className?: string, children?: React.ReactNode }> = ({ label, value, className, children }) => {
    const content = value ?? children;
    if (!content && typeof content !== 'number') return null;
    return (
        <div className={cn("grid grid-cols-1 gap-1 text-sm", className)}>
            <p className="font-medium text-muted-foreground">{label}</p>
            <div className="break-words">{content}</div>
        </div>
    );
};

export function ContactViewDialog({ isOpen, onOpenChange, contact, allListings }: ContactViewDialogProps) {
  const [isPropertyMatchOpen, setPropertyMatchOpen] = React.useState(false);
  const [isWhatsAppOpen, setWhatsAppOpen] = React.useState(false);
  if (!contact) return null;

  const initials = contact.name.split(' ').map((n) => n[0]).join('');
  
  const offeredListingsDetails = contact.offeredListings
    ?.map(listingId => allListings.find(l => l.id === listingId))
    .filter((l): l is Listing => !!l);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
            <div className="flex flex-wrap items-center gap-4">
                <Avatar className="h-16 w-16 text-xl">
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                    <DialogTitle className="text-2xl">{contact.name}</DialogTitle>
                    <DialogDescription>
                        Contact Details (ID: {contact.serialNumber})
                    </DialogDescription>
                </div>
                <div className="ml-auto flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setWhatsAppOpen(true)}>
                    <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" />
                    WhatsApp Draft
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPropertyMatchOpen(true)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Find Matching Properties
                  </Button>
                </div>
            </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-6 -mr-2">
          <div className="space-y-6 py-4">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DetailItem label="Email Address" value={contact.email} />
                <DetailItem label="Phone Number" value={contact.phone} />
                <DetailItem label="Pipeline Stage">
                    <LeadStageBadge stage={getContactLeadStage(contact)} className="w-fit" />
                </DetailItem>
            </div>
            
            <Separator/>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <DetailItem label="Preferred Budget" value={`${contact.budget} Crores`} />
                 <DetailItem label="Contact Type" value={contact.contactType} />
                 <DetailItem label="City" value={contact.city} />
                 <DetailItem label="Location Preference" value={contact.locationPreference} />
                 <DetailItem label="Reference" value={contact.referenceContact} />
            </div>

            {contact.propertyPreference && contact.propertyPreference.length > 0 && (
                <>
                    <Separator/>
                    <DetailItem label="Property Preference">
                        <div className="flex flex-wrap gap-2">
                            {contact.propertyPreference.map(pref => (
                                <Badge key={pref} variant="outline">{pref}</Badge>
                            ))}
                        </div>
                    </DetailItem>
                </>
            )}

            {contact.requirementPurpose && contact.requirementPurpose.length > 0 && (
                <>
                    <Separator/>
                    <DetailItem label="Requirement Purpose">
                        <div className="flex flex-wrap gap-2">
                            {contact.requirementPurpose.map(purpose => (
                                <Badge key={purpose} variant="secondary">{purpose}</Badge>
                            ))}
                        </div>
                    </DetailItem>
                </>
            )}

            {offeredListingsDetails && offeredListingsDetails.length > 0 && (
                <>
                    <Separator/>
                    <DetailItem label="Offered Listings">
                        <div className="flex flex-wrap gap-2">
                            {offeredListingsDetails.map(listing => (
                                <Badge key={listing.id} variant="secondary">{listing.listingName} ({listing.listingId})</Badge>
                            ))}
                        </div>
                    </DetailItem>
                </>
            )}

            <Separator/>
            
            <div>
                <p className="font-medium text-muted-foreground text-sm mb-2">Interaction Notes</p>
                <div className="p-4 bg-muted/50 rounded-md text-sm whitespace-pre-wrap break-words">
                    {contact.notes || 'No notes available.'}
                </div>
            </div>

            <Separator/>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
                <DetailItem label="Contact Created" value={format(new Date(contact.createdAt), "PPP p")} />
                <DetailItem label="Added By" value={`${contact.createdByName || 'Admin'} (${contact.createdByEmail || 'manavsinghal@gmail.com'})`} />
                <DetailItem label="Last Updated" value={format(new Date(contact.updatedAt), "PPP p")} />
                <DetailItem label="Last Updated By" value={`${contact.updatedByName || contact.createdByName || 'Admin'} (${contact.updatedByEmail || contact.createdByEmail || 'manavsinghal@gmail.com'})`} />
            </div>

          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {isPropertyMatchOpen && (
        <PropertyMatchDialog 
            isOpen={isPropertyMatchOpen} 
            onOpenChange={setPropertyMatchOpen}
            contact={contact}
            allListings={allListings}
        />
    )}
    {isWhatsAppOpen && (
        <ContactWhatsAppDialog
            isOpen={isWhatsAppOpen}
            onOpenChange={setWhatsAppOpen}
            contact={contact}
            listings={allListings}
        />
    )}
    </>
  );
}
