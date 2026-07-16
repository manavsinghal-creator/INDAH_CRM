'use client';

import Link from 'next/link';
import * as React from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Handshake,
  House,
  ImageOff,
  MapPin,
  MessageCircle,
  Send,
  Sparkles,
  Users,
  UserRoundCheck,
} from 'lucide-react';

import { getDashboardMetrics } from '@/app/actions';
import { RefreshButton } from '@/components/refresh-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { leadStageOptions, type ActivityLog, type LeadStage } from '@/lib/types';
import { cn } from '@/lib/utils';

type MetricsData = Awaited<ReturnType<typeof getDashboardMetrics>>;
type MetricsPayload = NonNullable<MetricsData['data']>;
type DateRangeKey = 'today' | 'week' | 'month' | 'custom';

const activeLeadStages: LeadStage[] = ['New', 'Contacted', 'Qualified', 'Property Shared', 'Site Visit', 'Negotiating'];

function toDateInputValue(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function getDateRange(key: Exclude<DateRangeKey, 'custom'>) {
  const now = new Date();
  if (key === 'today') return { from: now, to: now };
  if (key === 'week') return { from: subDays(now, 6), to: now };
  return { from: subDays(now, 29), to: now };
}

function withinRange(value: string, fromDate: string, toDate: string) {
  const date = new Date(value);
  return date >= startOfDay(new Date(`${fromDate}T00:00:00`)) && date <= endOfDay(new Date(`${toDate}T00:00:00`));
}

function countSharedProperties(log: ActivityLog) {
  const value = log.changes.find((change) => change.field === 'listingsIncluded')?.after;
  if (!value || value === '—' || value === 'No listings selected') return 0;
  return value.split(',').map((item) => item.trim()).filter(Boolean).length;
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

function stageUpdate(log: ActivityLog) {
  return log.entityType === 'contact'
    ? log.changes.find((change) => change.field === 'leadStage')?.after
    : undefined;
}

function userLabel(log: ActivityLog) {
  return log.userName && log.userName !== log.userEmail ? log.userName : log.userEmail || 'Unknown user';
}

function actionVerb(log: ActivityLog) {
  if (log.action === 'whatsappDraftOpened') return 'WhatsApp draft opened';
  if (log.action === 'emailDraftOpened') return 'Email draft opened';
  if (log.action === 'siteVisitLogged') return 'Site visit logged';
  if (log.action === 'signedIn') return 'Signed in';
  if (log.action === 'created') return `${log.entityType === 'contact' ? 'Contact' : 'Listing'} added`;
  if (log.action === 'updated') return `${log.entityType === 'contact' ? 'Contact' : 'Listing'} updated`;
  return 'Record removed';
}

function MetricCard({ title, value, description, icon: Icon, accent = 'text-primary' }: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className={cn('rounded-md bg-muted p-2', accent)}><Icon className="h-4 w-4" /></span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs"><Link href={href}>{children}<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>;
}

function LoadingDashboard() {
  return (
    <main className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-36" />)}</div>
    </main>
  );
}

export default function MetricsPage() {
  const [metrics, setMetrics] = React.useState<MetricsData | null>(null);
  const [rangeKey, setRangeKey] = React.useState<DateRangeKey>('month');
  const initialRange = React.useMemo(() => getDateRange('month'), []);
  const [fromDate, setFromDate] = React.useState(toDateInputValue(initialRange.from));
  const [toDate, setToDate] = React.useState(toDateInputValue(initialRange.to));
  const [selectedUser, setSelectedUser] = React.useState('all');

  const refreshMetrics = React.useCallback(async () => {
    setMetrics(await getDashboardMetrics());
  }, []);

  React.useEffect(() => {
    refreshMetrics().catch(() => undefined);
  }, [refreshMetrics]);

  const handleRangeChange = (value: DateRangeKey) => {
    setRangeKey(value);
    if (value === 'custom') return;
    const nextRange = getDateRange(value);
    setFromDate(toDateInputValue(nextRange.from));
    setToDate(toDateInputValue(nextRange.to));
  };

  if (metrics && (!metrics.success || !metrics.data)) {
    return <main className="container mx-auto p-4 md:p-6 lg:p-8"><h1 className="text-3xl font-bold tracking-tight">Metrics</h1><p className="mt-3 text-destructive">Could not load dashboard data. Please refresh and try again.</p></main>;
  }

  if (!metrics?.data) return <LoadingDashboard />;

  const data: MetricsPayload = metrics.data;
  const periodLogs = data.activityLogs.filter((log) => withinRange(log.createdAt, fromDate, toDate));
  const selectedLogs = selectedUser === 'all' ? periodLogs : periodLogs.filter((log) => log.userEmail === selectedUser);
  const periodVisits = data.siteVisits.filter((visit) => withinRange(visit.visitAt, fromDate, toDate));
  const selectedVisits = selectedUser === 'all' ? periodVisits : periodVisits.filter((visit) => visit.createdByEmail === selectedUser);
  const activeBuyers = data.contacts.byPipelineStage.filter((item) => activeLeadStages.includes(item.stage as LeadStage)).reduce((sum, item) => sum + item.count, 0);
  const sharedLogs = selectedLogs.filter((log) => log.action === 'whatsappDraftOpened' || log.action === 'emailDraftOpened');
  const propertiesShared = sharedLogs.reduce((total, log) => total + countSharedProperties(log), 0);
  const buyersSharedWith = new Set(sharedLogs.filter((log) => log.entityType === 'contact').map((log) => log.entityId)).size;
  const pipelineMovement = leadStageOptions.map((stage) => ({
    stage,
    count: selectedLogs.filter((log) => stageUpdate(log) === stage).length,
  }));
  const maxPipelineCount = Math.max(...data.contacts.byPipelineStage.map((item) => item.count), 1);
  const closedCount = data.contacts.byPipelineStage.find((item) => item.stage === 'Closed/Lost')?.count || 0;
  const disqualifiedCount = data.contacts.byPipelineStage.find((item) => item.stage === 'Disqualified')?.count || 0;
  const qualifiedCount = data.contacts.byPipelineStage.find((item) => item.stage === 'Qualified')?.count || 0;
  const propertySharedCount = data.contacts.byPipelineStage.find((item) => item.stage === 'Property Shared')?.count || 0;
  const siteVisitCount = data.contacts.byPipelineStage.find((item) => item.stage === 'Site Visit')?.count || 0;
  const negotiatingCount = data.contacts.byPipelineStage.find((item) => item.stage === 'Negotiating')?.count || 0;
  const teamRows = data.dashboardUsers.map((user) => {
    const logs = periodLogs.filter((log) => log.userEmail === user.email);
    return {
      ...user,
      actions: logs.length,
      contactsAdded: logs.filter((log) => log.action === 'created' && log.entityType === 'contact').length,
      contactsUpdated: new Set(logs.filter((log) => log.action === 'updated' && log.entityType === 'contact').map((log) => log.entityId)).size,
      propertiesShared: logs.reduce((sum, log) => sum + countSharedProperties(log), 0),
      siteVisits: periodVisits.filter((visit) => visit.createdByEmail === user.email).length,
      listingsAdded: logs.filter((log) => log.action === 'created' && log.entityType === 'listing').length,
    };
  }).filter((row) => selectedUser === 'all' || row.email === selectedUser).sort((first, second) => second.actions - first.actions);
  const attentionItems = [
    { title: 'New buyers awaiting first contact', count: data.attention.newBuyerCount, detail: 'Review new buyer leads and move them forward once reached.', href: '/', icon: Clock3 },
    { title: 'Qualified buyers ready for properties', count: data.attention.qualifiedWithoutListings, detail: 'Buyers who are qualified but do not yet have a saved property share.', href: '/', icon: Send },
    { title: 'Property Shared leads awaiting a visit', count: data.attention.propertySharedAwaitingVisit, detail: 'Follow up for feedback or schedule a site visit.', href: '/site-visits', icon: House },
    { title: 'Listings missing a public link', count: data.dataQuality.listingsWithoutPublicLink, detail: 'Add a website or external link before sharing it with a buyer.', href: '/listings', icon: FileText },
    { title: 'Listings without a hero image', count: data.attention.listingsWithoutHeroImage, detail: 'A visual listing is easier for agents and clients to identify.', href: '/listings', icon: ImageOff },
  ];
  const topLocations = data.listings.byLocation.slice(0, 5);
  const selectedLabel = selectedUser === 'all' ? 'whole team' : data.dashboardUsers.find((user) => user.email === selectedUser)?.name || selectedUser;
  const rangeLabel = fromDate === toDate ? format(new Date(`${fromDate}T00:00:00`), 'dd MMM yyyy') : `${format(new Date(`${fromDate}T00:00:00`), 'dd MMM')} - ${format(new Date(`${toDate}T00:00:00`), 'dd MMM yyyy')}`;

  return (
    <main className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metrics</h1>
          <p className="mt-1 text-sm text-muted-foreground">A practical view of sales activity, pipeline health, and inventory readiness.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground"><span>Updated {format(new Date(data.lastUpdatedAt), 'dd MMM, p')}</span><RefreshButton onRefresh={refreshMetrics} /></div>
      </div>

      <Card className="border-primary/20 bg-muted/30 shadow-sm">
        <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr_auto] xl:items-end">
          <div className="space-y-1"><p className="text-sm font-medium">Dashboard period</p><p className="text-xs text-muted-foreground">Activity is counted from {rangeLabel}.</p></div>
          <Select value={rangeKey} onValueChange={(value) => handleRangeChange(value as DateRangeKey)}><SelectTrigger aria-label="Choose dashboard period"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="today">Today</SelectItem><SelectItem value="week">Last 7 days</SelectItem><SelectItem value="month">Last 30 days</SelectItem><SelectItem value="custom">Custom range</SelectItem></SelectContent></Select>
          <input aria-label="Start date" type="date" value={fromDate} onChange={(event) => { setRangeKey('custom'); setFromDate(event.target.value); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
          <input aria-label="End date" type="date" value={toDate} onChange={(event) => { setRangeKey('custom'); setToDate(event.target.value); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
          <Select value={selectedUser} onValueChange={setSelectedUser}><SelectTrigger aria-label="Filter activity by user"><SelectValue placeholder="All team members" /></SelectTrigger><SelectContent><SelectItem value="all">All team members</SelectItem>{data.dashboardUsers.map((user) => <SelectItem key={user.email} value={user.email}>{user.name}</SelectItem>)}</SelectContent></Select>
        </CardContent>
      </Card>

      <section aria-labelledby="sales-pulse-heading">
        <div className="mb-3 flex items-center justify-between"><div><h2 id="sales-pulse-heading" className="text-lg font-semibold">Sales pulse</h2><p className="text-sm text-muted-foreground">Current CRM position, with {selectedLabel}&apos;s activity for the selected period.</p></div><Badge variant="secondary">{rangeLabel}</Badge></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Active buyers" value={activeBuyers} description={`${data.contacts.buyers} buyers in the CRM; excluding lost and disqualified leads.`} icon={Users} />
          <MetricCard title="Available listings" value={data.listings.available} description={`${formatCurrency(data.listings.availableInventoryValue)} in currently shareable inventory.`} icon={Building2} accent="text-emerald-700" />
          <MetricCard title="Site visits" value={selectedVisits.length} description={`${new Set(selectedVisits.map((visit) => visit.contactId)).size} unique buyer${new Set(selectedVisits.map((visit) => visit.contactId)).size === 1 ? '' : 's'} visited in this period.`} icon={House} accent="text-sky-700" />
          <MetricCard title="Properties shared" value={propertiesShared} description={`${buyersSharedWith} buyer${buyersSharedWith === 1 ? '' : 's'} received a WhatsApp or email draft.`} icon={MessageCircle} accent="text-amber-700" />
          <Card className="border-primary/30 bg-primary/[0.025] shadow-sm"><CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Best matches ready</CardTitle><span className="rounded-md bg-primary/10 p-2 text-primary"><Sparkles className="h-4 w-4" /></span></CardHeader><CardContent><p className="text-3xl font-semibold tracking-tight">{data.bestMatches.strongOpportunityCount}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Strong, fresh matches across {data.bestMatches.eligibleBuyerCount} active buyers.</p><PanelLink href="/best-matches">Review matches</PanelLink></CardContent></Card>
        </div>
      </section>

      <Tabs defaultValue="pipeline" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-3 md:w-[450px]"><TabsTrigger value="pipeline">Pipeline</TabsTrigger><TabsTrigger value="team">Team activity</TabsTrigger><TabsTrigger value="inventory">Inventory</TabsTrigger></TabsList>

        <TabsContent value="pipeline" className="mt-0 space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" />Buyer pipeline</CardTitle><CardDescription>Current buyers by stage. The small label shows movement during this selected period.</CardDescription></div><PanelLink href="/">Open contacts</PanelLink></CardHeader>
              <CardContent className="space-y-4">
                {activeLeadStages.map((stage) => {
                  const count = data.contacts.byPipelineStage.find((item) => item.stage === stage)?.count || 0;
                  const movement = pipelineMovement.find((item) => item.stage === stage)?.count || 0;
                  return <div key={stage} className="space-y-1.5"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{stage}</span><span className="shrink-0 text-muted-foreground">{count} current {movement ? <span className="text-foreground">· {movement} moved in</span> : null}</span></div><Progress value={(count / maxPipelineCount) * 100} className="h-2" /></div>;
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" />Buyer journey</CardTitle><CardDescription>A simple directional funnel from today&apos;s CRM stages.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {[['Qualified', qualifiedCount], ['Property Shared', propertySharedCount], ['Site Visit', siteVisitCount], ['Negotiating', negotiatingCount], ['Closed/Lost', closedCount]].map(([label, count], index, values) => <React.Fragment key={String(label)}><div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5"><span className="text-sm font-medium">{label}</span><span className="font-semibold">{count}</span></div>{index < values.length - 1 && <div className="ml-5 h-3 border-l border-dashed border-muted-foreground/40" />}</React.Fragment>)}
                <div className="border-t pt-3 text-xs text-muted-foreground">{disqualifiedCount} buyers are disqualified and kept outside the active sales flow.</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CircleDot className="h-4 w-4" />Period activity</CardTitle><CardDescription>{selectedLogs.length} tracked actions by {selectedLabel} between {rangeLabel}.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Contacts added</p><p className="mt-1 text-xl font-semibold">{selectedLogs.filter((log) => log.action === 'created' && log.entityType === 'contact').length}</p></div><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Contacts updated</p><p className="mt-1 text-xl font-semibold">{new Set(selectedLogs.filter((log) => log.action === 'updated' && log.entityType === 'contact').map((log) => log.entityId)).size}</p></div><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">WhatsApp drafts</p><p className="mt-1 text-xl font-semibold">{selectedLogs.filter((log) => log.action === 'whatsappDraftOpened').length}</p></div><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Listings added</p><p className="mt-1 text-xl font-semibold">{selectedLogs.filter((log) => log.action === 'created' && log.entityType === 'listing').length}</p></div></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-0 space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><UserRoundCheck className="h-4 w-4" />Team contribution</CardTitle><CardDescription>Actions recorded in the Activity Log for the selected period.</CardDescription></div><PanelLink href="/reports">Open reports</PanelLink></CardHeader>
            <CardContent className="overflow-x-auto px-0 pb-0"><table className="w-full min-w-[760px] text-sm"><thead className="border-y bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-6 py-3 font-medium">Agent</th><th className="px-4 py-3 text-right font-medium">Contacts added</th><th className="px-4 py-3 text-right font-medium">Updated</th><th className="px-4 py-3 text-right font-medium">Properties shared</th><th className="px-4 py-3 text-right font-medium">Site visits</th><th className="px-4 py-3 text-right font-medium">Listings added</th><th className="px-6 py-3 text-right font-medium">Actions</th></tr></thead><tbody>{teamRows.length ? teamRows.map((row) => <tr key={row.email} className="border-b last:border-b-0"><td className="px-6 py-4"><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.email}</p></td><td className="px-4 py-4 text-right">{row.contactsAdded}</td><td className="px-4 py-4 text-right">{row.contactsUpdated}</td><td className="px-4 py-4 text-right">{row.propertiesShared}</td><td className="px-4 py-4 text-right">{row.siteVisits}</td><td className="px-4 py-4 text-right">{row.listingsAdded}</td><td className="px-6 py-4 text-right font-semibold">{row.actions}</td></tr>) : <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">No recorded activity for this filter.</td></tr>}</tbody></table></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Recent activity</CardTitle><CardDescription>A quick read of the latest work within this period.</CardDescription></CardHeader>
            <CardContent className="space-y-3">{selectedLogs.slice(0, 6).map((log) => <div key={log.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><div><p className="text-sm"><span className="font-medium">{userLabel(log)}</span> · {actionVerb(log)}</p><p className="mt-0.5 text-xs text-muted-foreground">{log.entityLabel}</p></div><time className="shrink-0 text-xs text-muted-foreground">{format(new Date(log.createdAt), 'dd MMM, p')}</time></div>)}{!selectedLogs.length && <p className="text-sm text-muted-foreground">No activity recorded in this period.</p>}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-0 space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <Card><CardHeader className="flex flex-row items-start justify-between space-y-0"><div><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" />Inventory readiness</CardTitle><CardDescription>Only available listings should be recommended by matchers.</CardDescription></div><PanelLink href="/listings">Open listings</PanelLink></CardHeader><CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">{data.listings.byAvailability.map((item) => <div key={item.status} className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{item.status}</p><p className="mt-1 text-2xl font-semibold">{item.count}</p></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" />Top locations</CardTitle><CardDescription>Where your active CRM inventory is concentrated.</CardDescription></CardHeader><CardContent className="space-y-3">{topLocations.map((item) => <div key={item.location} className="flex items-center justify-between text-sm"><span className="truncate pr-4">{item.location}</span><Badge variant="secondary">{item.count}</Badge></div>)}{!topLocations.length && <p className="text-sm text-muted-foreground">No listing locations available yet.</p>}</CardContent></Card>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-base">Inventory mix</CardTitle><CardDescription>Availability, mandate, and publishing status.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="flex justify-between text-sm"><span>Exclusive listings</span><strong>{data.listings.exclusive}</strong></div><div className="flex justify-between text-sm"><span>Non-exclusive listings</span><strong>{data.listings.nonExclusive}</strong></div><div className="flex justify-between text-sm"><span>Available inventory value</span><strong>{formatCurrency(data.listings.availableInventoryValue)}</strong></div><div className="flex justify-between text-sm"><span>Channel partners</span><strong>{data.partners.total}</strong></div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Property types</CardTitle><CardDescription>Current listing mix by format.</CardDescription></CardHeader><CardContent className="space-y-3">{data.listings.byType.map((item) => <div key={item.type} className="flex justify-between text-sm"><span>{item.type}</span><strong>{item.count}</strong></div>)}</CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>

      <section aria-labelledby="attention-heading">
        <div className="mb-3"><h2 id="attention-heading" className="text-lg font-semibold">Needs attention</h2><p className="text-sm text-muted-foreground">A short operational queue for the team to work through.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{attentionItems.map((item) => <Card key={item.title} className={cn('border-border/80', item.count > 0 && 'border-amber-300/70')}><CardHeader className="pb-2"><div className="flex items-start justify-between gap-3"><item.icon className={cn('h-5 w-5', item.count > 0 ? 'text-amber-600' : 'text-muted-foreground')} /><Badge variant={item.count > 0 ? 'secondary' : 'outline'}>{item.count}</Badge></div><CardTitle className="pt-2 text-sm leading-snug">{item.title}</CardTitle></CardHeader><CardContent><p className="min-h-10 text-xs leading-relaxed text-muted-foreground">{item.detail}</p><PanelLink href={item.href}>Review</PanelLink></CardContent></Card>)}</div>
      </section>

      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-4 py-3 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Metrics use existing contacts, listings, site visits, and Activity Log entries. They do not create or modify CRM records.</div>
    </main>
  );
}
