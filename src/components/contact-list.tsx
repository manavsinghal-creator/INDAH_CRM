
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
} from 'lucide-react';
import { deleteContact } from '@/app/actions';
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
import { format } from 'date-fns';
import { Input } from './ui/input';
import { ContactViewDialog } from './contact-view-dialog';
import { useRouter } from 'next/navigation';
import { BulkContactUploadDialog } from './bulk-contact-upload-dialog';
import { cn } from '@/lib/utils';
import { ContactWhatsAppDialog } from './contact-whatsapp-dialog';
import { getContactLeadStage } from '@/lib/crm-status';

type SortKey = keyof Pick<Contact, 'serialNumber' | 'name' | 'status' | 'leadStage' | 'budget' | 'city' | 'locationPreference' | 'createdAt' | 'updatedAt' | 'propertyPreference' | 'contactType' | 'referenceContact' | 'isActive' | 'createdByName'>;

const budgetOrder: Record<Contact['budget'], number> = {
  "<1": 1, "1-3": 2, "3-6": 3, "6-10": 4, ">10": 5
};

const statusOrder: Record<Contact['status'], number> = { "Cold": 1, "Warm": 2, "Hot": 3 };

const contactCreatorName = (contact: Contact) => contact.createdByName || 'Admin';
const contactCreatorEmail = (contact: Contact) => contact.createdByEmail || 'manavsinghal@gmail.com';

export function ContactList({ initialContacts, allListings }: { initialContacts: Contact[], allListings: Listing[] }) {
  const [sortKey, setSortKey] = React.useState<SortKey>('serialNumber');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stageFilter, setStageFilter] = React.useState<'All' | LeadStage>('All');
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [isViewOpen, setViewOpen] = React.useState(false);
  const [isBulkUploadOpen, setBulkUploadOpen] = React.useState(false);
  const [isWhatsAppOpen, setWhatsAppOpen] = React.useState(false);
  const [activeContact, setActiveContact] = React.useState<Contact | null>(null);
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = React.useState<Contact | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [isClient, setIsClient] = React.useState(false);
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
  
  const handleAddNew = () => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteContact(id);
      if (result.success) {
        toast({ title: "Success", description: "Contact deleted successfully." });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error, variant: 'destructive' });
      }
    });
  };

  const sortedContacts = React.useMemo(() => {
    return [...initialContacts].filter(contact => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        contact.name.toLowerCase().includes(query) ||
        (contact.email && contact.email.toLowerCase().includes(query)) ||
        contact.phone.includes(query) ||
        contact.status.toLowerCase().includes(query) ||
        getContactLeadStage(contact).toLowerCase().includes(query) ||
        contact.locationPreference?.toLowerCase().includes(query) ||
        contact.serialNumber.toLowerCase().includes(query) ||
        contact.city?.toLowerCase().includes(query) ||
        contact.contactType?.toLowerCase().includes(query) ||
        contactCreatorName(contact).toLowerCase().includes(query) ||
        contactCreatorEmail(contact).toLowerCase().includes(query) ||
        contact.referenceContact?.toLowerCase().includes(query) ||
        contact.propertyPreference?.join(' ').toLowerCase().includes(query)
      );
      const matchesStage = stageFilter === 'All'
        || (contact.contactType === 'Buyer' && getContactLeadStage(contact) === stageFilter);
      return matchesSearch && matchesStage;
    }).sort((a, b) => {
      let aValue: any, bValue: any;

      if(sortKey === 'budget') { aValue = budgetOrder[a.budget]; bValue = budgetOrder[b.budget]; } 
      else if (sortKey === 'status') { aValue = statusOrder[a.status]; bValue = statusOrder[b.status]; } 
      else if (sortKey === 'leadStage') { aValue = getContactLeadStage(a); bValue = getContactLeadStage(b); }
      else if (sortKey === 'serialNumber') { aValue = parseInt(a.serialNumber.substring(1)); bValue = parseInt(b.serialNumber.substring(1)); } 
      else if (sortKey === 'createdAt' || sortKey === 'updatedAt') { aValue = new Date(a[sortKey]).getTime(); bValue = new Date(b[sortKey]).getTime(); }
      else if (sortKey === 'isActive') {
        aValue = a.isActive ?? true;
        bValue = b.isActive ?? true;
      }
      else if (sortKey === 'createdByName') {
        aValue = contactCreatorName(a);
        bValue = contactCreatorName(b);
      }
      else { aValue = a[sortKey]; bValue = b[sortKey]; }
      
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [initialContacts, sortKey, sortOrder, searchQuery, stageFilter]);

  const pipelineCounts = React.useMemo(() => {
    const counts = Object.fromEntries(leadStageOptions.map((stage) => [stage, 0])) as Record<LeadStage, number>;
    initialContacts.forEach((contact) => {
      if (contact.contactType === 'Buyer') counts[getContactLeadStage(contact)] += 1;
    });
    return counts;
  }, [initialContacts]);
  
  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
                <h2 className="text-3xl font-bold tracking-tight flex-1">Contacts Dashboard</h2>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search contacts..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
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

      <section aria-label="Buyer lead pipeline" className="border-y bg-muted/20 py-3">
        <div className="flex gap-2 overflow-x-auto px-1 pb-1">
          <Button
            type="button"
            size="sm"
            variant={stageFilter === 'All' ? 'default' : 'outline'}
            onClick={() => setStageFilter('All')}
            className="shrink-0"
          >
            All Contacts <Badge variant="secondary" className="ml-2">{initialContacts.length}</Badge>
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

      <div className="space-y-3 md:hidden">
        {isClient && sortedContacts.map((contact) => (
          <article key={contact.id} className={cn(
            'rounded-md border bg-card p-4',
            contact.isActive === false && 'border-destructive/30 bg-destructive/5',
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{contact.name}</h3>
                  <Badge variant={contact.status.toLowerCase() as "hot" | "warm" | "cold"}>{contact.status}</Badge>
                  {contact.contactType === 'Buyer' && <Badge variant="outline">{getContactLeadStage(contact)}</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{contact.serialNumber}</p>
              </div>
              <span className="shrink-0 text-sm font-medium">{contact.budget} Cr</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p>{contact.contactType || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">City</p>
                <p>{contact.city || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Location preference</p>
                <p>{contact.locationPreference || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Added by</p>
                <p>{contactCreatorName(contact)}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 border-t pt-3">
              <Button variant="ghost" size="icon" onClick={() => handleView(contact)} aria-label={`View ${contact.name}`}>
                <Eye className="h-4 w-4"/>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleWhatsApp(contact)} aria-label={`Create WhatsApp draft for ${contact.name}`}>
                <MessageSquareText className="h-4 w-4 text-emerald-600"/>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href={`mailto:${contact.email}`} aria-label={`Email ${contact.name}`}><Mail className="h-4 w-4" /></a>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(contact)} aria-label={`Edit ${contact.name}`}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-auto text-destructive" aria-label={`Delete ${contact.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
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
            </div>
          </article>
        ))}
      </div>

      <div className="hidden rounded-xl border bg-card text-card-foreground shadow md:block">
        <div className="relative max-h-[calc(100vh-22rem)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead onClick={() => handleSort('serialNumber')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors w-[100px]"><div className="flex items-center">Serial No. {getSortIcon('serialNumber')}</div></TableHead>
                <TableHead onClick={() => handleSort('name')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Name {getSortIcon('name')}</div></TableHead>
                <TableHead onClick={() => handleSort('status')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors w-[120px]"><div className="flex items-center">Status {getSortIcon('status')}</div></TableHead>
                <TableHead onClick={() => handleSort('leadStage')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Pipeline {getSortIcon('leadStage')}</div></TableHead>
                <TableHead onClick={() => handleSort('budget')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Budget (Crores) {getSortIcon('budget')}</div></TableHead>
                <TableHead onClick={() => handleSort('city')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">City {getSortIcon('city')}</div></TableHead>
                <TableHead onClick={() => handleSort('contactType')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Contact Type {getSortIcon('contactType')}</div></TableHead>
                <TableHead onClick={() => handleSort('locationPreference')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Location Preference {getSortIcon('locationPreference')}</div></TableHead>
                <TableHead onClick={() => handleSort('referenceContact')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Reference {getSortIcon('referenceContact')}</div></TableHead>
                <TableHead className="sticky top-0 bg-card"><div className="flex items-center">Property Preference</div></TableHead>
                <TableHead onClick={() => handleSort('createdByName')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Added By {getSortIcon('createdByName')}</div></TableHead>
                <TableHead onClick={() => handleSort('updatedAt')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors w-[150px]"><div className="flex items-center">Last Updated {getSortIcon('updatedAt')}</div></TableHead>
                <TableHead className="sticky top-0 bg-card text-right w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isClient && sortedContacts.map(contact => (
                <TableRow key={contact.id} className={cn(
                    (contact.isActive === false) && 'bg-destructive/10 text-destructive-foreground hover:bg-destructive/20',
                )}>
                    <TableCell className="font-mono text-muted-foreground">{contact.serialNumber}</TableCell>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell><Badge variant={contact.status.toLowerCase() as "hot" | "warm" | "cold"}>{contact.status}</Badge></TableCell>
                    <TableCell>{contact.contactType === 'Buyer' ? <Badge variant="outline">{getContactLeadStage(contact)}</Badge> : '—'}</TableCell>
                    <TableCell>{contact.budget}</TableCell>
                    <TableCell>{contact.city}</TableCell>
                    <TableCell>{contact.contactType}</TableCell>
                    <TableCell>{contact.locationPreference}</TableCell>
                    <TableCell>{contact.referenceContact}</TableCell>
                    <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {contact.propertyPreference?.map(pref => <Badge key={pref} variant="secondary">{pref}</Badge>)}
                        </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{contactCreatorName(contact)}</p>
                      <p className="text-xs text-muted-foreground">{contactCreatorEmail(contact)}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{format(new Date(contact.updatedAt), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(contact)} aria-label="View Contact">
                        <Eye className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleWhatsApp(contact)} aria-label={`Create WhatsApp draft for ${contact.name}`}>
                        <MessageSquareText className="h-4 w-4 text-emerald-600"/>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                        <a href={`mailto:${contact.email}`} aria-label="Send email"><Mail className="h-4 w-4" /></a>
                        </Button>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                    </TableCell>
                </TableRow>
                ))}
                {!isClient && (
                    Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-10"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-20"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                            <TableCell><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8"/><Skeleton className="h-8 w-8"/></div></TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <ContactForm isOpen={isFormOpen} onOpenChange={setFormOpen} contact={editingContact} allContacts={initialContacts} allListings={allListings} />
      {viewingContact && <ContactViewDialog isOpen={isViewOpen} onOpenChange={setViewOpen} contact={viewingContact} allListings={allListings} />}
      {activeContact && <ContactWhatsAppDialog isOpen={isWhatsAppOpen} onOpenChange={setWhatsAppOpen} contact={activeContact} listings={allListings} />}
      <BulkContactUploadDialog isOpen={isBulkUploadOpen} onOpenChange={setBulkUploadOpen} />
    </div>
  );
}

    
