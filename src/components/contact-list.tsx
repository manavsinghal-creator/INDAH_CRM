
'use client';

import * as React from 'react';
import type { Contact, Listing } from '@/lib/types';
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

type SortKey = keyof Pick<Contact, 'serialNumber' | 'name' | 'status' | 'budget' | 'city' | 'locationPreference' | 'createdAt' | 'updatedAt' | 'propertyPreference' | 'contactType' | 'referenceContact' | 'isActive'>;

const budgetOrder: Record<Contact['budget'], number> = {
  "<1": 1, "1-3": 2, "3-6": 3, "6-10": 4, ">10": 5
};

const statusOrder: Record<Contact['status'], number> = { "Cold": 1, "Warm": 2, "Hot": 3 };

export function ContactList({ initialContacts, allListings }: { initialContacts: Contact[], allListings: Listing[] }) {
  const [sortKey, setSortKey] = React.useState<SortKey>('serialNumber');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [isViewOpen, setViewOpen] = React.useState(false);
  const [isBulkUploadOpen, setBulkUploadOpen] = React.useState(false);
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
      return (
        contact.name.toLowerCase().includes(query) ||
        (contact.email && contact.email.toLowerCase().includes(query)) ||
        contact.phone.includes(query) ||
        contact.status.toLowerCase().includes(query) ||
        contact.locationPreference?.toLowerCase().includes(query) ||
        contact.serialNumber.toLowerCase().includes(query) ||
        contact.city?.toLowerCase().includes(query) ||
        contact.contactType?.toLowerCase().includes(query) ||
        contact.referenceContact?.toLowerCase().includes(query) ||
        contact.propertyPreference?.join(' ').toLowerCase().includes(query)
      );
    }).sort((a, b) => {
      let aValue: any, bValue: any;

      if(sortKey === 'budget') { aValue = budgetOrder[a.budget]; bValue = budgetOrder[b.budget]; } 
      else if (sortKey === 'status') { aValue = statusOrder[a.status]; bValue = statusOrder[b.status]; } 
      else if (sortKey === 'serialNumber') { aValue = parseInt(a.serialNumber.substring(1)); bValue = parseInt(b.serialNumber.substring(1)); } 
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
  }, [initialContacts, sortKey, sortOrder, searchQuery]);
  
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

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="relative max-h-[calc(100vh-22rem)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead onClick={() => handleSort('serialNumber')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors w-[100px]"><div className="flex items-center">Serial No. {getSortIcon('serialNumber')}</div></TableHead>
                <TableHead onClick={() => handleSort('name')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Name {getSortIcon('name')}</div></TableHead>
                <TableHead onClick={() => handleSort('status')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors w-[120px]"><div className="flex items-center">Status {getSortIcon('status')}</div></TableHead>
                <TableHead onClick={() => handleSort('budget')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Budget (Crores) {getSortIcon('budget')}</div></TableHead>
                <TableHead onClick={() => handleSort('city')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">City {getSortIcon('city')}</div></TableHead>
                <TableHead onClick={() => handleSort('contactType')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Contact Type {getSortIcon('contactType')}</div></TableHead>
                <TableHead onClick={() => handleSort('locationPreference')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Location Preference {getSortIcon('locationPreference')}</div></TableHead>
                <TableHead onClick={() => handleSort('referenceContact')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Reference {getSortIcon('referenceContact')}</div></TableHead>
                <TableHead className="sticky top-0 bg-card"><div className="flex items-center">Property Preference</div></TableHead>
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
                    <TableCell className="text-muted-foreground text-xs">{format(new Date(contact.updatedAt), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleView(contact)} aria-label="View Contact">
                        <Eye className="h-4 w-4"/>
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
                            <TableCell><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8"/><Skeleton className="h-8 w-8"/></div></TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <ContactForm isOpen={isFormOpen} onOpenChange={setFormOpen} contact={editingContact} allListings={allListings} />
      {viewingContact && <ContactViewDialog isOpen={isViewOpen} onOpenChange={setViewOpen} contact={viewingContact} allListings={allListings} />}
      <BulkContactUploadDialog isOpen={isBulkUploadOpen} onOpenChange={setBulkUploadOpen} />
    </div>
  );
}

    
