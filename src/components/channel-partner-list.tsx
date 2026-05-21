
'use client';

import * as React from 'react';
import type { ChannelPartner } from '@/lib/types';
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
import { ChannelPartnerForm } from '@/components/channel-partner-form';
import {
  Mail,
  MoreHorizontal,
  PlusCircle,
  ArrowUpDown,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Search,
  Eye,
  Send,
} from 'lucide-react';
import { deleteChannelPartner } from '@/app/actions';
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
import { ChannelPartnerViewDialog } from './channel-partner-view-dialog';
import { useRouter } from 'next/navigation';

type SortKey = keyof Pick<ChannelPartner, 'serialNumber' | 'name' | 'companyName' | 'city' | 'partnerType' | 'clienteleType' | 'investmentPreference'>;

export function ChannelPartnerList({ initialPartners }: { initialPartners: ChannelPartner[] }) {
  const [sortKey, setSortKey] = React.useState<SortKey>('serialNumber');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [isViewOpen, setViewOpen] = React.useState(false);
  const [editingPartner, setEditingPartner] = React.useState<ChannelPartner | null>(null);
  const [viewingPartner, setViewingPartner] = React.useState<ChannelPartner | null>(null);
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
  
  const handleEdit = (partner: ChannelPartner) => {
    setEditingPartner(partner);
    setFormOpen(true);
  };

  const handleView = (partner: ChannelPartner) => {
    setViewingPartner(partner);
    setViewOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingPartner(null);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteChannelPartner(id);
      if (result.success) {
        toast({ title: "Success", description: "Partner deleted successfully." });
        router.refresh();
      } else {
        toast({ title: "Error", description: result.error, variant: 'destructive' });
      }
    });
  };

  const sortedPartners = React.useMemo(() => {
    return [...initialPartners].filter(partner => {
      const query = searchQuery.toLowerCase();
      return (
        partner.name.toLowerCase().includes(query) ||
        partner.companyName.toLowerCase().includes(query) ||
        partner.email.toLowerCase().includes(query) ||
        partner.phone.includes(query) ||
        partner.city.toLowerCase().includes(query) ||
        partner.serialNumber.toLowerCase().includes(query) ||
        partner.partnerType.toLowerCase().includes(query)
      );
    }).sort((a, b) => {
      let aValue: string | number | undefined, bValue: string | number | undefined;

      if (sortKey === 'serialNumber') { 
        aValue = parseInt(a.serialNumber.substring(2)); 
        bValue = parseInt(b.serialNumber.substring(2)); 
      } else { 
        aValue = a[sortKey]; 
        bValue = b[sortKey]; 
      }
      
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [initialPartners, sortKey, sortOrder, searchQuery]);
  
  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
                <h2 className="text-3xl font-bold tracking-tight flex-1">Channel Partners</h2>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search partners..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleAddNew} variant="default" className="shadow-sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Partner
              </Button>
            </div>
        </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="relative max-h-[calc(100vh-22rem)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead onClick={() => handleSort('serialNumber')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors w-[100px]"><div className="flex items-center">Partner ID {getSortIcon('serialNumber')}</div></TableHead>
                <TableHead onClick={() => handleSort('name')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Partner Name {getSortIcon('name')}</div></TableHead>
                <TableHead onClick={() => handleSort('companyName')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Company Name {getSortIcon('companyName')}</div></TableHead>
                <TableHead onClick={() => handleSort('city')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">City {getSortIcon('city')}</div></TableHead>
                <TableHead onClick={() => handleSort('partnerType')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Partner Type {getSortIcon('partnerType')}</div></TableHead>
                <TableHead onClick={() => handleSort('clienteleType')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Clientele Type {getSortIcon('clienteleType')}</div></TableHead>
                <TableHead onClick={() => handleSort('investmentPreference')} className="sticky top-0 bg-card cursor-pointer hover:bg-muted/50 transition-colors"><div className="flex items-center">Investment Preference {getSortIcon('investmentPreference')}</div></TableHead>
                <TableHead className="sticky top-0 bg-card text-right w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isClient ? Array.from({length: 5}).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-10"/></TableCell>
                  <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                  <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                  <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                  <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                  <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                  <TableCell><Skeleton className="h-5 w-24"/></TableCell>
                  <TableCell><div className="flex justify-end gap-2"><Skeleton className="h-8 w-8"/><Skeleton className="h-8 w-8"/></div></TableCell>
                </TableRow>
              )) : sortedPartners.map(partner => (
                <TableRow key={partner.id}>
                  <TableCell className="font-mono text-muted-foreground">{partner.serialNumber}</TableCell>
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell>{partner.companyName}</TableCell>
                  <TableCell>{partner.city}</TableCell>
                  <TableCell><Badge variant={partner.partnerType === 'Official' ? 'default' : 'secondary'}>{partner.partnerType}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{partner.clienteleType}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{partner.investmentPreference}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleView(partner)} aria-label="View Partner">
                        <Eye className="h-4 w-4"/>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`mailto:${partner.email}`} aria-label="Send email"><Mail className="h-4 w-4" /></a>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(partner)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete the partner {partner.name}.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleDelete(partner.id)} disabled={isPending}>{isPending ? 'Deleting...' : 'Delete'}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <ChannelPartnerForm isOpen={isFormOpen} onOpenChange={setFormOpen} partner={editingPartner} />
      {viewingPartner && <ChannelPartnerViewDialog isOpen={isViewOpen} onOpenChange={setViewOpen} partner={viewingPartner} />}
    </div>
  );
}
