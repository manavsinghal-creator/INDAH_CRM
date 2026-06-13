'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, FileClock, Search } from 'lucide-react';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ActivityAction, ActivityEntityType, ActivityLog } from '@/lib/types';
import { RefreshButton } from '@/components/refresh-button';

type SortKey = 'createdAt' | 'user' | 'action' | 'entityType' | 'entityLabel';

const entityLabels: Record<ActivityEntityType, string> = {
  contact: 'Contact',
  listing: 'Listing',
  channelPartner: 'Channel Partner',
  session: 'Login Session',
};

const actionLabels: Record<ActivityAction, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  whatsappDraftOpened: 'Opened WhatsApp draft',
  emailDraftOpened: 'Opened email draft',
  signedIn: 'Signed in',
};

function humanizeField(field: string) {
  return field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

function activityDetails(log: ActivityLog) {
  if (log.action === 'whatsappDraftOpened') {
    const listings = log.changes.find((change) => change.field === 'listingsIncluded')?.after;
    return listings && listings !== '—' ? `Listings: ${listings}` : 'WhatsApp draft prepared';
  }

  if (log.action === 'emailDraftOpened') {
    const listings = log.changes.find((change) => change.field === 'listingsIncluded')?.after;
    return listings && listings !== '—' ? `Listings: ${listings}` : 'Email draft prepared';
  }

  if (log.action === 'signedIn') return 'Successful CRM login';

  if (log.action === 'updated' && log.changes.length > 0) {
    return `Changed ${log.changes.map((change) => humanizeField(change.field)).join(', ')}`;
  }

  if (log.action === 'created') return `New ${entityLabels[log.entityType].toLowerCase()} added`;
  if (log.action === 'deleted') return `${entityLabels[log.entityType]} removed`;
  return 'No additional details';
}

function visibleChanges(log: ActivityLog) {
  return log.changes.filter((change) => change.field !== 'listingIds' && change.field !== 'offeredListings');
}

function displayDetailValue(value: string) {
  if (value === 'true') return 'Yes';
  if (value === 'false') return 'No';
  return value;
}

export function ActivityLogList({ initialLogs }: { initialLogs: ActivityLog[] }) {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<ActivityAction | 'all'>('all');
  const [entityType, setEntityType] = useState<ActivityEntityType | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return initialLogs.filter((log) => {
      const matchesSearch = !query || [
        log.userEmail,
        log.userName,
        log.entityLabel,
        actionLabels[log.action],
        entityLabels[log.entityType],
        activityDetails(log),
      ].some((value) => value.toLowerCase().includes(query));

      return matchesSearch
        && (action === 'all' || log.action === action)
        && (entityType === 'all' || log.entityType === entityType);
    }).sort((first, second) => {
      const values: Record<SortKey, [string | number, string | number]> = {
        createdAt: [new Date(first.createdAt).getTime(), new Date(second.createdAt).getTime()],
        user: [first.userName || first.userEmail, second.userName || second.userEmail],
        action: [actionLabels[first.action], actionLabels[second.action]],
        entityType: [entityLabels[first.entityType], entityLabels[second.entityType]],
        entityLabel: [first.entityLabel, second.entityLabel],
      };
      const [firstValue, secondValue] = values[sortKey];
      const comparison = typeof firstValue === 'number' && typeof secondValue === 'number'
        ? firstValue - secondValue
        : String(firstValue).localeCompare(String(secondValue));
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [action, entityType, initialLogs, search, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((current) => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-35" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const sortableHeader = (label: string, key: SortKey, className = '') => (
    <TableHead className={className}>
      <Button
        variant="ghost"
        className="-ml-3 h-8 px-3 font-medium"
        onClick={() => handleSort(key)}
      >
        {label}
        {sortIcon(key)}
      </Button>
    </TableHead>
  );

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">Activity Log</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'activity' : 'activities'}
          </p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search activities..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <RefreshButton className="w-full lg:w-auto" />
        <select
          aria-label="Filter by activity"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={action}
          onChange={(event) => setAction(event.target.value as ActivityAction | 'all')}
        >
          <option value="all">All activities</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
          <option value="whatsappDraftOpened">WhatsApp drafts</option>
          <option value="emailDraftOpened">Email drafts</option>
          <option value="signedIn">Sign-ins</option>
        </select>
        <select
          aria-label="Filter by record type"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={entityType}
          onChange={(event) => setEntityType(event.target.value as ActivityEntityType | 'all')}
        >
          <option value="all">All record types</option>
          <option value="contact">Contacts</option>
          <option value="listing">Listings</option>
          <option value="channelPartner">Channel Partners</option>
          <option value="session">Login Sessions</option>
        </select>
        <div className="flex gap-2 md:hidden">
          <select
            aria-label="Sort activities by"
            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
          >
            <option value="createdAt">Sort by date</option>
            <option value="user">Sort by team member</option>
            <option value="action">Sort by activity</option>
            <option value="entityType">Sort by record type</option>
            <option value="entityLabel">Sort by record</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
            onClick={() => setSortOrder((current) => current === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredLogs.map((log) => (
          <article key={log.id} className="rounded-md border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{actionLabels[log.action]}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {entityLabels[log.entityType]} · {log.entityLabel}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setSelectedLog(log)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Details
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{activityDetails(log)}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <span>{log.userName || log.userEmail}</span>
              <span>{format(new Date(log.createdAt), 'dd MMM yyyy, h:mm a')}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-md border bg-card md:block">
        <div className="max-h-[calc(100vh-15rem)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/90">
              <TableRow>
                {sortableHeader('Date & Time', 'createdAt', 'min-w-40')}
                {sortableHeader('Team Member', 'user', 'min-w-52')}
                {sortableHeader('Activity', 'action', 'min-w-44')}
                {sortableHeader('Record Type', 'entityType', 'min-w-40')}
                {sortableHeader('Record', 'entityLabel', 'min-w-52')}
                <TableHead className="min-w-72">Details</TableHead>
                <TableHead className="min-w-32 text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {format(new Date(log.createdAt), 'dd MMM yyyy, h:mm a')}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{log.userName || log.userEmail}</p>
                    {log.userName && log.userName !== log.userEmail && (
                      <p className="text-xs text-muted-foreground">{log.userEmail}</p>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{actionLabels[log.action]}</TableCell>
                  <TableCell>{entityLabels[log.entityType]}</TableCell>
                  <TableCell className="font-medium">{log.entityLabel}</TableCell>
                  <TableCell className="max-w-md whitespace-normal text-sm text-muted-foreground">
                    {activityDetails(log)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      aria-label={`View details for ${log.entityLabel}`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredLogs.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
              <FileClock className="h-8 w-8" />
              <p className="font-medium text-foreground">No activities found</p>
              <p className="text-sm">CRM activity will appear here automatically.</p>
            </div>
          )}
        </div>
      </div>

      {filteredLogs.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border bg-card p-12 text-center text-muted-foreground md:hidden">
          <FileClock className="h-8 w-8" />
          <p className="font-medium text-foreground">No activities found</p>
          <p className="text-sm">CRM activity will appear here automatically.</p>
        </div>
      )}
    </div>

    <Dialog open={!!selectedLog} onOpenChange={(open) => {
      if (!open) setSelectedLog(null);
    }}>
      <DialogContent className="max-w-3xl">
        {selectedLog && (
          <>
            <DialogHeader>
              <DialogTitle>{actionLabels[selectedLog.action]}: {selectedLog.entityLabel}</DialogTitle>
              <DialogDescription>
                {format(new Date(selectedLog.createdAt), 'dd MMMM yyyy, h:mm a')} by {selectedLog.userName || selectedLog.userEmail}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="grid grid-cols-1 gap-4 rounded-md border bg-muted/30 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Activity</p>
                  <p className="mt-1 text-sm font-medium">{actionLabels[selectedLog.action]}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Record Type</p>
                  <p className="mt-1 text-sm font-medium">{entityLabels[selectedLog.entityType]}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Record</p>
                  <p className="mt-1 text-sm font-medium">{selectedLog.entityLabel}</p>
                </div>
              </div>

              {visibleChanges(selectedLog).length > 0 ? (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field</TableHead>
                        <TableHead>Previous Value</TableHead>
                        <TableHead>New Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleChanges(selectedLog).map((change) => (
                        <TableRow key={change.field}>
                          <TableCell className="font-medium">{humanizeField(change.field)}</TableCell>
                          <TableCell className="max-w-64 whitespace-pre-wrap break-words text-muted-foreground">
                            {displayDetailValue(change.before)}
                          </TableCell>
                          <TableCell className="max-w-64 whitespace-pre-wrap break-words">
                            {displayDetailValue(change.after)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {activityDetails(selectedLog)}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => setSelectedLog(null)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
