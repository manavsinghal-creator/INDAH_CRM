
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Listing } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Check, Copy, Minus, Sparkles, X } from 'lucide-react';
import { format } from 'date-fns';
import { ContactMatchDialog } from './contact-match-dialog';
import { getListingAvailability, isListingAvailable } from '@/lib/crm-status';
import { formatListingPrice, getListingDisplayTitle } from '@/lib/listing-display';

interface ListingViewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  listing: Listing;
  onDuplicate: (listing: Listing) => void;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode, className?: string }> = ({ label, value, children, className }) => {
    const content = value ?? children;
    return (
        <div className={cn("grid grid-cols-2 gap-2 text-sm", className)}>
            <p className="font-medium text-muted-foreground">{label}</p>
            <div>{content || <span className="text-muted-foreground">-</span>}</div>
        </div>
    );
};

const BooleanDetail: React.FC<{ label: string; value?: boolean | null; className?: string }> = ({ label, value, className }) => {
    return (
        <div className={cn("flex items-center justify-between text-sm", className)}>
            <p className="font-medium text-muted-foreground">{label}</p>
            {value === true && <Check className="h-5 w-5 text-green-500" />}
            {value === false && <X className="h-5 w-5 text-destructive" />}
            {(value === undefined || value === null) && <Minus className="h-5 w-5 text-muted-foreground" />}
        </div>
    );
};

const ListDetail: React.FC<{ label: string; items?: string[] | null; asBadges?: boolean }> = ({ label, items, asBadges = true }) => {
    return (
        <div className="text-sm">
            <p className="font-medium text-muted-foreground mb-2">{label}</p>
             {items && items.length > 0 ? (
                asBadges ? (
                    <div className="flex flex-wrap gap-2">
                        {items.map(item => <Badge key={item} variant="secondary" className="capitalize">{item}</Badge>)}
                    </div>
                ) : (
                    <p className="text-muted-foreground capitalize">{items.join(', ')}</p>
                )
            ) : (
                <span className="text-muted-foreground">-</span>
            )}
        </div>
    );
};

export function ListingViewDialog({ isOpen, onOpenChange, listing, onDuplicate }: ListingViewDialogProps) {
  const [isContactMatchOpen, setContactMatchOpen] = React.useState(false);

  const getWebsiteStatusVariant = (status: Listing['websiteStatus']) => {
      if (status === 'Uploaded on website') return 'default';
      if (status === 'Approved for website upload') return 'warm';
      return 'outline';
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{getListingDisplayTitle(listing) || 'N/A'}</DialogTitle>
              <DialogDescription>
                Viewing full details for Listing ID: {listing.listingId || 'Not assigned'} (Project: {listing.projectName})
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setContactMatchOpen(true)} disabled={!isListingAvailable(listing)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Find Matching Contacts
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] pr-6 -mr-2">
          <div className="space-y-6 py-4">

             <Card>
                <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">{listing.description || <span className="text-muted-foreground">-</span>}</CardContent>
             </Card>

            <Card>
                <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem label="Listing Name" value={listing.listingName} />
                    <DetailItem label="Title Project Name" value={listing.titleProjectName} />
                    <DetailItem label="Project Name" value={listing.projectName} />
                    <DetailItem label="Builder/Developer" value={listing.developerName} />
                    <DetailItem label="Contact Person" value={listing.contactPerson} />
                    <DetailItem label="Phone Number" value={listing.phone} />
                    <DetailItem label="Email Address" value={listing.email} />
                    <DetailItem label="Property Address" value={listing.propertyAddress} />
                    <DetailItem label="Location" value={listing.location} />
                    <DetailItem label="Date of Meeting" value={listing.dateOfMeeting} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Property Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem label="Property Type" value={listing.propertyType === 'Other' ? listing.propertyTypeOther : listing.propertyType} />
                    <DetailItem label="Listing Type" value={listing.listingType || 'Public'} />
                    <DetailItem label="Project Status" value={listing.projectStatus} />
                    <DetailItem label="Availability">
                        <Badge variant={isListingAvailable(listing) ? 'default' : 'outline'}>{getListingAvailability(listing)}</Badge>
                    </DetailItem>
                     <DetailItem label="Website Status">
                        {listing.websiteStatus ? <Badge variant={getWebsiteStatusVariant(listing.websiteStatus)}>{listing.websiteStatus}</Badge> : null}
                    </DetailItem>
                    <DetailItem label="Highlight">
                        {listing.highlight ? <Badge variant="accent">{listing.highlight}</Badge> : null}
                    </DetailItem>
                    <DetailItem label="Expected Possession" value={listing.expectedPossessionDate} />
                    <DetailItem label="BHK Configuration" value={listing.bhkConfiguration} />
                    <DetailItem label="Furnishing" value={listing.furnishing} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Area & Unit Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem label="Built-up Area" value={listing.builtUpArea ? `${listing.builtUpArea} sq.ft` : null} />
                    <DetailItem label="Carpet Area" value={listing.carpetArea ? `${listing.carpetArea} sq.ft` : null} />
                    <DetailItem label="Plot Area" value={listing.plotArea ? `${listing.plotArea} sq.m` : null} />
                    <DetailItem label="Number of Floors" value={listing.floors} />
                    <DetailItem label="Unit Floor Number" value={listing.unitFloor} />
                    <DetailItem label="Total Units" value={listing.totalUnits} />
                    <DetailItem label="Available Units" value={listing.availableUnits} />
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Pricing & Payment</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                       <DetailItem label="Base Price" value={formatListingPrice(listing)} />
                       <DetailItem label="Price per sq.ft" value={listing.priceOnRequest ? '-' : listing.pricePerSqFt ? `₹${listing.pricePerSqFt.toLocaleString('en-IN')}` : null} />
                    </div>
                    <ListDetail label="Taxes Applicable" items={listing.taxesApplicable} />
                    <DetailItem label="Payment Schedule" value={listing.paymentSchedule} className="grid-cols-1 md:grid-cols-[1fr_2fr]" />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Amenities & Features</CardTitle></CardHeader>
                <CardContent>
                    <ListDetail label="" items={listing.amenities} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Unique Selling Propositions (USPs)</CardTitle></CardHeader>
                <CardContent>
                    <ListDetail label="" items={listing.usps} asBadges={false} />
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Legal & Quality</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem label="RERA Registration" value={listing.reraRegistration} />
                    <DetailItem label="Completion Certificate" value={listing.completionCertificate} />
                    <DetailItem label="Architect/Designer" value={listing.architectDesigner} />
                    <DetailItem label="Construction Quality" value={listing.constructionQuality} />
                    <BooleanDetail label="Title Clear" value={listing.titleClear} />
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>Marketing & Sales</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <ListDetail label="Marketing Materials" items={listing.marketingMaterials} />
                    <DetailItem label="Listing URL" value={listing.listingUrl} />
                    <DetailItem label="External Public Link" value={listing.externalPublicLink} />
                    <DetailItem label="Virtual Tour Link" value={listing.virtualTourLink} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4 pt-4">
                        <BooleanDetail label="Exclusive Mandate" value={listing.exclusiveMandate} />
                        <BooleanDetail label="Staging Available" value={listing.stagingAvailable} />
                        <BooleanDetail label="Model Flat Ready" value={listing.modelFlatReady} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Additional Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem label="Ideal Buyer Profile" value={listing.idealBuyerProfile} />
                    <DetailItem label="Accessibility" value={listing.accessibility} />
                    <DetailItem label="Distance from Main Road" value={listing.distanceFromMainRoad} />
                    <ListDetail label="Additional Actions Required" items={listing.additionalActions} />
                     <DetailItem label="Notes & Observations" value={listing.notes} className="col-span-full grid-cols-1 md:grid-cols-[1fr_4fr]"/>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>History</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailItem label="Created On" value={listing.createdAt ? format(new Date(listing.createdAt), "PPP p") : '-'} />
                    <DetailItem label="Last Updated" value={listing.updatedAt ? format(new Date(listing.updatedAt), "PPP p") : '-'} />
                </CardContent>
            </Card>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onDuplicate(listing)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {isContactMatchOpen && (
        <ContactMatchDialog 
            isOpen={isContactMatchOpen}
            onOpenChange={setContactMatchOpen}
            listingId={listing.id}
        />
    )}
    </>
  );
}
