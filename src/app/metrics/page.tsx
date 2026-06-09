
'use client';

import { getDashboardMetrics } from "@/app/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Building, Handshake, Users, MapPin, ListChecks, Wallet, Tag, Home, BarChart, RefreshCw, GitBranch } from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MetricCard = ({ title, value, description, icon: Icon, className }: { title: string, value: string | number, description?: string, icon: React.ElementType, className?: string }) => {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end">
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
};

const DataListItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
    </div>
);


type MetricsData = Awaited<ReturnType<typeof getDashboardMetrics>>;

export default function MetricsPage() {
  const [metrics, setMetrics] = React.useState<MetricsData | null>(null);
  const [isRefreshing, startRefresh] = React.useTransition();

  const refreshMetrics = React.useCallback(() => {
    startRefresh(async () => setMetrics(await getDashboardMetrics()));
  }, []);

  React.useEffect(() => refreshMetrics(), [refreshMetrics]);

  if (metrics && (!metrics.success || !metrics.data)) {
    return (
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Metrics Dashboard</h1>
        <p className="text-destructive">Could not load metrics. Please try again later.</p>
      </main>
    )
  }

  if (!metrics?.data) {
    return (
      <main className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold tracking-tight">Metrics Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
        </div>
      </main>
    );
  }

  const { contacts, listings, partners, lastUpdatedAt } = metrics.data;
  const formattedDate = format(new Date(lastUpdatedAt), "PPP p");

  const lastContactDate = contacts.lastContactCreatedAt 
    ? formatDistanceToNow(new Date(contacts.lastContactCreatedAt), { addSuffix: true })
    : 'N/A';
  const lastListingDate = listings.lastListingCreatedAt
    ? formatDistanceToNow(new Date(listings.lastListingCreatedAt), { addSuffix: true })
    : 'N/A';
    
  const formatCurrency = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });


  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Metrics Dashboard</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Last updated: {formattedDate}</p>
            <Button variant="outline" size="sm" onClick={refreshMetrics} disabled={isRefreshing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Total Contacts"
          value={contacts.total}
          description={`${contacts.buyers} Buyers, ${contacts.sellers} Sellers, ${contacts.contactsWithoutType} Unclassified. Last added ${lastContactDate}`}
          icon={Users}
        />
        <MetricCard
          title="Total Listings"
          value={listings.total}
          description={`${listings.available} Available, ${listings.total - listings.available} Unavailable. Last added ${lastListingDate}`}
          icon={Building}
        />
        <MetricCard
          title="Total Channel Partners"
          value={partners.total}
          description={`${partners.official} Official, ${partners.general} General`}
          icon={Handshake}
        />
        <MetricCard
            title="Available Inventory Value"
            value={`₹${formatCurrency(listings.availableInventoryValue)} Cr.`}
            description={`₹${formatCurrency(listings.totalInventoryValue)} Cr across all listing records`}
            icon={BarChart}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="h-4 w-4" />
                  Buyer Pipeline
                </CardTitle>
                <CardDescription>{contacts.buyers} buyers distributed across CRM stages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {contacts.byPipelineStage.map(item => <DataListItem key={item.stage} label={item.stage} value={item.count} />)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-4 w-4" />
                    Listing Availability
                </CardTitle>
                <CardDescription>Only available listings are used by AI matchers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                 {listings.byAvailability.map(item => <DataListItem key={item.status} label={item.status} value={item.count} />)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4" />
                  Data Quality
                </CardTitle>
                <CardDescription>Records that may need attention.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <DataListItem label="Contacts without type" value={metrics.data.dataQuality.contactsWithoutType} />
                <DataListItem label="Contacts without email" value={metrics.data.dataQuality.contactsWithoutEmail} />
                <DataListItem label="Listings without public link" value={metrics.data.dataQuality.listingsWithoutPublicLink} />
                <DataListItem label="Listings without description" value={metrics.data.dataQuality.listingsWithoutDescription} />
                <DataListItem label="Listings without carpet area" value={metrics.data.dataQuality.listingsWithoutCarpetArea} />
                <DataListItem label="Listings with zero price" value={metrics.data.dataQuality.zeroPriceListings} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  Listings by Location
                </CardTitle>
                <CardDescription>Distribution of your property inventory by area.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {metrics.data.listings.byLocation.slice(0, 10).map(item => <DataListItem key={item.location} label={item.location} value={item.count} />)}
                {metrics.data.listings.byLocation.length > 10 && <p className="pt-1 text-xs text-muted-foreground">Showing top 10 locations.</p>}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-4 w-4" />
                    Project Stage
                </CardTitle>
                <CardDescription>Construction stage of property inventory.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                 {metrics.data.listings.byStatus.map(item => <DataListItem key={item.status} label={item.status} value={item.count} />)}
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4" />
                    Contact Budgets (Crores)
                </CardTitle>
                <CardDescription>Distribution of client budgets.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-2">
                {metrics.data.contacts.byBudget.map(item => <DataListItem key={item.budget} label={`₹ ${item.budget} Cr.`} value={item.count} />)}
             </CardContent>
          </Card>
          
          <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Tag className="h-4 w-4" />
                    Listings by Price (Crores)
                </CardTitle>
                 <CardDescription>Distribution of inventory by value.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-2">
                {metrics.data.listings.byPrice.map(item => <DataListItem key={item.range} label={`₹ ${item.range} Cr.`} value={item.count} />)}
             </CardContent>
          </Card>
          
          <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Home className="h-4 w-4" />
                    Listings by Type
                </CardTitle>
                <CardDescription>Distribution of inventory by property type.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-2">
                {metrics.data.listings.byType.map(item => <DataListItem key={item.type} label={item.type} value={item.count} />)}
             </CardContent>
          </Card>

      </div>
    </main>
  );
}
