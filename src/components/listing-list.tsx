
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
  FileText,
  Copy,
  Check,
  ExternalLink,
  List,
  LayoutGrid,
  Sparkles,
  Filter,
  X,
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
import { ContactMatchDialog } from './contact-match-dialog';
import { RefreshButton } from './refresh-button';
import { formatListingPrice, getListingDisplayTitle } from '@/lib/listing-display';
import { exportExternalListingPdf, exportInternalListingPdf } from '@/lib/listing-pdf';
import { ListingHeroImage } from './listing-hero-image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';


type SortKey = keyof Pick<Listing, 'listingId' | 'listingName' | 'projectName' | 'propertyType' | 'location' | 'bhkConfiguration' | 'carpetArea' | 'builtUpArea' | 'projectStatus' | 'availabilityStatus' | 'basePrice' | 'pricePerSqFt' | 'totalUnits' | 'availableUnits' | 'plotArea' | 'furnishing' | 'websiteStatus' | 'exclusiveMandate' | 'updatedAt' | 'externalPublicLink' | 'isActive'>;
type ViewMode = 'list' | 'grid';
type WebsiteFilter = 'All' | 'Uploaded' | 'Not uploaded' | 'Approved';
type ExclusiveFilter = 'All' | 'Exclusive' | 'Non-exclusive';
type ListingTypeFilter = 'All' | 'Public' | 'Private';
type PriceModeFilter = 'All' | 'Price set' | 'Price on request';

function ListingListContent({ initialListings }: { initialListings: Listing[] }) {
  const [selectedListings, setSelectedListings] = React.useState<string[]>([]);
  const [sortKey, setSortKey] = React.useState<SortKey>('updatedAt');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [availabilityFilter, setAvailabilityFilter] = React.useState<'All' | ListingAvailability>('All');
  const [websiteFilter, setWebsiteFilter] = React.useState<WebsiteFilter>('All');
  const [exclusiveFilter, setExclusiveFilter] = React.useState<ExclusiveFilter>('All');
  const [listingTypeFilter, setListingTypeFilter] = React.useState<ListingTypeFilter>('All');
  const [locationFilter, setLocationFilter] = React.useState('All');
  const [propertyTypeFilter, setPropertyTypeFilter] = React.useState('All');
  const [bhkFilter, setBhkFilter] = React.useState('All');
  const [projectStatusFilter, setProjectStatusFilter] = React.useState('All');
  const [priceModeFilter, setPriceModeFilter] = React.useState<PriceModeFilter>('All');
  const [minPriceFilter, setMinPriceFilter] = React.useState('');
  const [maxPriceFilter, setMaxPriceFilter] = React.useState('');
  const [showMoreFilters, setShowMoreFilters] = React.useState(false);
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [isViewOpen, setViewOpen] = React.useState(false);
  const [isSendDialogOpen, setSendDialogOpen] = React.useState(false);
  const [isContactMatchOpen, setContactMatchOpen] = React.useState(false);
  const [editingListing, setEditingListing] = React.useState<Listing | null>(null);
  const [viewingListing, setViewingListing] = React.useState<Listing | null>(null);
  const [matchingListing, setMatchingListing] = React.useState<Listing | null>(null);
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

  const handleContactMatch = (listing: Listing) => {
    setMatchingListing(listing);
    setContactMatchOpen(true);
  };
  
  const handleDuplicate = (listing: Listing) => {
    const { id, ...listingToDuplicate } = listing;
    setViewingListing(null);
    setViewOpen(false);
    setEditingListing(listingToDuplicate as Listing);
    setFormOpen(true);
  };

  const handleExportInternalPdf = async (listing: Listing) => {
    try {
      await exportInternalListingPdf(listing);
      toast({
        title: 'Internal PDF generated',
        description: `${listing.listingId || listing.listingName} internal PDF has been downloaded.`,
      });
    } catch {
      toast({ title: 'PDF could not be generated', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const handleExportExternalPdf = async (listing: Listing) => {
    try {
      await exportExternalListingPdf(listing);
      toast({
        title: 'Client PDF generated',
        description: `${listing.listingId || listing.listingName} client PDF has been downloaded.`,
      });
    } catch {
      toast({ title: 'PDF could not be generated', description: 'Please try again.', variant: 'destructive' });
    }
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
  
  const filterOptions = React.useMemo(() => {
    const uniqueValues = (getValue: (listing: Listing) => string | undefined) => (
      Array.from(new Set(initialListings.map(getValue).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b))
    );
    return {
      locations: uniqueValues((listing) => listing.location),
      propertyTypes: uniqueValues((listing) => listing.propertyType),
      bhkConfigurations: uniqueValues((listing) => listing.bhkConfiguration),
      projectStatuses: uniqueValues((listing) => listing.projectStatus),
    };
  }, [initialListings]);

  const hasAdvancedFilters = websiteFilter !== 'All'
    || exclusiveFilter !== 'All'
    || listingTypeFilter !== 'All'
    || locationFilter !== 'All'
    || propertyTypeFilter !== 'All'
    || bhkFilter !== 'All'
    || projectStatusFilter !== 'All'
    || priceModeFilter !== 'All'
    || Boolean(minPriceFilter)
    || Boolean(maxPriceFilter);

  const clearFilters = () => {
    setSearchQuery('');
    setAvailabilityFilter('All');
    setWebsiteFilter('All');
    setExclusiveFilter('All');
    setListingTypeFilter('All');
    setLocationFilter('All');
    setPropertyTypeFilter('All');
    setBhkFilter('All');
    setProjectStatusFilter('All');
    setPriceModeFilter('All');
    setMinPriceFilter('');
    setMaxPriceFilter('');
    setShowMoreFilters(false);
  };

  const sortedListings = React.useMemo(() => {
    const minPrice = Number(minPriceFilter);
    const maxPrice = Number(maxPriceFilter);
    return [...initialListings].filter(listing => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
            (listing.listingId && listing.listingId.toLowerCase().includes(query)) ||
            (listing.listingName && listing.listingName.toLowerCase().includes(query)) ||
            (listing.titleProjectName && listing.titleProjectName.toLowerCase().includes(query)) ||
            listing.projectName.toLowerCase().includes(query) ||
            (listing.listingType && listing.listingType.toLowerCase().includes(query)) ||
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
        const matchesAvailability = availabilityFilter === 'All' || getListingAvailability(listing) === availabilityFilter;
        const matchesWebsite = websiteFilter === 'All'
          || (websiteFilter === 'Uploaded' && listing.websiteStatus === 'Uploaded on website')
          || (websiteFilter === 'Not uploaded' && listing.websiteStatus !== 'Uploaded on website')
          || (websiteFilter === 'Approved' && listing.websiteStatus === 'Approved for website upload');
        const matchesExclusive = exclusiveFilter === 'All'
          || (exclusiveFilter === 'Exclusive' && listing.exclusiveMandate === true)
          || (exclusiveFilter === 'Non-exclusive' && listing.exclusiveMandate !== true);
        const matchesListingType = listingTypeFilter === 'All' || (listing.listingType || 'Public') === listingTypeFilter;
        const matchesLocation = locationFilter === 'All' || listing.location === locationFilter;
        const matchesPropertyType = propertyTypeFilter === 'All' || listing.propertyType === propertyTypeFilter;
        const matchesBhk = bhkFilter === 'All' || listing.bhkConfiguration === bhkFilter;
        const matchesProjectStatus = projectStatusFilter === 'All' || listing.projectStatus === projectStatusFilter;
        const matchesPriceMode = priceModeFilter === 'All'
          || (priceModeFilter === 'Price on request' && listing.priceOnRequest === true)
          || (priceModeFilter === 'Price set' && listing.priceOnRequest !== true);
        const matchesMinPrice = !minPriceFilter || (Number.isFinite(minPrice) && !listing.priceOnRequest && listing.basePrice >= minPrice);
        const matchesMaxPrice = !maxPriceFilter || (Number.isFinite(maxPrice) && !listing.priceOnRequest && listing.basePrice <= maxPrice);

        return matchesSearch
          && matchesAvailability
          && matchesWebsite
          && matchesExclusive
          && matchesListingType
          && matchesLocation
          && matchesPropertyType
          && matchesBhk
          && matchesProjectStatus
          && matchesPriceMode
          && matchesMinPrice
          && matchesMaxPrice;
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
  }, [availabilityFilter, bhkFilter, exclusiveFilter, initialListings, listingTypeFilter, locationFilter, maxPriceFilter, minPriceFilter, priceModeFilter, projectStatusFilter, propertyTypeFilter, searchQuery, sortKey, sortOrder, websiteFilter]);
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
                <RefreshButton className="w-full md:w-auto" />
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

        <section aria-label="Listing filters" className="rounded-lg border-2 border-border bg-card px-3 py-4 shadow-sm sm:px-4 print-hidden">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm font-semibold text-foreground"><Filter className="h-4 w-4 text-primary" /> Availability</span>
              <Button type="button" size="sm" variant={availabilityFilter === 'All' ? 'default' : 'outline'} onClick={() => setAvailabilityFilter('All')} className="shrink-0">
                All <Badge variant="secondary" className="ml-2">{initialListings.length}</Badge>
              </Button>
              {listingAvailabilityOptions.map((status) => (
                <Button key={status} type="button" size="sm" variant={availabilityFilter === status ? 'default' : 'outline'} onClick={() => setAvailabilityFilter(status)} className="shrink-0">
                  {status} <Badge variant="secondary" className="ml-2">{availabilityCounts[status]}</Badge>
                </Button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger aria-label="Filter listings by location"><SelectValue placeholder="All locations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All locations</SelectItem>
                  {filterOptions.locations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                <SelectTrigger aria-label="Filter listings by property type"><SelectValue placeholder="All property types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All property types</SelectItem>
                  {filterOptions.propertyTypes.map((propertyType) => <SelectItem key={propertyType} value={propertyType}>{propertyType}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={bhkFilter} onValueChange={setBhkFilter}>
                <SelectTrigger aria-label="Filter listings by BHK"><SelectValue placeholder="All BHK configurations" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All BHK configurations</SelectItem>
                  {filterOptions.bhkConfigurations.map((bhk) => <SelectItem key={bhk} value={bhk}>{bhk}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={websiteFilter} onValueChange={(value) => setWebsiteFilter(value as WebsiteFilter)}>
                <SelectTrigger aria-label="Filter listings by website status"><SelectValue placeholder="Website status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All website statuses</SelectItem>
                  <SelectItem value="Uploaded">Uploaded to website</SelectItem>
                  <SelectItem value="Not uploaded">Not uploaded to website</SelectItem>
                  <SelectItem value="Approved">Approved for website</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={() => setShowMoreFilters((current) => !current)} className="justify-between">
                More filters
                <Badge variant="secondary" className="ml-2">{hasAdvancedFilters ? 'On' : 'Optional'}</Badge>
              </Button>
            </div>

            {showMoreFilters && (
              <div className="grid gap-2 border-t pt-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <Select value={exclusiveFilter} onValueChange={(value) => setExclusiveFilter(value as ExclusiveFilter)}>
                  <SelectTrigger aria-label="Filter listings by exclusivity"><SelectValue placeholder="All mandates" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All mandates</SelectItem>
                    <SelectItem value="Exclusive">Exclusive only</SelectItem>
                    <SelectItem value="Non-exclusive">Non-exclusive only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={listingTypeFilter} onValueChange={(value) => setListingTypeFilter(value as ListingTypeFilter)}>
                  <SelectTrigger aria-label="Filter listings by visibility"><SelectValue placeholder="Public and private" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Public and private</SelectItem>
                    <SelectItem value="Public">Public listings</SelectItem>
                    <SelectItem value="Private">Private listings</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                  <SelectTrigger aria-label="Filter listings by project status"><SelectValue placeholder="All project stages" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All project stages</SelectItem>
                    {filterOptions.projectStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={priceModeFilter} onValueChange={(value) => setPriceModeFilter(value as PriceModeFilter)}>
                  <SelectTrigger aria-label="Filter listings by price availability"><SelectValue placeholder="All pricing" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All pricing</SelectItem>
                    <SelectItem value="Price set">Price set</SelectItem>
                    <SelectItem value="Price on request">Price on request</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min="0" step="0.01" value={minPriceFilter} onChange={(event) => setMinPriceFilter(event.target.value)} placeholder="Min price (Cr)" aria-label="Minimum price in crores" />
                  <Input type="number" min="0" step="0.01" value={maxPriceFilter} onChange={(event) => setMaxPriceFilter(event.target.value)} placeholder="Max price (Cr)" aria-label="Maximum price in crores" />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>{sortedListings.length} {sortedListings.length === 1 ? 'listing' : 'listings'} shown</span>
              {(searchQuery || availabilityFilter !== 'All' || hasAdvancedFilters) && (
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" /> Clear filters
                </Button>
              )}
            </div>
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
                    <TableHead className="sticky top-0 bg-card w-20">Image</TableHead>
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
                              <TableCell><Skeleton className="h-12 w-16"/></TableCell>
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
                      sortedListings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={21} className="py-12 text-center text-muted-foreground">
                            No listings match these filters.
                          </TableCell>
                        </TableRow>
                      ) : sortedListings.map(listing => {
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
                          <TableCell><ListingHeroImage src={listing.heroImageUrl} alt={`${getListingDisplayTitle(listing)} hero image`} /></TableCell>
                          <TableCell className="font-mono text-muted-foreground">{listing.listingId}</TableCell>
                          <TableCell className="font-medium">{getListingDisplayTitle(listing)}</TableCell>
                          <TableCell><Badge variant={isListingAvailable(listing) ? 'default' : 'outline'}>{getListingAvailability(listing)}</Badge></TableCell>
                          <TableCell>{listing.projectName}</TableCell>
                          <TableCell>{listing.propertyType}</TableCell>
                          <TableCell>{listing.location}</TableCell>
                          <TableCell>{listing.bhkConfiguration}</TableCell>
                          <TableCell>{listing.carpetArea?.toLocaleString('en-IN')}</TableCell>
                          <TableCell>{listing.builtUpArea?.toLocaleString('en-IN')}</TableCell>
                          <TableCell><Badge variant="outline">{listing.projectStatus}</Badge></TableCell>
                          <TableCell>{formatListingPrice(listing)}</TableCell>
                          <TableCell>{listing.priceOnRequest ? '-' : listing.pricePerSqFt?.toLocaleString('en-IN')}</TableCell>
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleContactMatch(listing)}
                                disabled={!isListingAvailable(listing)}
                                aria-label={`Find matching contacts for ${listing.listingName}`}
                                title="Find matching contacts"
                              >
                                <Sparkles className="h-4 w-4 text-primary" />
                              </Button>
                              <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(listing)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicate(listing)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExportInternalPdf(listing)}><FileText className="mr-2 h-4 w-4" /> Internal PDF</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExportExternalPdf(listing)}><FileText className="mr-2 h-4 w-4" /> Client PDF</DropdownMenuItem>
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
          sortedListings.length === 0 ? (
            <div className="border py-12 text-center text-sm text-muted-foreground">
              No listings match these filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {sortedListings.map(listing => (
              <ListingCard 
                key={listing.id}
                listing={listing}
                isSelected={selectedListings.includes(listing.id)}
                onSelect={handleSelectListing}
                onView={handleView}
                onMatch={handleContactMatch}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onExportInternalPdf={handleExportInternalPdf}
                onExportExternalPdf={handleExportExternalPdf}
                onDelete={handleDelete}
              />
              ))}
            </div>
          )
        )}
      
      <ListingForm isOpen={isFormOpen} onOpenChange={setFormOpen} listing={editingListing} />
      {viewingListing && <ListingViewDialog isOpen={isViewOpen} onOpenChange={setViewOpen} listing={viewingListing} onDuplicate={handleDuplicate} onExportInternalPdf={handleExportInternalPdf} onExportExternalPdf={handleExportExternalPdf} />}
      {matchingListing && <ContactMatchDialog isOpen={isContactMatchOpen} onOpenChange={setContactMatchOpen} listingId={matchingListing.id} />}
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
