'use client';

import * as React from 'react';
import { BarChart3, Building2, MapPin, Pencil, Plus, Trash2, UsersRound } from 'lucide-react';
import { deleteMarketBenchmark, getMarketResearchData, saveMarketBenchmark } from '@/app/actions';
import { RefreshButton } from '@/components/refresh-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { MarketBenchmark, MarketBenchmarkFormData } from '@/lib/types';
import { marketBenchmarkBhkOptions, marketBenchmarkPropertyTypeOptions } from '@/lib/types';
import type { MarketResearchData, MarketResearchRow } from '@/lib/market-research';

interface MarketResearchDashboardProps {
  initialData: MarketResearchData;
}

type BenchmarkDraft = {
  location: string;
  propertyType: MarketBenchmarkFormData['propertyType'];
  bhkConfiguration: MarketBenchmarkFormData['bhkConfiguration'];
  pricePerSqFt: string;
  source: string;
  notes: string;
};

const emptyDraft: BenchmarkDraft = {
  location: '',
  propertyType: 'All',
  bhkConfiguration: 'All',
  pricePerSqFt: '',
  source: 'Team verified',
  notes: '',
};

function formatRate(value: number): string {
  return `Rs. ${value.toLocaleString('en-IN')}/sq. ft.`;
}

function createDraft(benchmark?: MarketBenchmark, row?: MarketResearchRow): BenchmarkDraft {
  if (benchmark) {
    return {
      location: benchmark.location,
      propertyType: benchmark.propertyType,
      bhkConfiguration: benchmark.bhkConfiguration,
      pricePerSqFt: String(benchmark.pricePerSqFt),
      source: benchmark.source,
      notes: benchmark.notes || '',
    };
  }

  return {
    ...emptyDraft,
    location: row?.location || '',
    propertyType: (row?.propertyType as BenchmarkDraft['propertyType']) || 'All',
    bhkConfiguration: (row?.bhkConfiguration as BenchmarkDraft['bhkConfiguration']) || 'All',
  };
}

function SummaryCard({ title, value, description, icon: Icon }: { title: string; value: string | number; description: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function MarketResearchDashboard({ initialData }: MarketResearchDashboardProps) {
  const [data, setData] = React.useState(initialData);
  const [locationFilter, setLocationFilter] = React.useState('All');
  const [propertyTypeFilter, setPropertyTypeFilter] = React.useState('All');
  const [bhkFilter, setBhkFilter] = React.useState('All');
  const [isDialogOpen, setDialogOpen] = React.useState(false);
  const [editingBenchmark, setEditingBenchmark] = React.useState<MarketBenchmark | null>(null);
  const [draft, setDraft] = React.useState<BenchmarkDraft>(emptyDraft);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const refreshResearch = React.useCallback(async () => {
    setData(await getMarketResearchData());
  }, []);

  const visibleRows = React.useMemo(() => data.rows.filter((row) => (
    (locationFilter === 'All' || row.location === locationFilter)
    && (propertyTypeFilter === 'All' || row.propertyType === propertyTypeFilter)
    && (bhkFilter === 'All' || row.bhkConfiguration === bhkFilter)
  )), [bhkFilter, data.rows, locationFilter, propertyTypeFilter]);

  const visibleComparables = visibleRows.reduce((sum, row) => sum + row.comparableCount, 0);
  const visibleBuyerDemand = new Set(visibleRows.flatMap((row) => row.buyerDemandContactIds)).size;

  const openBenchmarkDialog = (benchmark?: MarketBenchmark, row?: MarketResearchRow) => {
    setEditingBenchmark(benchmark || null);
    setDraft(createDraft(benchmark, row));
    setDialogOpen(true);
  };

  const handleSaveBenchmark = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pricePerSqFt = Number(draft.pricePerSqFt);
    if (!draft.location.trim() || !Number.isFinite(pricePerSqFt) || pricePerSqFt <= 0) {
      toast({ title: 'Complete the market rate', description: 'Add a location and a valid price per sq. ft.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    const result = await saveMarketBenchmark(editingBenchmark?.id, {
      location: draft.location.trim(),
      propertyType: draft.propertyType,
      bhkConfiguration: draft.bhkConfiguration,
      pricePerSqFt,
      source: draft.source.trim() || 'Team verified',
      notes: draft.notes.trim(),
    });
    setIsSaving(false);

    if (!result.success) {
      toast({ title: 'Could not save benchmark', description: result.error || 'Please try again.', variant: 'destructive' });
      return;
    }

    await refreshResearch();
    setDialogOpen(false);
    toast({ title: editingBenchmark ? 'Market rate updated' : 'Market rate added', description: 'The verified rate now appears in Market Research.' });
  };

  const handleDeleteBenchmark = async (benchmark: MarketBenchmark) => {
    const result = await deleteMarketBenchmark(benchmark.id);
    if (!result.success) {
      toast({ title: 'Could not delete benchmark', description: result.error || 'Please try again.', variant: 'destructive' });
      return;
    }
    await refreshResearch();
    toast({ title: 'Market rate deleted', description: `${benchmark.location} is now using the INDAH inventory benchmark.` });
  };

  return (
    <main className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Research</h1>
          <p className="mt-1 text-sm text-muted-foreground">Compare live INDAH inventory with market rates verified by your team.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RefreshButton onRefresh={refreshResearch} />
          <Button type="button" onClick={() => openBenchmarkDialog()}>
            <Plus className="mr-2 h-4 w-4" /> Add verified rate
          </Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Market research summary">
        <SummaryCard title="Active comparable listings" value={data.activeComparableCount} description="Available listings with a usable price per sq. ft." icon={Building2} />
        <SummaryCard title="INDAH inventory median" value={data.overallMedianPricePerSqFt ? formatRate(data.overallMedianPricePerSqFt) : 'Not available'} description="Across active comparable listings" icon={BarChart3} />
        <SummaryCard title="Micro-markets tracked" value={data.locations.length} description="Locations with comparable active inventory" icon={MapPin} />
        <SummaryCard title="Buyer demand" value={visibleBuyerDemand} description="Active buyers interested in the selected rows" icon={UsersRound} />
      </section>

      <section className="border-y bg-muted/20 py-4" aria-label="Market research filters">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger aria-label="Filter by location"><SelectValue placeholder="All locations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All locations</SelectItem>
              {data.locations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
            <SelectTrigger aria-label="Filter by property type"><SelectValue placeholder="All property types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All property types</SelectItem>
              {data.propertyTypes.map((propertyType) => <SelectItem key={propertyType} value={propertyType}>{propertyType}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={bhkFilter} onValueChange={setBhkFilter}>
            <SelectTrigger aria-label="Filter by BHK"><SelectValue placeholder="All BHK configurations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All BHK configurations</SelectItem>
              {data.bhkConfigurations.map((bhk) => <SelectItem key={bhk} value={bhk}>{bhk}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="overflow-hidden border" aria-label="Comparable market pricing">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">Comparable price awareness</h2>
            <p className="text-sm text-muted-foreground">Team-verified rates take priority. Otherwise, the price is the median of matching INDAH inventory.</p>
          </div>
          <span className="text-sm text-muted-foreground">{visibleComparables} comparable listings</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">BHK</th>
                <th className="px-4 py-3 font-medium">Current rate</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">INDAH range</th>
                <th className="px-4 py-3 font-medium">Comps</th>
                <th className="px-4 py-3 font-medium">Buyer demand</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const currentRate = row.manualBenchmark?.pricePerSqFt || row.medianPricePerSqFt;
                return (
                  <tr key={row.key} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{row.location}</td>
                    <td className="px-4 py-3">{row.propertyType}</td>
                    <td className="px-4 py-3">{row.bhkConfiguration}</td>
                    <td className="px-4 py-3 font-semibold">{formatRate(currentRate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.manualBenchmark ? `Team verified: ${row.manualBenchmark.source}` : 'INDAH inventory median'}</td>
                    <td className="px-4 py-3">{formatRate(row.minPricePerSqFt)} - {formatRate(row.maxPricePerSqFt)}</td>
                    <td className="px-4 py-3">{row.comparableCount}</td>
                    <td className="px-4 py-3">{row.buyerDemand}</td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" size="sm" variant="ghost" onClick={() => openBenchmarkDialog(row.manualBenchmark, row)}>
                        {row.manualBenchmark ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        <span className="sr-only">{row.manualBenchmark ? 'Edit' : 'Set'} verified market rate for {row.location}</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!visibleRows.length && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No comparable active listings match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border" aria-label="Verified market rates">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Team-verified market rates</h2>
          <p className="text-sm text-muted-foreground">Use this for rate knowledge obtained from trusted local market checks, broker feedback, or approved comparables.</p>
        </div>
        {data.benchmarks.length ? (
          <div className="divide-y">
            {data.benchmarks.map((benchmark) => (
              <div key={benchmark.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{benchmark.location} <span className="font-normal text-muted-foreground">- {benchmark.propertyType} - {benchmark.bhkConfiguration}</span></p>
                  <p className="text-sm text-muted-foreground">{formatRate(benchmark.pricePerSqFt)} · {benchmark.source}{benchmark.notes ? ` · ${benchmark.notes}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => openBenchmarkDialog(benchmark)} aria-label={`Edit ${benchmark.location} benchmark`}><Pencil className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteBenchmark(benchmark)} aria-label={`Delete ${benchmark.location} benchmark`}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="px-4 py-8 text-sm text-muted-foreground">No verified market rates yet. The table above currently uses INDAH inventory medians.</p>}
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSaveBenchmark}>
            <DialogHeader>
              <DialogTitle>{editingBenchmark ? 'Edit verified market rate' : 'Add verified market rate'}</DialogTitle>
              <DialogDescription>Use a rate your team can stand behind. It will override the INDAH inventory median for matching listings.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <div className="grid gap-2"><Label htmlFor="benchmark-location">Area</Label><Input id="benchmark-location" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="e.g. Siolim" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Property type</Label><Select value={draft.propertyType} onValueChange={(value: BenchmarkDraft['propertyType']) => setDraft((current) => ({ ...current, propertyType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{marketBenchmarkPropertyTypeOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid gap-2"><Label>BHK</Label><Select value={draft.bhkConfiguration} onValueChange={(value: BenchmarkDraft['bhkConfiguration']) => setDraft((current) => ({ ...current, bhkConfiguration: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{marketBenchmarkBhkOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid gap-2"><Label htmlFor="benchmark-rate">Price per sq. ft.</Label><Input id="benchmark-rate" value={draft.pricePerSqFt} onChange={(event) => setDraft((current) => ({ ...current, pricePerSqFt: event.target.value }))} type="number" min="1" inputMode="numeric" placeholder="e.g. 22000" /></div>
              <div className="grid gap-2"><Label htmlFor="benchmark-source">Source</Label><Input id="benchmark-source" value={draft.source} onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))} placeholder="e.g. Team verified" /></div>
              <div className="grid gap-2"><Label htmlFor="benchmark-notes">Notes (optional)</Label><Textarea id="benchmark-notes" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Brief context for the team" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save verified rate'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
