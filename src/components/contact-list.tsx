
'use client';

import * as React from 'react';
import { leadStageOptions, type Contact, type LeadStage, type Listing } from '@/lib/types';
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
import { ContactForm } from '@/components/contact-form';
import {
  Mail,
  MoreHorizontal,
  PlusCircle,
  ArrowUpDown,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  MessageSquareText,
  Search,
  Eye,
  Upload,
  Sparkles,
  GripVertical,
  CalendarClock,
} from 'lucide-react';
import { deleteContact, updateContactLeadStage } from '@/app/actions';
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
import { Input } from './ui/input';
import { ContactViewDialog } from './contact-view-dialog';
import { useRouter } from 'next/navigation';
import { BulkContactUploadDialog } from './bulk-contact-upload-dialog';
import { cn } from '@/lib/utils';
import { ContactWhatsAppDialog } from './contact-whatsapp-dialog';
import { getContactLeadStage } from '@/lib/crm-status';
import { LeadStageBadge } from './lead-stage-badge';
import { PropertyMatchDialog } from './property-match-dialog';
import { RefreshButton } from './refresh-button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { SiteVisitFormDialog } from './site-visit-form-dialog';

type SortKey = keyof Pick<Contact, 'serialNumber' | 'name' | 'leadStage' | 'budget' | 'city' | 'locationPreference' | 'createdAt' | 'updatedAt' | 'propertyPreference' | 'contactType' | 'isActive'>;
type ContactDashboardTab = 'Buyer' | 'Seller';
type ContactListActions = 'view' | 'match' | 'visit' | 'whatsapp' | 'email' | 'edit' | 'delete';
type BuyerViewMode = 'table' | 'pipeline';

const CONTACT_NAME_LIMIT = 16;

const budgetOrder: Record<Contact['budget'], number> = {
  "<1": 1, "1-3": 2, "3-6": 3, "6-10": 4, "10-20": 5, "20-30": 6, ">30": 7
};

const includesSearch = (value: unknown, query: string) => {
  const searchableValue = Array.isArray(value) ? value.join(' ') : value;
  return String(searchableValue ?? '').toLowerCase().includes(query);
};
const truncateText = (value = '', maxLength = CONTACT_NAME_LIMIT) => (
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
);
const contactSurfaceClass = (contact: Contact) => {
  if (contact.isActive === false) return 'bg-destructive/10';
  if (contact.contactType === 'Seller') return 'bg-muted/40';
  return 'bg-card';
};
const contactRowClass = (contact: Contact) => {
  if (contact.isActive === false) return 'bg-destructive/10 text-destructive-foreground hover:bg-destructive/20';
  if (contact.contactType === 'Seller') return 'bg-muted/40 hover:bg-muted/60';
  return 'bg-card hover:bg-muted/50';
};
const stickyNameCellClass = (contact: Contact, className = '') => cn('sticky left-0 z-[1]', contactSurfaceClass(contact), className);
const stickyNameHeaderClass = (className = '') => cn('sticky left-0 z-20 bg-card', className);

export function ContactList({ initialContacts, allListings }: { initialContacts: Contact[], allListings: Listing[] }) {
  const [contacts, setContacts] = React.useState(initialContacts);
  const [sortKey, setSortKey] = React.useState<SortKey>('serialNumber');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stageFilter, setStageFilter] = React.useState<'All' | LeadStage>('All');
  const [activeTab, setActiveTab] = React.useState<ContactDashboardTab>('Buyer');
  const [buyerViewMode, setBuyerViewMode] = React.useState<BuyerViewMode>('table');
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [isViewOpen, setViewOpen] = React.useState(false);
  const [isBulkUploadOpen, setBulkUploadOpen] = React.useState(false);
  const [isWhatsAppOpen, setWhatsAppOpen] = React.useState(false);
  const [isPropertyMatchOpen, setPropertyMatchOpen] = React.useState(false);
  const [isSiteVisitOpen, setSiteVisitOpen] = React.useState(false);
  const [activeContact, setActiveContact] = React.useState<Contact | null>(null);
  const [matchingContact, setMatchingContact] = React.useState<Contact | null>(null);
  const [siteVisitContact, setSiteVisitContact] = React.useState<Contact | null>(null);
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = React.useState<Contact | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [updatingStageIds, setUpdatingStageIds] = React.useState<Set<string>>(new Set());
  const [draggingContactId, setDraggingContactId] = React.useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = React.useState<LeadStage | null>(null);
  const [isClient, setIsClient] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    setContacts(initialContacts);
  }, [initialContacts]);

  const { toast } = useToast();

  const buyerCount = React.useMemo(
    () => contacts.filter((contact) => contact.contactType !== 'Seller').length,
    [contacts]
  );
  const sellerCount = React.useMemo(
    () => contacts.filter((contact) => contact.contactType === 'Seller').length,
    [contacts]
  );
  const newContactInitialValues = React.useMemo(
    () => ({ contactType: activeTab }),
    [activeTab]
  );

  const handleTabChange = (value: string) => {
    const nextTab = value as ContactDashboardTab;
    setActiveTab(nextTab);
    setStageFilter('All');
    if (nextTab === 'Seller') setBuyerViewMode('table');
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };
  
  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleView = (contact: Contact) => {
    setViewingContact(contact);
    setViewOpen(true);
  };

  const handleWhatsApp = (contact: Contact) => {
    setActiveContact(contact);
    setWhatsAppOpen(true);
  };

  const handlePropertyMatch = (contact: Contact) => {
    setMatchingContact(contact);
    setPropertyMatchOpen(true);
  };

  const handleSiteVisit = (contact: Contact) => {
    setSiteVisitContact(contact);
    setSiteVisitOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteContact(id);
      if (result.success) {
        setContacts((current) => current.filter((contact) => contact.id !== id));
        toast({ title: "Success", description: "Contact deleted successfully." });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error, variant: 'destructive' });
      }
    });
  };

  const handleSaved = (savedContact: Contact) => {
    setContacts((current) => {
      const exists = current.some((contact) => contact.id === savedContact.id);
      return exists
        ? current.map((contact) => contact.id === savedContact.id ? savedContact : contact)
        : [savedContact, ...current];
    });
    setEditingContact(savedContact);
    setViewingContact((current) => current?.id === savedContact.id ? savedContact : current);
    setActiveContact((current) => current?.id === savedContact.id ? savedContact : current);
    setMatchingContact((current) => current?.id === savedContact.id ? savedContact : current);
    setSiteVisitContact((current) => current?.id === savedContact.id ? savedContact : current);
  };

  const updateContactInState = React.useCallback((updatedContact: Contact) => {
    setContacts((current) => current.map((contact) => contact.id === updatedContact.id ? updatedContact : contact));
    setEditingContact((current) => current?.id === updatedContact.id ? updatedContact : current);
    setViewingContact((current) => current?.id === updatedContact.id ? updatedContact : current);
    setActiveContact((current) => current?.id === updatedContact.id ? updatedContact : current);
    setMatchingContact((current) => current?.id === updatedContact.id ? updatedContact : current);
    setSiteVisitContact((current) => current?.id === updatedContact.id ? updatedContact : current);
  }, []);

  const handleLeadStageChange = React.useCallback(async (contact: Contact, nextStage: LeadStage) => {
    const previousStage = getContactLeadStage(contact);
    if (previousStage === nextStage || updatingStageIds.has(contact.id)) return;

    const optimisticContact = { ...contact, leadStage: nextStage, updatedAt: new Date().toISOString() };
    updateContactInState(optimisticContact);
    setUpdatingStageIds((current) => new Set(current).add(contact.id));

    const result = await updateContactLeadStage(contact.id, nextStage);
    setUpdatingStageIds((current) => {
      const next = new Set(current);
      next.delete(contact.id);
      return next;
    });

    if (result.success && result.contact) {
      updateContactInState(result.contact);
      toast({
        title: 'Pipeline updated',
        description: `${contact.name} moved to ${nextStage}.`,
      });
      router.refresh();
      return;
    }

    updateContactInState({ ...contact, leadStage: previousStage });
    toast({
      title: 'Pipeline update failed',
      description: result.error || 'Please try again.',
      variant: 'destructive',
    });
  }, [router, toast, updateContactInState, updatingStageIds]);

  const sortedContacts = React.useMemo(() => {
    return [...contacts].filter(contact => {
      const query = searchQuery.trim().toLowerCase();
      const matchesTab = activeTab === 'Buyer'
        ? contact.contactType !== 'Seller'
        : contact.contactType === 'Seller';
      const matchesSearch = (
        includesSearch(contact.name, query) ||
        includesSearch(contact.email, query) ||
        includesSearch(contact.phone, query) ||
        includesSearch(getContactLeadStage(contact), query) ||
        includesSearch(contact.locationPreference, query) ||
        includesSearch(contact.city, query) ||
        includesSearch(contact.requirementPurpose, query)
      );
      const matchesStage = activeTab === 'Seller'
        || stageFilter === 'All'
        || (contact.contactType === 'Buyer' && getContactLeadStage(contact) === stageFilter);
      return matchesTab && matchesSearch && matchesStage;
    }).sort((a, b) => {
      let aValue: any, bValue: any;

      if(sortKey === 'budget') { aValue = budgetOrder[a.budget]; bValue = budgetOrder[b.budget]; } 
      else if (sortKey === 'leadStage') { aValue = getContactLeadStage(a); bValue = getContactLeadStage(b); }
      else if (sortKey === 'serialNumber') {
        aValue = Number.parseInt(String(a.serialNumber ?? '').replace(/\D/g, ''), 10) || 0;
        bValue = Number.parseInt(String(b.serialNumber ?? '').replace(/\D/g, ''), 10) || 0;
      }
      else if (sortKey === 'createdAt' || sortKey === 'updatedAt') { aValue = new Date(a[sortKey]).getTime(); bValue = new Date(b[sortKey]).getTime(); }
      else if (sortKey === 'isActive') {
        aValue = a.isActive ?? true;
        bValue = b.isActive ?? true;
      }
      else { aValue = a[sortKey]; bValue = b[sortKey]; }
      
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeTab, contacts, sortKey, sortOrder, searchQuery, stageFilter]);

  const searchedBuyerContacts = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (contact.contactType === 'Seller') return false;
      return (
        includesSearch(contact.name, query) ||
        includesSearch(contact.email, query) ||
        includesSearch(contact.phone, query) ||
        includesSearch(getContactLeadStage(contact), query) ||
        includesSearch(contact.locationPreference, query) ||
        includesSearch(contact.city, query) ||
        includesSearch(contact.requirementPurpose, query)
      );
    });
  }, [contacts, searchQuery]);

  const pipelineContactsByStage = React.useMemo(() => {
    const grouped = leadStageOptions.reduce((acc, stage) => {
      acc[stage] = [];
      return acc;
    }, {} as Record<LeadStage, Contact[]>);
    searchedBuyerContacts.forEach((contact) => grouped[getContactLeadStage(contact)].push(contact));
    return grouped;
  }, [searchedBuyerContacts]);

  const pipelineCounts = React.useMemo(() => {
    const counts = Object.fromEntries(leadStageOptions.map((stage) => [stage, 0])) as Record<LeadStage, number>;
    contacts.forEach((contact) => {
      if (contact.contactType === 'Buyer') counts[getContactLeadStage(contact)] += 1;
    });
    return counts;
  }, [contacts]);
  
  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const renderPipelineSelect = (contact: Contact, triggerClassName?: string) => (
    <Select
      value={getContactLeadStage(contact)}
      onValueChange={(value) => handleLeadStageChange(contact, value as LeadStage)}
      disabled={updatingStageIds.has(contact.id)}
    >
      <SelectTrigger
        className={cn('h-8 min-w-[138px] bg-background text-xs', triggerClassName)}
        aria-label={`Change pipeline stage for ${contact.name}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {leadStageOptions.map((stage) => (
          <SelectItem key={stage} value={stage}>{stage}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const handlePipelineDrop = (stage: LeadStage, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const contactId = event.dataTransfer.getData('text/contact-id') || draggingContactId;
    const contact = contacts.find((item) => item.id === contactId);
    setDraggingContactId(null);
    setDragOverStage(null);
    if (contact) void handleLeadStageChange(contact, stage);
  };

  const renderPipelineCard = (contact: Contact) => (
    <article
      key={contact.id}
      draggable={!updatingStageIds.has(contact.id)}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/contact-id', contact.id);
        event.dataTransfer.effectAllowed = 'move';
        setDraggingContactId(contact.id);
      }}
      onDragEnd={() => {
        setDraggingContactId(null);
        setDragOverStage(null);
      }}
      className={cn(
        'rounded-md border bg-card p-3 shadow-sm transition hover:border-primary/40',
        draggingContactId === contact.id && 'opacity-50',
        updatingStageIds.has(contact.id) && 'pointer-events-none opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => handleView(contact)}
            className="block max-w-full truncate text-left text-sm font-semibold hover:text-primary"
            title={contact.name}
          >
            {truncateText(contact.name, 22)}
          </button>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{contact.serialNumber}</p>
        </div>
        <GripVertical className="mt-0.5 hidden h-4 w-4 shrink-0 text-muted-foreground md:block" aria-hidden="true" />
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Budget</span>
          <span className="font-medium">{contact.budget} Cr</span>
        </div>
        <div>
          <p className="text-muted-foreground">Location</p>
          <p className="mt-0.5 line-clamp-2">{contact.locationPreference || contact.city || '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Property type</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {contact.propertyPreference?.length
              ? contact.propertyPreference.slice(0, 2).map((pref) => <Badge key={pref} variant="secondary" className="text-[10px]">{pref}</Badge>)
              : <span>—</span>}
            {(contact.propertyPreference?.length || 0) > 2 && <Badge variant="outline" className="text-[10px]">+{(contact.propertyPreference?.length || 0) - 2}</Badge>}
          </div>
        </div>
      </div>

      <div className="mt-3">
        {renderPipelineSelect(contact, 'w-full')}
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-2">
        {renderContactActions(contact, ['view', 'match', 'visit', 'whatsapp'])}
      </div>
    </article>
  );

  const renderPipelineBoard = () => (
    <section className="rounded-xl border bg-muted/20 p-3 shadow-sm" aria-label="Buyer pipeline board">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {leadStageOptions.map((stage) => {
          const stageContacts = pipelineContactsByStage[stage];
          return (
            <div
              key={stage}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (dragOverStage !== stage) setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage((current) => current === stage ? null : current)}
              onDrop={(event) => handlePipelineDrop(stage, event)}
              className={cn(
                'flex max-h-[calc(100vh-19rem)] min-h-[360px] w-[278px] shrink-0 flex-col rounded-lg border bg-background transition-colors',
                dragOverStage === stage && 'border-primary bg-primary/5'
              )}
            >
              <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b bg-background/95 p-4 backdrop-blur">
                <LeadStageBadge stage={stage} className="px-3 py-1.5 text-sm" />
                <Badge variant="secondary" className="h-7 min-w-7 justify-center rounded-md px-2 text-sm font-semibold">
                  {stageContacts.length}
                </Badge>
              </div>
              <div className="space-y-2 overflow-y-auto p-2">
                {stageContacts.length
                  ? stageContacts.map(renderPipelineCard)
                  : (
                    <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                      Drop contacts here
                    </div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  const renderContactActions = (contact: Contact, visibleActions: ContactListActions[] = ['view', 'match', 'whatsapp']) => (
    <div className="flex items-center justify-start gap-1">
      {visibleActions.includes('view') && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(contact)} aria-label={`View ${contact.name}`}>
          <Eye className="h-4 w-4"/>
        </Button>
      )}
      {visibleActions.includes('match') && contact.contactType === 'Buyer' && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePropertyMatch(contact)} aria-label={`Find matching properties for ${contact.name}`} title="Find matching properties">
          <Sparkles className="h-4 w-4 text-primary" />
        </Button>
      )}
      {visibleActions.includes('visit') && contact.contactType === 'Buyer' && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSiteVisit(contact)} aria-label={`Log site visit for ${contact.name}`} title="Log site visit">
          <CalendarClock className="h-4 w-4 text-amber-600" />
        </Button>
      )}
      {visibleActions.includes('whatsapp') && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleWhatsApp(contact)} aria-label={`Create WhatsApp draft for ${contact.name}`}>
          <MessageSquareText className="h-4 w-4 text-emerald-600"/>
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`More actions for ${contact.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {contact.email ? (
            <DropdownMenuItem asChild><a href={`mailto:${contact.email}`}><Mail className="mr-2 h-4 w-4" /> Send Email</a></DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled><Mail className="mr-2 h-4 w-4" /> Send Email</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => handleEdit(contact)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
          <AlertDialog>
            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the contact for {contact.name}.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDelete(contact.id)} disabled={isPending}>{isPending ? 'Deleting...' : 'Delete'}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-6">
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
                <h2 className="text-3xl font-bold tracking-tight flex-1">Contacts Dashboard</h2>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder={`Search ${activeTab.toLowerCase()}s...`}
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <RefreshButton className="w-full md:w-auto" />
            </div>
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => setBulkUploadOpen(true)} variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Upload
                </Button>
                <Button onClick={handleAddNew} variant="default" className="shadow-sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Contact
                </Button>
            </div>
        </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 md:w-[360px]">
          <TabsTrigger value="Buyer" className="gap-2">
            Buyers <Badge variant="secondary">{buyerCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="Seller" className="gap-2">
            Sellers <Badge variant="secondary">{sellerCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'Buyer' && (
        <Tabs value={buyerViewMode} onValueChange={(value) => {
          setBuyerViewMode(value as BuyerViewMode);
          setStageFilter('All');
        }}>
          <TabsList className="grid w-full grid-cols-2 md:w-[280px]">
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {activeTab === 'Buyer' && buyerViewMode === 'table' && (
      <section aria-label="Buyer lead pipeline" className="border-y bg-muted/20 py-3">
        <div className="flex gap-2 overflow-x-auto px-1 pb-1">
          <Button
            type="button"
            size="sm"
            variant={stageFilter === 'All' ? 'default' : 'outline'}
            onClick={() => setStageFilter('All')}
            className="shrink-0"
          >
            All Buyers <Badge variant="secondary" className="ml-2">{buyerCount}</Badge>
          </Button>
          {leadStageOptions.map((stage) => (
            <Button
              key={stage}
              type="button"
              size="sm"
              variant={stageFilter === stage ? 'default' : 'outline'}
              onClick={() => setStageFilter(stage)}
              className="shrink-0"
            >
              {stage} <Badge variant="secondary" className="ml-2">{pipelineCounts[stage]}</Badge>
            </Button>
          ))}
        </div>
      </section>
      )}

      {activeTab === 'Buyer' && buyerViewMode === 'pipeline' ? (
        renderPipelineBoard()
      ) : (
      <>
      <div className="space-y-3 md:hidden">
        {isClient && sortedContacts.map((contact) => (
          <article key={contact.id} className={cn(
            'rounded-md border p-4',
            contact.contactType === 'Seller' ? 'bg-muted/40' : 'bg-card',
            contact.isActive === false && 'border-destructive/30 bg-destructive/5',
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="max-w-[190px] truncate font-semibold" title={contact.name}>{truncateText(contact.name)}</h3>
                  {contact.contactType === 'Buyer' && <LeadStageBadge stage={getContactLeadStage(contact)} />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{contact.serialNumber}</p>
              </div>
              {contact.contactType === 'Buyer' && <span className="shrink-0 text-sm font-medium">{contact.budget} Cr</span>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {contact.contactType === 'Buyer' ? (
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p>{contact.budget} Cr</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground">Linked listings</p>
                  <p>{contact.offeredListings?.length || 0}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">City</p>
                <p>{contact.city || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Location preference</p>
                <p>{contact.locationPreference || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Property type</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {contact.propertyPreference?.length
                    ? contact.propertyPreference.map(pref => <Badge key={pref} variant="secondary">{pref}</Badge>)
                    : <span>—</span>}
                </div>
              </div>
              {contact.contactType === 'Buyer' && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Pipeline</p>
                  <div className="mt-1">{renderPipelineSelect(contact, 'w-full')}</div>
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center gap-1 border-t pt-3">
              {renderContactActions(contact, contact.contactType === 'Buyer' ? ['view', 'match', 'visit', 'whatsapp'] : ['view', 'whatsapp'])}
            </div>
          </article>
        ))}
        {isClient && sortedContacts.length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No {activeTab.toLowerCase()} contacts found.
          </div>
        )}
      </div>

      <div className="hidden rounded-xl border bg-card text-card-foreground shadow md:block">
        <div className="relative max-h-[calc(100vh-22rem)] overflow-auto">
          <Table className={cn('table-fixed', activeTab === 'Buyer' ? 'min-w-[960px]' : 'min-w-[820px]')}>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead onClick={() => handleSort('name')} className={stickyNameHeaderClass('w-[150px] min-w-[150px] max-w-[150px] cursor-pointer transition-colors hover:bg-muted/50')}><div className="flex items-center">Name {getSortIcon('name')}</div></TableHead>
                <TableHead onClick={() => handleSort('serialNumber')} className="w-[104px] min-w-[104px] cursor-pointer transition-colors hover:bg-muted/50"><div className="flex items-center">Serial No. {getSortIcon('serialNumber')}</div></TableHead>
                {activeTab === 'Buyer' && (
                  <>
                    <TableHead onClick={() => handleSort('leadStage')} className="w-[144px] min-w-[144px] cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Pipeline {getSortIcon('leadStage')}</div></TableHead>
                    <TableHead onClick={() => handleSort('budget')} className="w-[136px] min-w-[136px] cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Budget (Crores) {getSortIcon('budget')}</div></TableHead>
                  </>
                )}
                <TableHead onClick={() => handleSort('city')} className="w-[120px] min-w-[120px] cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">City {getSortIcon('city')}</div></TableHead>
                <TableHead onClick={() => handleSort('locationPreference')} className="min-w-[190px] cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">{activeTab === 'Buyer' ? 'Location Preference' : 'Area / Location'} {getSortIcon('locationPreference')}</div></TableHead>
                <TableHead className="min-w-[176px]"><div className="flex items-center">Property Type</div></TableHead>
                {activeTab === 'Seller' && <TableHead className="w-[128px] min-w-[128px]">Linked Listings</TableHead>}
                <TableHead className="w-[176px] min-w-[176px] text-left">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isClient && sortedContacts.map(contact => (
                <TableRow key={contact.id} className={contactRowClass(contact)}>
                    <TableCell className={stickyNameCellClass(contact, 'w-[150px] min-w-[150px] max-w-[150px] font-medium')}>
                      <span className="block truncate" title={contact.name}>{truncateText(contact.name)}</span>
                    </TableCell>
                    <TableCell className="w-[104px] min-w-[104px] font-mono text-muted-foreground">{contact.serialNumber}</TableCell>
                    {activeTab === 'Buyer' && (
                      <>
                        <TableCell>{renderPipelineSelect(contact)}</TableCell>
                        <TableCell>{contact.budget}</TableCell>
                      </>
                    )}
                    <TableCell>{contact.city}</TableCell>
                    <TableCell>{contact.locationPreference}</TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {contact.propertyPreference?.map(pref => <Badge key={pref} variant="secondary">{pref}</Badge>)}
                        </div>
                    </TableCell>
                    {activeTab === 'Seller' && <TableCell>{contact.offeredListings?.length || 0}</TableCell>}
                    <TableCell className="w-[176px] min-w-[176px]">
                      {renderContactActions(contact, activeTab === 'Buyer' ? ['view', 'match', 'visit', 'whatsapp'] : ['view', 'whatsapp'])}
                    </TableCell>
                </TableRow>
                ))}
                {isClient && sortedContacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={activeTab === 'Buyer' ? 8 : 7} className="h-24 text-center text-muted-foreground">
                      No {activeTab.toLowerCase()} contacts found.
                    </TableCell>
                  </TableRow>
                )}
                {!isClient && (
                    Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="sticky left-0 bg-card"><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-10"/></TableCell>
                            {activeTab === 'Buyer' && (
                              <>
                                <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                                <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                              </>
                            )}
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            {activeTab === 'Seller' && <TableCell><Skeleton className="h-5 w-10"/></TableCell>}
                            <TableCell><div className="flex justify-start gap-2"><Skeleton className="h-8 w-8"/><Skeleton className="h-8 w-8"/><Skeleton className="h-8 w-8"/></div></TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
          </Table>
        </div>
      </div>
      </>
      )}
      
      <ContactForm isOpen={isFormOpen} onOpenChange={setFormOpen} contact={editingContact} allContacts={contacts} allListings={allListings} onSaved={handleSaved} initialValues={newContactInitialValues} />
      {viewingContact && <ContactViewDialog isOpen={isViewOpen} onOpenChange={setViewOpen} contact={viewingContact} allListings={allListings} />}
      {activeContact && <ContactWhatsAppDialog isOpen={isWhatsAppOpen} onOpenChange={setWhatsAppOpen} contact={activeContact} listings={allListings} />}
      {matchingContact && <PropertyMatchDialog isOpen={isPropertyMatchOpen} onOpenChange={setPropertyMatchOpen} contact={matchingContact} allListings={allListings} />}
      {siteVisitContact && (
        <SiteVisitFormDialog
          isOpen={isSiteVisitOpen}
          onOpenChange={setSiteVisitOpen}
          contacts={contacts}
          listings={allListings}
          initialContactId={siteVisitContact.id}
          onSaved={(_, updatedContact) => {
            if (updatedContact) updateContactInState(updatedContact);
          }}
        />
      )}
      <BulkContactUploadDialog isOpen={isBulkUploadOpen} onOpenChange={setBulkUploadOpen} />
    </div>
  );
}

    
