

'use client';

import * as React from 'react';
import { getContacts, getListings } from '@/app/actions';
import type { Task, Contact, Listing } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Lightbulb, ListTodo, User, Building, Phone, MessageSquare } from 'lucide-react';
import Link from 'next/link';

const priorityVariantMap: Record<Task['priority'], 'destructive' | 'accent' | 'secondary'> = {
    High: 'destructive',
    Medium: 'accent',
    Low: 'secondary'
};

const categoryIconMap: Record<Task['category'], React.ElementType> = {
    Contact: User,
    Listing: Building,
};

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const Icon = categoryIconMap[task.category];
    const link = task.category === 'Contact' ? `/` : `/listings?edit=${task.relatedId}`;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                           <Icon className="h-5 w-5" />
                           {task.title}
                        </CardTitle>
                        <CardDescription className="mt-1">{task.description}</CardDescription>
                    </div>
                    <Badge variant={priorityVariantMap[task.priority]}>{task.priority}</Badge>
                </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-muted-foreground">
                    {task.category}: <span className="font-semibold text-foreground">{task.relatedName}</span>
                </p>
                <div className="flex items-center gap-2">
                    {task.category === 'Contact' && task.phone && (
                        <>
                        <Button asChild variant="outline" size="sm">
                            <a href={`tel:${task.phone}`}>
                                <Phone className="mr-2 h-4 w-4" />
                                Call
                            </a>
                        </Button>
                        </>
                    )}
                    <Button asChild variant="outline" size="sm">
                        <Link href={link}>
                            {task.suggestedAction}
                            <ArrowRight className="ml-2 h-4 w-4"/>
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function generateTasks(contacts: Contact[], listings: Listing[]): Task[] {
    const tasks: Task[] = [];
    const now = new Date();
    const newThresholdDays = 3;
    const hotLeadThresholdDays = 7;
    const warmLeadStaleDays = 4;
    const coldLeadReEngageDays = 7;

    // Rule 1: New Lead Needs Attention
    contacts.forEach((contact, index) => {
        const contactAge = differenceInDays(now, parseISO(contact.createdAt));
        if (index < 5 && contactAge <= newThresholdDays && (!contact.offeredListings || contact.offeredListings.length === 0)) {
            tasks.push({
                title: 'New Lead Needs Engagement',
                description: `${contact.name} was added recently but hasn't been offered any properties yet.`,
                category: 'Contact',
                priority: 'High',
                relatedId: contact.id,
                relatedName: contact.name,
                suggestedAction: 'Engage Lead',
                phone: contact.phone,
            });
        }
    });

    // Rule 2: Hot Lead Follow-up
    contacts.forEach((contact) => {
        const lastUpdatedDays = differenceInDays(now, parseISO(contact.updatedAt));
        if (contact.status === 'Hot' && lastUpdatedDays > hotLeadThresholdDays) {
            tasks.push({
                title: 'Follow Up with Hot Lead',
                description: `${contact.name} is a hot lead but hasn't been updated in over a week. Time to check in.`,
                category: 'Contact',
                priority: 'High',
                relatedId: contact.id,
                relatedName: contact.name,
                suggestedAction: 'Follow Up',
                phone: contact.phone,
            });
        }
    });

    // Rule 3: Stale "Warm" Lead Check-in
    contacts.forEach((contact) => {
        const lastUpdatedDays = differenceInDays(now, parseISO(contact.updatedAt));
        if (contact.status === 'Warm' && lastUpdatedDays > warmLeadStaleDays) {
            tasks.push({
                title: 'Stale "Warm" Lead',
                description: `It's been over a month since the last update for ${contact.name}. Check in to see if their needs have changed.`,
                category: 'Contact',
                priority: 'Medium',
                relatedId: contact.id,
                relatedName: contact.name,
                suggestedAction: 'Review Contact',
                phone: contact.phone,
            });
        }
    });

    // Rule 4: Re-engage "Cold" Lead
    contacts.forEach((contact) => {
        const lastUpdatedDays = differenceInDays(now, parseISO(contact.updatedAt));
        if (contact.status === 'Cold' && lastUpdatedDays > coldLeadReEngageDays) {
            tasks.push({
                title: 'Re-engage Cold Lead',
                description: `${contact.name} has been cold for over 2 months. Consider reaching out with a new opportunity to revive interest.`,
                category: 'Contact',
                priority: 'Low',
                relatedId: contact.id,
                relatedName: contact.name,
                suggestedAction: 'Re-engage',
                phone: contact.phone,
            });
        }
    });

    // Rule 5: Follow-up on Offered Listings
    contacts.forEach((contact) => {
        const lastUpdatedDays = differenceInDays(now, parseISO(contact.updatedAt));
        if (contact.offeredListings && contact.offeredListings.length > 0 && lastUpdatedDays > 7) {
            // Avoid creating duplicate tasks if a 'Hot' or 'Warm' lead task already exists for the same reason
            const alreadyHasFollowUpTask = tasks.some(t => t.relatedId === contact.id && (t.title.includes('Hot Lead') || t.title.includes('Warm Lead')));
            if (!alreadyHasFollowUpTask) {
                tasks.push({
                    title: 'Feedback on Offered Listings',
                    description: `You shared listings with ${contact.name} over a week ago. Follow up to get their feedback.`,
                    category: 'Contact',
                    priority: 'Medium',
                    relatedId: contact.id,
                    relatedName: contact.name,
                    suggestedAction: 'Get Feedback',
                    phone: contact.phone,
                });
            }
        }
    });


    // Rule 6: Upload Approved Listing
    listings.forEach((listing) => {
        if (listing.websiteStatus === 'Approved for website upload') {
            tasks.push({
                title: 'Upload Approved Listing',
                description: `Listing "${listing.listingName}" is approved but not yet live on the website.`,
                category: 'Listing',
                priority: 'High',
                relatedId: listing.id,
                relatedName: listing.listingName,
                suggestedAction: 'Update & Upload',
            });
        }
    });
    
    // Rule 7: Complete Listing Description
    listings.forEach((listing) => {
        if (!listing.description) {
            tasks.push({
                title: 'Complete Listing Description',
                description: `The description for "${listing.listingName}" is missing. A good description is key for marketing.`,
                category: 'Listing',
                priority: 'Medium',
                relatedId: listing.id,
                relatedName: listing.listingName,
                suggestedAction: 'Generate Description',
            });
        }
    });

    // Rule 8: Add Carpet Area
    listings.forEach((listing) => {
        if (!listing.carpetArea || listing.carpetArea === 0) {
            tasks.push({
                title: 'Add Carpet Area',
                description: `"${listing.listingName}" is missing the carpet area. This is a crucial detail for buyers.`,
                category: 'Listing',
                priority: 'Medium',
                relatedId: listing.id,
                relatedName: listing.listingName,
                suggestedAction: 'Update Listing',
            });
        }
    });
    
    // Rule 9: Enhance Listing for Sharing
     listings.forEach((listing) => {
        if (!listing.listingUrl && !listing.externalPublicLink) {
            tasks.push({
                title: 'Add Public Link to Listing',
                description: `"${listing.listingName}" is missing a website URL or an external public link, which is important for sharing.`,
                category: 'Listing',
                priority: 'Medium',
                relatedId: listing.id,
                relatedName: listing.listingName,
                suggestedAction: 'Update Listing',
            });
        }
    });


    // Remove duplicate tasks based on a unique key
    const uniqueTasks = Array.from(new Map(tasks.map(task => [`${task.relatedId}-${task.title}`, task])).values());

    // Sort tasks by priority
    const priorityOrder: Record<Task['priority'], number> = { High: 1, Medium: 2, Low: 3 };
    uniqueTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return uniqueTasks;
}


export default function TasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsLoading(true);
    Promise.all([getContacts(), getListings()])
      .then(([contacts, listings]) => {
          const generatedTasks = generateTasks(contacts, listings);
          setTasks(generatedTasks);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to fetch data to generate tasks.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);
  
  const contactTasks = tasks.filter(t => t.category === 'Contact');
  const listingTasks = tasks.filter(t => t.category === 'Listing');

  return (
    <main className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ListTodo className="h-8 w-8 text-primary"/>
            Intelligent Task Board
        </h1>
        <p className="text-lg text-muted-foreground">
            Your smart to-do list. Key action items based on your CRM data.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
            <AlertTitle>Error Loading Tasks</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && tasks.length === 0 && (
         <Alert>
            <Lightbulb className="h-4 w-4"/>
            <AlertTitle>All Caught Up!</AlertTitle>
            <AlertDescription>
                No pending tasks found. Great job keeping your CRM data up to date!
            </AlertDescription>
        </Alert>
      )}
      
      {!isLoading && tasks.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Contact Tasks ({contactTasks.length})</h2>
                {contactTasks.length > 0 ? (
                    contactTasks.map((task, i) => <TaskCard key={`contact-${i}`} task={task} />)
                ) : (
                    <p className="text-muted-foreground">No contact-related tasks right now.</p>
                )}
            </div>
            <div className="space-y-6">
                <h2 className="text-2xl font-semibold">Listing Tasks ({listingTasks.length})</h2>
                 {listingTasks.length > 0 ? (
                    listingTasks.map((task, i) => <TaskCard key={`listing-${i}`} task={task} />)
                ) : (
                     <p className="text-muted-foreground">No listing-related tasks right now.</p>
                )}
            </div>
          </div>
      )}
    </main>
  );
}
