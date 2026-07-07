'use client';

import * as React from 'react';
import { format, isSameDay, isThisWeek } from 'date-fns';
import { CalendarClock, Eye, Pencil, PlusCircle, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { RefreshButton } from '@/components/refresh-button';
import { SiteVisitFormDialog } from '@/components/site-visit-form-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Contact, Listing, SiteVisit } from '@/lib/types';

type VisitFilter = 'all' | 'today' | 'week';

function formatVisitDate(value: string) {
  return format(new Date(value), 'dd MMM yyyy, h:mm a');
}

function listingSummary(visit: SiteVisit) {
  return visit.listingLabels?.length ? visit.listingLabels.join(', ') : 'No listings selected';
}

export function SiteVisitList({
  initialSiteVisits,
  contacts,
  listings,
}: {
  initialSiteVisits: SiteVisit[];
  contacts: Contact[];
  listings: Listing[];
}) {
  const [siteVisits, setSiteVisits] = React.useState(initialSiteVisits);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<VisitFilter>('all');
  const [isFormOpen, setFormOpen] = React.useState(false);
  const [selectedVisit, setSelectedVisit] = React.useState<SiteVisit | null>(null);
  const [editingVisit, setEditingVisit] = React.useState<SiteVisit | null>(null);

  React.useEffect(() => {
    setSiteVisits(initialSiteVisits);
  }, [initialSiteVisits]);

  const filteredVisits = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return siteVisits.filter((visit) => {
      const visitDate = new Date(visit.visitAt);
      const matchesFilter = filter === 'all'
        || (filter === 'today' && isSameDay(visitDate, new Date()))
        || (filter === 'week' && isThisWeek(visitDate));
      const matchesSearch = !query || [
        visit.contactName,
        visit.notes || '',
        visit.createdByName || '',
        visit.createdByEmail || '',
        ...(visit.listingLabels || []),
      ].some((value) => value.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    }).sort((first, second) => new Date(second.visitAt).getTime() - new Date(first.visitAt).getTime());
  }, [filter, search, siteVisits]);

  const todayCount = React.useMemo(
    () => siteVisits.filter((visit) => isSameDay(new Date(visit.visitAt), new Date())).length,
    [siteVisits]
  );
  const visitedContactsCount = React.useMemo(
    () => new Set(siteVisits.map((visit) => visit.contactId)).size,
    [siteVisits]
  );

  const handleSaved = (siteVisit: SiteVisit) => {
    setSiteVisits((current) => [siteVisit, ...current.filter((visit) => visit.id !== siteVisit.id)]);
    setSelectedVisit((current) => current?.id === siteVisit.id ? siteVisit : current);
    setEditingVisit(null);
  };

  const handleNewVisit = () => {
    setEditingVisit(null);
    setFormOpen(true);
  };

  const handleEditVisit = (visit: SiteVisit) => {
    setSelectedVisit(null);
    setEditingVisit(visit);
    setFormOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight">Site Visits</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredVisits.length} visits shown · {todayCount} today
            </p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search visits..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="Filter site visits"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={filter}
            onChange={(event) => setFilter(event.target.value as VisitFilter)}
          >
            <option value="all">All visits</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
          </select>
          <RefreshButton className="w-full lg:w-auto" />
          <Button onClick={handleNewVisit} className="w-full shadow-sm lg:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Log Visit
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Visits</p>
            <p className="mt-1 text-2xl font-semibold">{siteVisits.length}</p>
          </div>
          <div className="rounded-md border bg-card p-4">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="mt-1 text-2xl font-semibold">{todayCount}</p>
          </div>
          <div className="rounded-md border bg-card p-4">
            <p className="text-sm text-muted-foreground">Contacts Visited</p>
            <p className="mt-1 text-2xl font-semibold">{visitedContactsCount}</p>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {filteredVisits.map((visit) => (
            <article key={visit.id} className="rounded-md border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{visit.contactName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatVisitDate(visit.visitAt)}</p>
                </div>
                <Badge variant="secondary">Visit</Badge>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Listings shown</p>
                  <p className="line-clamp-2">{listingSummary(visit)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Agent</p>
                  <p>{visit.createdByName || visit.createdByEmail || '—'}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedVisit(visit)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEditVisit(visit)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-md border bg-card md:block">
          <div className="max-h-[calc(100vh-18rem)] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/90">
                <TableRow>
                  <TableHead className="min-w-44">Visit Time</TableHead>
                  <TableHead className="min-w-48">Contact</TableHead>
                  <TableHead className="min-w-72">Listings Shown</TableHead>
                  <TableHead className="min-w-44">Agent</TableHead>
                  <TableHead className="min-w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatVisitDate(visit.visitAt)}
                    </TableCell>
                    <TableCell className="font-medium">{visit.contactName}</TableCell>
                    <TableCell className="max-w-md whitespace-normal text-sm">
                      {listingSummary(visit)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{visit.createdByName || visit.createdByEmail || '—'}</p>
                      {visit.createdByEmail && <p className="text-xs text-muted-foreground">{visit.createdByEmail}</p>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" onClick={() => setSelectedVisit(visit)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button variant="ghost" onClick={() => handleEditVisit(visit)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredVisits.length === 0 && (
              <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
                <CalendarClock className="h-8 w-8" />
                <p className="font-medium text-foreground">No site visits found</p>
                <p className="text-sm">Log your first visit when an agent shows properties to a buyer.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <SiteVisitFormDialog
        isOpen={isFormOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingVisit(null);
        }}
        contacts={contacts}
        listings={listings}
        siteVisit={editingVisit}
        onSaved={handleSaved}
      />

      <Dialog open={!!selectedVisit} onOpenChange={(open) => {
        if (!open) setSelectedVisit(null);
      }}>
        <DialogContent className="max-w-2xl">
          {selectedVisit && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedVisit.contactName}</DialogTitle>
                <DialogDescription>{formatVisitDate(selectedVisit.visitAt)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 rounded-md border bg-muted/30 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Agent</p>
                    <p className="mt-1 text-sm font-medium">{selectedVisit.createdByName || selectedVisit.createdByEmail || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Visit Time</p>
                    <p className="mt-1 text-sm font-medium">{formatVisitDate(selectedVisit.visitAt)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Listings Shown</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedVisit.listingLabels?.length
                      ? selectedVisit.listingLabels.map((label) => (
                        <Badge key={label} variant="secondary">{label}</Badge>
                      ))
                      : <span className="text-sm text-muted-foreground">No listings selected.</span>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                    {selectedVisit.notes || 'No notes added.'}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleEditVisit(selectedVisit)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Visit
                </Button>
                <Button type="button" onClick={() => setSelectedVisit(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
