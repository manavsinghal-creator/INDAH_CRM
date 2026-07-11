
'use client';

import * as React from 'react';
import type { Listing } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, Trash2, Eye, Copy, ExternalLink, Link as LinkIcon, Check, Sparkles, FileText } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getListingAvailability, isListingAvailable } from '@/lib/crm-status';
import { formatListingPrice, getListingDisplayTitle } from '@/lib/listing-display';

interface ListingCardProps {
  listing: Listing;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onView: (listing: Listing) => void;
  onMatch: (listing: Listing) => void;
  onEdit: (listing: Listing) => void;
  onDuplicate: (listing: Listing) => void;
  onExportInternalPdf: (listing: Listing) => void;
  onExportExternalPdf: (listing: Listing) => void;
  onDelete: (id: string) => void;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; children?: React.ReactNode }> = ({ label, value, children }) => {
    const content = value || children;
    if (!content && typeof content !== 'number') return null;
    return (
        <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right">{content}</span>
        </div>
    );
};

export function ListingCard({ 
    listing, 
    isSelected,
    onSelect,
    onView,
    onMatch,
    onEdit,
    onDuplicate,
    onExportInternalPdf,
    onExportExternalPdf,
    onDelete,
}: ListingCardProps) {
  const [isPending, startTransition] = React.useTransition();
  const getWebsiteStatusInfo = (status: Listing['websiteStatus']): { text: string; variant: "default" | "warm" | "outline" } => {
      if (status === 'Uploaded on website') return { text: 'Uploaded', variant: 'default' };
      if (status === 'Approved for website upload') return { text: 'Approved', variant: 'warm' };
      return { text: 'Not Set', variant: 'outline' };
  }
  const statusInfo = getWebsiteStatusInfo(listing.websiteStatus);

  const handleDelete = () => {
      startTransition(() => {
          onDelete(listing.id);
      })
  }
  
  const isAvailable = isListingAvailable(listing);
  const availability = getListingAvailability(listing);

  return (
    <Card className={cn("flex flex-col", !isAvailable && "bg-muted/50 text-muted-foreground")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(listing.id, !!checked)}
            aria-label={`Select listing ${listing.listingId}`}
            className="mt-1"
            disabled={!isAvailable}
          />
          <div className="flex-1">
            <CardTitle className="text-base text-foreground">{getListingDisplayTitle(listing)}</CardTitle>
            <CardDescription>{listing.location}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0"
            onClick={() => onMatch(listing)}
            disabled={!isAvailable}
            aria-label={`Find matching contacts for ${listing.listingName}`}
            title="Find matching contacts"
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(listing)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(listing)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportInternalPdf(listing)}><FileText className="mr-2 h-4 w-4" /> Internal PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportExternalPdf(listing)}><FileText className="mr-2 h-4 w-4" /> Client PDF</DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the listing for {listing.projectName}.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={isPending}>{isPending ? 'Deleting...' : 'Delete'}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm flex-grow">
        <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">{listing.bhkConfiguration}</Badge>
              <Badge variant={isAvailable ? 'default' : 'outline'}>{availability}</Badge>
            </div>
            <div className={cn("text-right text-lg font-bold text-primary", !isAvailable && "text-foreground")}>{formatListingPrice(listing)}</div>
        </div>
        <div className="space-y-1 rounded-md border p-2 bg-background/50">
            <DetailItem label="Listing ID" value={listing.listingId} />
            <DetailItem label="Project Name" value={listing.projectName} />
            <DetailItem label="Listing Type" value={listing.listingType || 'Public'} />
            <DetailItem label="Property Type" value={listing.propertyType} />
            <DetailItem label="Built Up Area" value={listing.builtUpArea ? `${listing.builtUpArea?.toLocaleString('en-IN')} sq.ft` : '-'} />
            <DetailItem label="Carpet Area" value={listing.carpetArea ? `${listing.carpetArea?.toLocaleString('en-IN')} sq.ft` : '-'} />
            <DetailItem label="Plot Area" value={listing.plotArea ? `${listing.plotArea?.toLocaleString('en-IN')} sq.m` : '-'} />
            <DetailItem label="Available Units" value={listing.availableUnits?.toLocaleString('en-IN')} />
            <DetailItem label="Price/SqFt" value={listing.priceOnRequest ? '-' : listing.pricePerSqFt ? `₹${listing.pricePerSqFt?.toLocaleString('en-IN')}` : '-'} />
            <DetailItem label="Project Status">
                <Badge variant="secondary" className="text-xs">{listing.projectStatus}</Badge>
            </DetailItem>
             <DetailItem label="Website Status">
                <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.text}</Badge>
            </DetailItem>
            <DetailItem label="Exclusive">
                {listing.exclusiveMandate ? <Check className="h-4 w-4 text-green-500" /> : <span className="text-muted-foreground">No</span>}
            </DetailItem>
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-1 gap-2 p-2">
        <Button variant="outline" size="sm" onClick={() => onView(listing)}>
          <Eye className="mr-2 h-4 w-4" /> View
        </Button>
        {listing.listingUrl && (
            <Button variant="ghost" size="sm" asChild className="col-span-1">
                <Link href={listing.listingUrl} target="_blank" rel="noopener noreferrer"><LinkIcon className="mr-2 h-4 w-4" /> Website Link</Link>
            </Button>
        )}
        {listing.externalPublicLink && (
            <Button variant="ghost" size="sm" asChild className="col-span-1">
                <Link href={listing.externalPublicLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Public Link</Link>
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}

    
