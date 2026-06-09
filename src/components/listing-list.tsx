
'use client';

import * as React from 'react';
import { listingAvailabilityOptions, type Listing, type ListingAvailability } from '@/lib/types';
import { useSearchParams } from 'next/navigation';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListingForm } from '@/components/listing-form';
import {
  MoreHorizontal,
  PlusCircle,
  Trash2,
  Edit,
  Link as LinkIcon,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Search,
  Printer,
  Copy,
  Check,
  ExternalLink,
  List,
  LayoutGrid,
} from 'lucide-react';
import { deleteListing } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
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
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';
import { ListingViewDialog } from './listing-view-dialog';
import { Checkbox } from './ui/checkbox';
import { SendListingsDialog } from './send-listings-dialog';
import { Input } from './ui/input';
import { useRouter } from 'next/navigation';
import { ListingCard } from './listing-card';
import { cn } from '@/lib/utils';
import { QuickMatchDialog } from './quick-match-dialog';
import { getListingAvailability, isListingAvailable } from '@/lib/crm-status';


type SortKey = keyof Pick<Listing, 'listingId' | 'listingName' | 'projectName' | 'propertyType' | 'location' | 'bhkConfiguration' | 'carpetArea' | 'builtUpArea' | 'projectStatus' | 'availabilityStatus' | 'basePrice' | 'pricePerSqFt' | 'totalUnits' | 'availableUnits' | 'plotArea' | 'furnishing' | 'websiteStatus' | 'exclusiveMandate' | 'updatedAt' | 'externalPublicLink' | 'isActive'>;
type ViewMode = 'list' | 'grid';

function ListingListContent({ initialListings }: { initialListings: Listing[] }) {
  const [selectedListings, setSelectedListings] = React.useState<string[]>([]);
  const [sortKey, setSortKey] = React.useState<SortKey>('updatedAt');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [availabilityFilter, setAvailabilityFilter] = React.useState<'All' | ListingAvailability>('All');
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [isViewOpen, setViewOpen] = React.useState(false);
  const [isSendDialogOpen, setSendDialogOpen] = React.useState(false);
  const [editingListing, setEditingListing] = React.useState<Listing | null>(null);
  const [viewingListing, setViewingListing] = React.useState<Listing | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [isClient, setIsClient] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const { toast } = useToast();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleEdit = (listing: Listing) => {
    setEditingListing(listing);
    setFormOpen(true);
  };
  
  const handleView = (listing: Listing) => {
    setViewingListing(listing);
    setViewOpen(true);
  };
  
  const handleDuplicate = (listing: Listing) => {
    const { id, ...listingToDuplicate } = listing;
    setViewingListing(null);
    setViewOpen(false);
    setEditingListing(listingToDuplicate as Listing);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingListing(null);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteListing(id);
      if (result.success) {
        toast({ title: "Success", description: "Listing deleted successfully." });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleSelectListing = (listingId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedListings(prev => [...prev, listingId]);
    } else {
      setSelectedListings(prev => prev.filter(id => id !== listingId));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedListings(selectableListings.map(l => l.id));
    } else {
      setSelectedListings([]);
    }
  };
  
  const sortedListings = React.useMemo(() => {
    return [...initialListings].filter(listing => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
            (listing.listingId && listing.listingId.toLowerCase().includes(query)) ||
            (listing.listingName && listing.listingName.toLowerCase().includes(query)) ||
            listing.projectName.toLowerCase().includes(query) ||
            listing.propertyType.toLowerCase().includes(query) ||
            listing.bhkConfiguration.toLowerCase().includes(query) ||
            listing.location.toLowerCase().includes(query) ||
            listing.projectStatus.toLowerCase().includes(query) ||
            getListingAvailability(listing).toLowerCase().includes(query) ||
            (listing.websiteStatus && listing.websiteStatus.toLowerCase().includes(query)) ||
            (listing.highlight && listing.highlight.toLowerCase().includes(query)) ||
            String(listing.carpetArea).includes(query) ||
            String(listing.builtUpArea).includes(query) ||
            String(listing.basePrice).includes(query) ||
            String(listing.pricePerSqFt).includes(query) ||
            String(listing.availableUnits).includes(query)
        );
        return matchesSearch && (availabilityFilter === 'All' || getListingAvailability(listing) === availabilityFilter);
    }).sort((a, b) => {
      let aValue: any, bValue: any;

      if (sortKey === 'updatedAt') {
        const aDate = a[sortKey] ? new Date(a[sortKey]!).getTime() : 0;
        const bDate = b[sortKey] ? new Date(b[sortKey]!).getTime() : 0;
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }
      if (sortKey === 'isActive') {
        aValue = a.isActive ?? true;
        bValue = b.isActive ?? true;
      } else if (sortKey === 'availabilityStatus') {
        aValue = getListingAvailability(a);
        bValue = getListingAvailability(b);
      } else {
        const aKey = a[sortKey];
        const bKey = b[sortKey];
        if (typeof aKey === 'number' && typeof bKey === 'number') {
          aValue = aKey;
          bValue = bKey;
        } else if (typeof aKey === 'boolean' && typeof bKey === 'boolean') {
          aValue = aKey;
          bValue = bKey;
        } else {
          aValue = String(aKey ?? '').toLowerCase();
          bValue = String(bKey ?? '').toLowerCase();
        }
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [availabilityFilter, initialListings, sortKey, sortOrder, searchQuery]);
  const selectableListings = React.useMemo(() => sortedListings.filter(isListingAvailable), [sortedListings]);
  const availabilityCounts = React.useMemo(() => {
    const counts = Object.fromEntries(listingAvailabilityOptions.map((status) => [status, 0])) as Record<ListingAvailability, number>;
    initialListings.forEach((listing) => {
      counts[getListingAvailability(listing)] += 1;
    });
    return counts;
  }, [initialListings]);
  
  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const selectedListingsData = React.useMemo(() => {
    return initialListings.filter(l => selectedListings.includes(l.id) && isListingAvailable(l));
  }, [initialListings, selectedListings]);

  const getWebsiteStatusInfo = (status: Listing['websiteStatus']): { text: string; variant: "default" | "warm" | "outline" } => {
      if (status === 'Uploaded on website') return { text: 'Uploaded', variant: 'default' };
      if (status === 'Approved for website upload') return { text: 'Approved', variant: 'warm' };
      return { text: 'Not Set', variant: 'outline' };
  }

  const lastListingId = initialListings.length > 0 ? initialListings[0].listingId : 'N/A';

  const searchParams = useSearchParams();
  const editListingId = searchParams.get('edit');

  React.useEffect(() => {
    if (editListingId) {
      const listingToEdit = initialListings.find(l => l.id === editListingId);
      if (listingToEdit) {
        handleEdit(listingToEdit);
      }
    }
  }, [editListingId, initialListings]);

  return (
    <div className="space-y-6">
        <div className="space-y-4 print-hidden">
            <div className="flex flex-col md:flex-row items-center gap-4">
                <h2 className="text-3xl font-bold tracking-tight flex-1">Property Listings</h2>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search listings..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
                <Button onClick={handleAddNew} variant="default" className="shadow-sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Listing
                </Button>
                 {selectedListings.length > 0 && (
                    <Button variant="outline" onClick={() => setSendDialogOpen(true)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send ({selectedListings.length})
                    </Button>
                )}
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                 <QuickMatchDialog />
                <div className="flex items-center rounded-md bg-muted ml-auto">
                    <Button variant={viewMode === 'list' ? 'ghost' : 'ghost'} onClick={() => setViewMode('list')} size="sm" className={cn(viewMode === 'list' && 'bg-background text-foreground shadow-sm')}>
                        <List className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">List</span>
                    </Button>
                    <Button variant={viewMode === 'grid' ? 'ghost' : 'ghost'} onClick={() => setViewMode('grid')} size="sm" className={cn(viewMode === 'grid' && 'bg-background text-foreground shadow-sm')}>
                        <LayoutGrid className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">Grid</span>
                    </Button>
                </div>
                 <div className="text-sm text-muted-foreground">
                    Last ID used: <span className="font-mono font-semibold text-foreground">{lastListingId}</span>
                </div>
            </div>
        </div>

        <section aria-label="Listing availability" className="border-y bg-muted/20 py-3 print-hidden">
          <div className="flex gap-2 overflow-x-auto px-1 pb-1">
            <Button type="button" size="sm" variant={availabilityFilter === 'All' ? 'default' : 'outline'} onClick={() => setAvailabilityFilter('All')} className="shrink-0">
              All Listings <Badge variant="secondary" className="ml-2">{initialListings.length}</Badge>
            </Button>
            {listingAvailabilityOptions.map((status) => (
              <Button key={status} type="button" size="sm" variant={availabilityFilter === status ? 'default' : 'outline'} onClick={() => setAvailabilityFilter(status)} className="shrink-0">
                {status} <Badge variant="secondary" className="ml-2">{availabilityCounts[status]}</Badge>
              </Button>
            ))}
          </div>
        </section>

        {viewMode === 'list' ? (
          <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="relative max-h-[calc(100vh-22rem)] overflow-auto print-h-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 print-bg-white">
                  <TableRow>
                    <TableHead className="sticky top-0 bg-card w-12 print-hidden">
                       <Checkbox
                          checked={selectedListings.length > 0 && selectedListings.length < selectableListings.length ? 'indeterminate' : selectableListings.length > 0 && selectedListings.length === selectableListings.length}
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                          aria-label="Select all"
                          />
                    </TableHead>
                    <TableHead onClick={() => handleSort('listingId')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Listing ID {getSortIcon('listingId')}</div></TableHead>
                    <TableHead onClick={() => handleSort('listingName')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Listing Name {getSortIcon('listingName')}</div></TableHead>
                    <TableHead onClick={() => handleSort('availabilityStatus')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Availability {getSortIcon('availabilityStatus')}</div></TableHead>
                    <TableHead onClick={() => handleSort('projectName')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Project Name {getSortIcon('projectName')}</div></TableHead>
                    <TableHead onClick={() => handleSort('propertyType')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Type {getSortIcon('propertyType')}</div></TableHead>
                    <TableHead onClick={() => handleSort('location')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Location {getSortIcon('location')}</div></TableHead>
                    <TableHead onClick={() => handleSort('bhkConfiguration')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">BHK Config {getSortIcon('bhkConfiguration')}</div></TableHead>
                    <TableHead onClick={() => handleSort('carpetArea')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Carpet Area {getSortIcon('carpetArea')}</div></TableHead>
                    <TableHead onClick={() => handleSort('builtUpArea')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Built Up Area {getSortIcon('builtUpArea')}</div></TableHead>
                    <TableHead onClick={() => handleSort('projectStatus')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Project Status {getSortIcon('projectStatus')}</div></TableHead>
                    <TableHead onClick={() => handleSort('basePrice')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Price (Cr) {getSortIcon('basePrice')}</div></TableHead>
                    <TableHead onClick={() => handleSort('pricePerSqFt')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Price/SqFt {getSortIcon('pricePerSqFt')}</div></TableHead>
                    <TableHead onClick={() => handleSort('totalUnits')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Total Units {getSortIcon('totalUnits')}</div></TableHead>
                    <TableHead onClick={() => handleSort('availableUnits')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Available Units {getSortIcon('availableUnits')}</div></TableHead>
                    <TableHead onClick={() => handleSort('plotArea')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Plot Area (sq.m) {getSortIcon('plotArea')}</div></TableHead>
                    <TableHead onClick={() => handleSort('furnishing')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Furnishing {getSortIcon('furnishing')}</div></TableHead>
                    <TableHead onClick={() => handleSort('websiteStatus')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Website Status {getSortIcon('websiteStatus')}</div></TableHead>
                    <TableHead onClick={() => handleSort('exclusiveMandate')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Exclusive {getSortIcon('exclusiveMandate')}</div></TableHead>
                    <TableHead className="sticky top-0 bg-card text-right w-[150px] print-hidden">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isClient ? (
                      Array.from({ length: 10 }).map((_, i) => (
                          <TableRow key={i}>
                              <TableCell className="w-12"><Skeleton className="h-5 w-5"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-16"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              <TableCell><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8"/><Skeleton className="h-8 w-8"/></div></TableCell>
                          </TableRow>
                      ))
                  ) : (
                      sortedListings.map(listing => {
                      const statusInfo = getWebsiteStatusInfo(listing.websiteStatus);
                      return (
                      <TableRow key={listing.id} data-state={selectedListings.includes(listing.id) ? "selected" : ""} className={cn(!isListingAvailable(listing) && 'bg-muted/50 text-muted-foreground')}>
                          <TableCell className="print-hidden">
                            <Checkbox
                                checked={selectedListings.includes(listing.id)}
                                onCheckedChange={(checked) => handleSelectListing(listing.id, !!checked)}
                                aria-label={`Select listing ${listing.listingId}`}
                                disabled={!isListingAvailable(listing)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">{listing.listingId}</TableCell>
                          <TableCell className="font-medium">{listing.listingName}</TableCell>
                          <TableCell><Badge variant={isListingAvailable(listing) ? 'default' : 'outline'}>{getListingAvailability(listing)}</Badge></TableCell>
                          <TableCell>{listing.projectName}</TableCell>
                          <TableCell>{listing.propertyType}</TableCell>
                          <TableCell>{listing.location}</TableCell>
                          <TableCell>{listing.bhkConfiguration}</TableCell>
                          <TableCell>{listing.carpetArea?.toLocaleString('en-IN')}</TableCell>
                          <TableCell>{listing.builtUpArea?.toLocaleString('en-IN')}</TableCell>
                          <TableCell><Badge variant="outline">{listing.projectStatus}</Badge></TableCell>
                          <TableCell>{listing.basePrice.toLocaleString('en-IN')}</TableCell>
                          <TableCell>{listing.pricePerSqFt?.toLocaleString('en-IN')}</TableCell>
                          <TableCell>{listing.totalUnits?.toLocaleString('en-IN')}</TableCell>
                          <TableCell>{listing.availableUnits?.toLocaleString('en-IN')}</TableCell>
                          <TableCell>{listing.plotArea?.toLocaleString('en-IN')}</TableCell>
                          <TableCell>{listing.furnishing}</TableCell>
                          <TableCell><Badge variant={statusInfo.variant}>{statusInfo.text}</Badge></TableCell>
                          <TableCell>{listing.exclusiveMandate ? <Check className="h-5 w-5 text-green-500" /> : ''}</TableCell>
                          <TableCell className="text-right print-hidden">
                          <div className="flex items-center justify-end gap-1">
                              {listing.listingUrl && (
                                  <Button variant="ghost" size="icon" asChild>
                                  <Link href={listing.listingUrl} target="_blank" rel="noopener noreferrer">
                                      <LinkIcon className="h-4 w-4" />
                                  </Link>
                                  </Button>
                              )}
                              {listing.externalPublicLink && (
                                  <Button variant="ghost" size="icon" asChild>
                                  <Link href={listing.externalPublicLink} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                  </Link>
                                  </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => handleView(listing)} aria-label="View Listing">
                                  <Eye className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(listing)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicate(listing)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                                  <AlertDialog>
                                  <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem></AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>This will permanently delete the listing for {listing.projectName}.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDelete(listing.id)} disabled={isPending}>{isPending ? 'Deleting...' : 'Delete'}</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                                  </AlertDialog>
                              </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                          </TableCell>
                      </TableRow>
                      )})
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedListings.map(listing => (
              <ListingCard 
                key={listing.id}
                listing={listing}
                isSelected={selectedListings.includes(listing.id)}
                onSelect={handleSelectListing}
                onView={handleView}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      
      <ListingForm isOpen={isFormOpen} onOpenChange={setFormOpen} listing={editingListing} />
      {viewingListing && <ListingViewDialog isOpen={isViewOpen} onOpenChange={setViewOpen} listing={viewingListing} onDuplicate={handleDuplicate} />}
      <SendListingsDialog 
          isOpen={isSendDialogOpen} 
          onOpenChange={setSendDialogOpen} 
          listings={selectedListingsData}
          onSendSuccess={() => setSelectedListings([])} 
      />
    </div>
  );
}

export function ListingList({ initialListings }: { initialListings: Listing[] }) {
    return (
        <React.Suspense fallback={<div className="text-center p-8">Loading listings...</div>}>
            <ListingListContent initialListings={initialListings} />
        </React.Suspense>
    )
}
