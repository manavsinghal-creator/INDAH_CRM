
'use client';

import { getDashboardMetrics } from "@/app/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building, Handshake, Users, MapPin, ListChecks, Wallet, Tag, Home, BarChart } from "lucide-react";
import { format, formatRelative } from 'date-fns';
import { cn } from "@/lib/utils";
import React from "react";

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

  React.useEffect(() => {
    getDashboardMetrics().then(setMetrics);
  }, []);

  if (!metrics) {
    return (
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Metrics Dashboard</h1>
        <p>Loading metrics...</p>
      </main>
    )
  }

  if (!metrics.success || !metrics.data) {
    return (
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Metrics Dashboard</h1>
        <p className="text-destructive">Could not load metrics. Please try again later.</p>
      </main>
    )
  }

  const { contacts, listings, partners, lastUpdatedAt } = metrics.data;
  const formattedDate = format(new Date(lastUpdatedAt), "PPP p");

  const lastContactDate = contacts.lastContactCreatedAt 
    ? formatRelative(new Date(contacts.lastContactCreatedAt), new Date())
    : 'N/A';
  const lastListingDate = listings.lastListingCreatedAt
    ? formatRelative(new Date(listings.lastListingCreatedAt), new Date())
    : 'N/A';
    
  const formatCurrency = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });


  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Metrics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Last updated: {formattedDate}</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard
          title="Total Contacts"
          value={contacts.total}
          description={`${contacts.buyers} Buyers, ${contacts.sellers} Sellers. Last added: ${lastContactDate}`}
          icon={Users}
        />
        <MetricCard
          title="Total Listings"
          value={listings.total}
          description={`${listings.exclusive} Exclusive, ${listings.nonExclusive} Non-Exclusive. Last added: ${lastListingDate}`}
          icon={Building}
        />
        <MetricCard
          title="Total Channel Partners"
          value={partners.total}
          description={`${partners.official} Official, ${partners.general} General`}
          icon={Handshake}
        />
        <MetricCard
            title="Total Inventory Value"
            value={`₹${formatCurrency(listings.totalInventoryValue)} Cr.`}
            description={`₹${formatCurrency(listings.exclusiveInventoryValue)} Cr Exclusive, ₹${formatCurrency(listings.nonExclusiveInventoryValue)} Cr Non-Exclusive`}
            icon={BarChart}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  Listings by Location
                </CardTitle>
                <CardDescription>Distribution of your property inventory by area.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {metrics.data.listings.byLocation.map((item: {location: string; count: number}, index: number) => <DataListItem key={index} label={item.location} value={item.count} />)}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-4 w-4" />
                    Listing Status
                </CardTitle>
                <CardDescription>Current state of property inventory.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                 {metrics.data.listings.byStatus.map((item: {status: string; count: number}, index: number) => <DataListItem key={index} label={item.status} value={item.count} />)}
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
                {metrics.data.contacts.byBudget.map((item: {budget: string; count: number}, index: number) => <DataListItem key={index} label={`₹ ${item.budget} Cr.`} value={item.count} />)}
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
                {metrics.data.listings.byPrice.map((item: {range: string; count: number}, index: number) => <DataListItem key={index} label={`₹ ${item.range} Cr.`} value={item.count} />)}
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
                {metrics.data.listings.byType.map((item: {type: string; count: number}, index: number) => <DataListItem key={index} label={item.type} value={item.count} />)}
             </CardContent>
          </Card>

      </div>
    </main>
  );
}
