'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarDays, FileText } from 'lucide-react';

import type { ActivityLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshButton } from '@/components/refresh-button';

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

type ReportStats = {
  actions: number;
  contactsCreated: number;
  contactsUpdated: number;
  listingsCreated: number;
  listingsUpdated: number;
  whatsappDrafts: number;
  emailDrafts: number;
  propertiesSent: number;
  propertiesShown: number;
  siteVisits: number;
  logins: number;
};

const emptyStats = (): ReportStats => ({
  actions: 0,
  contactsCreated: 0,
  contactsUpdated: 0,
  listingsCreated: 0,
  listingsUpdated: 0,
  whatsappDrafts: 0,
  emailDrafts: 0,
  propertiesSent: 0,
  propertiesShown: 0,
  siteVisits: 0,
  logins: 0,
});

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function countSharedProperties(value?: string) {
  if (!value || value === '—' || value === 'No listings selected') return 0;
  const externalIds = value.match(/\b[A-Z]{2,}\d{3,}\b/g);
  if (externalIds?.length) return new Set(externalIds).size;
  return value.split(',').map((item) => item.trim()).filter(Boolean).length;
}

function addLogToStats(stats: ReportStats, log: ActivityLog) {
  stats.actions += 1;

  if (log.action === 'created' && log.entityType === 'contact') stats.contactsCreated += 1;
  if (log.action === 'updated' && log.entityType === 'contact') stats.contactsUpdated += 1;
  if (log.action === 'created' && log.entityType === 'listing') stats.listingsCreated += 1;
  if (log.action === 'updated' && log.entityType === 'listing') stats.listingsUpdated += 1;
  if (log.action === 'whatsappDraftOpened') stats.whatsappDrafts += 1;
  if (log.action === 'emailDraftOpened') stats.emailDrafts += 1;
  if (log.action === 'siteVisitLogged') stats.siteVisits += 1;
  if (log.action === 'signedIn') stats.logins += 1;

  const listingsIncluded = log.changes.find((change) => change.field === 'listingsIncluded')?.after;
  const listingsShown = log.changes.find((change) => change.field === 'listingsShown')?.after;
  stats.propertiesSent += countSharedProperties(listingsIncluded);
  stats.propertiesShown += countSharedProperties(listingsShown);
}

function formatUserName(log: ActivityLog) {
  return log.userName && log.userName !== log.userEmail ? log.userName : log.userEmail;
}

function compactStatsLine(stats: ReportStats) {
  return [
    stats.contactsCreated ? `${plural(stats.contactsCreated, 'contact')} added` : null,
    stats.contactsUpdated ? `${plural(stats.contactsUpdated, 'contact')} updated` : null,
    stats.listingsCreated ? `${plural(stats.listingsCreated, 'listing')} added` : null,
    stats.listingsUpdated ? `${plural(stats.listingsUpdated, 'listing')} updated` : null,
    stats.whatsappDrafts ? `${plural(stats.whatsappDrafts, 'WhatsApp draft')}` : null,
    stats.emailDrafts ? `${plural(stats.emailDrafts, 'email draft')}` : null,
    stats.propertiesSent ? `${plural(stats.propertiesSent, 'property', 'properties')} sent in drafts` : null,
    stats.propertiesShown ? `${plural(stats.propertiesShown, 'property', 'properties')} shown in visits` : null,
    stats.siteVisits ? `${plural(stats.siteVisits, 'site visit')}` : null,
    stats.logins ? `${plural(stats.logins, 'login')}` : null,
  ].filter(Boolean).join(', ') || 'Activity recorded';
}

function buildSummary(logs: ActivityLog[], fromDate: string, toDate: string) {
  if (!logs.length) return 'No activity found for this date range.';

  const totalStats = emptyStats();
  const userStats = new Map<string, ReportStats>();
  const uniqueContactsUpdated = new Set<string>();
  const activeUsers = new Set<string>();

  logs.forEach((log) => {
    addLogToStats(totalStats, log);
    activeUsers.add(formatUserName(log));
    if (log.action === 'updated' && log.entityType === 'contact') uniqueContactsUpdated.add(log.entityId);

    const userName = formatUserName(log);
    const stats = userStats.get(userName) || emptyStats();
    addLogToStats(stats, log);
    userStats.set(userName, stats);
  });

  const dateLabel = fromDate === toDate
    ? format(new Date(`${fromDate}T00:00:00`), 'dd MMM yyyy')
    : `${format(new Date(`${fromDate}T00:00:00`), 'dd MMM yyyy')} to ${format(new Date(`${toDate}T00:00:00`), 'dd MMM yyyy')}`;

  const userLines = [...userStats.entries()]
    .sort(([, first], [, second]) => second.actions - first.actions)
    .map(([userName, stats]) => `- ${userName}: ${compactStatsLine(stats)}`);

  return [
    `CRM Daily Summary - ${dateLabel}`,
    '',
    `Team activity: ${activeUsers.size} user${activeUsers.size === 1 ? '' : 's'}, ${totalStats.actions} total action${totalStats.actions === 1 ? '' : 's'}`,
    `Contacts: ${totalStats.contactsCreated} added, ${uniqueContactsUpdated.size} unique updated`,
    `Listings: ${totalStats.listingsCreated} added, ${totalStats.listingsUpdated} updated`,
    `Sharing: ${totalStats.whatsappDrafts} WhatsApp drafts, ${totalStats.emailDrafts} email drafts, ${totalStats.propertiesSent} properties sent in drafts`,
    `Site visits: ${totalStats.siteVisits}, ${totalStats.propertiesShown} properties shown`,
    `Logins: ${totalStats.logins}`,
    '',
    'By user:',
    ...userLines,
  ].join('\n');
}

export function ReportingDashboard({ logs }: { logs: ActivityLog[] }) {
  const today = React.useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = React.useState(toDateInputValue(today));
  const [toDate, setToDate] = React.useState(toDateInputValue(today));
  const [summary, setSummary] = React.useState('');

  const filteredLogs = React.useMemo(() => {
    const from = new Date(`${fromDate}T00:00:00`);
    const to = new Date(`${toDate}T23:59:59`);
    return logs.filter((log) => {
      const createdAt = new Date(log.createdAt);
      return createdAt >= from && createdAt <= to;
    });
  }, [fromDate, logs, toDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">Plan Reporting</h2>
          <p className="text-sm text-muted-foreground">WhatsApp-ready team summary from Activity Log</p>
        </div>
        <RefreshButton className="w-full md:w-auto" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="report-from">From</Label>
            <Input id="report-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">To</Label>
            <Input id="report-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
          <Button type="button" onClick={() => setSummary(buildSummary(filteredLogs, fromDate, toDate))}>
            <FileText className="mr-2 h-4 w-4" />
            Daily Summary
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{filteredLogs.length} activities found</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="min-h-[260px] whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">
            {summary || 'Choose a timeline and press Daily Summary. The report will be short enough to share on WhatsApp.'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
