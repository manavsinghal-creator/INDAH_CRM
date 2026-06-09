
'use server';

import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';
import { z } from 'zod';
import { db, isCrmDatabaseConfigured } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, serverTimestamp, getDoc } from 'firebase/firestore';

import { ActivityAction, ActivityChange, ActivityEntityType, ActivityLog, Contact, ContactFormSchema, Listing, ListingFormSchema, ChannelPartner, ChannelPartnerFormSchema, GenerateDescriptionInputSchema, QuickPropertyMatcherInputSchema } from '@/lib/types';
import { QuickPropertyMatcherOutput } from '@/lib/types';
import {
    addDemoChannelPartner,
    addDemoContact,
    addDemoListing,
    deleteDemoChannelPartner,
    deleteDemoContact,
    deleteDemoListing,
    demoChannelPartners,
    demoContacts,
    demoListings,
    updateDemoChannelPartner,
    updateDemoContact,
    updateDemoListing,
} from '@/lib/demo-data';
import { requireAuthorizedUser } from '@/lib/auth-server';
import { PRIMARY_ADMIN_EMAIL } from '@/lib/auth-config';

const contactsCollection = collection(db, 'contacts');
const listingsCollection = collection(db, 'listings');
const channelPartnersCollection = collection(db, 'channelPartners');
const activityLogsCollection = collection(db, 'activityLogs');

function withLegacyContactOwnership(contact: Contact): Contact {
    return {
        ...contact,
        createdByName: contact.createdByName || 'Admin',
        createdByEmail: contact.createdByEmail || PRIMARY_ADMIN_EMAIL,
        updatedByName: contact.updatedByName || contact.createdByName || 'Admin',
        updatedByEmail: contact.updatedByEmail || contact.createdByEmail || PRIMARY_ADMIN_EMAIL,
    };
}

function displayActivityValue(value: unknown): string {
    if (value === undefined || value === null || value === '') return '—';
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function getActivityChanges(before: Record<string, unknown>, after: Record<string, unknown>): ActivityChange[] {
    return Object.keys(after)
        .filter((field) => displayActivityValue(before[field]) !== displayActivityValue(after[field]))
        .map((field) => ({
            field,
            before: displayActivityValue(before[field]),
            after: displayActivityValue(after[field]),
        }));
}

async function logActivity({
    userEmail,
    userName,
    action,
    entityType,
    entityId,
    entityLabel,
    changes = [],
}: {
    userEmail: string;
    userName: string;
    action: ActivityAction;
    entityType: ActivityEntityType;
    entityId: string;
    entityLabel: string;
    changes?: ActivityChange[];
}) {
    if (!isCrmDatabaseConfigured) return;
    try {
        await addDoc(activityLogsCollection, {
            userEmail,
            userName,
            action,
            entityType,
            entityId,
            entityLabel,
            changes,
            createdAt: serverTimestamp(),
        });
        revalidatePath('/activity');
    } catch (error) {
        console.error('Failed to record CRM activity', error);
    }
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
    await requireAuthorizedUser();
    noStore();
    if (!isCrmDatabaseConfigured) return [];

    try {
        const snapshot = await getDocs(query(activityLogsCollection, orderBy('createdAt', 'desc'), limit(300)));
        return snapshot.docs.map((activityDoc) => {
            const data = activityDoc.data();
            return {
                id: activityDoc.id,
                userEmail: data.userEmail || '',
                userName: data.userName || data.userEmail || '',
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId || '',
                entityLabel: data.entityLabel || data.entityId || '',
                changes: data.changes || [],
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
            } as ActivityLog;
        });
    } catch (error) {
        console.error('Failed to load CRM activity', error);
        return [];
    }
}

const WhatsAppDraftActivitySchema = z.object({
    recipientId: z.string().min(1),
    recipientName: z.string().min(1),
    recipientType: z.enum(['contact', 'channelPartner']),
    phone: z.string().min(1),
    listingIds: z.array(z.string()),
    listingNames: z.array(z.string()),
});

export async function recordWhatsAppDraftOpened(input: z.infer<typeof WhatsAppDraftActivitySchema>): Promise<{ success: boolean }> {
    const user = await requireAuthorizedUser();
    const result = WhatsAppDraftActivitySchema.safeParse(input);
    if (!result.success) return { success: false };

    await logActivity({
        userEmail: user.email,
        userName: user.name,
        action: 'whatsappDraftOpened',
        entityType: result.data.recipientType,
        entityId: result.data.recipientId,
        entityLabel: result.data.recipientName,
        changes: [
            { field: 'phone', before: '—', after: result.data.phone },
            {
                field: 'listingsIncluded',
                before: '—',
                after: result.data.listingNames.length ? result.data.listingNames.join(', ') : '—',
            },
        ],
    });
    return { success: true };
}

// CONTACT ACTIONS
export async function getContacts(): Promise<Contact[]> {
    await requireAuthorizedUser();
    noStore();
    if (!isCrmDatabaseConfigured) return demoContacts.map(withLegacyContactOwnership);
    try {
        const q = query(contactsCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return withLegacyContactOwnership({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
            } as Contact);
        });
    } catch (error) {
        return demoContacts.map(withLegacyContactOwnership);
    }
}

async function getNextSerialNumber(prefix: string, coll: any): Promise<string> {
    const q = query(coll, orderBy('serialNumber', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return `${prefix}1`;
    }
    const lastDoc = querySnapshot.docs[0];
    const lastSerialNumber = (lastDoc.data() as any).serialNumber;
    const lastNumber = parseInt(lastSerialNumber.substring(prefix.length));
    return `${prefix}${lastNumber + 1}`;
}

export async function addContact(formData: z.infer<typeof ContactFormSchema>): Promise<{ success: boolean; contact?: Contact; error?: any }> {
    const user = await requireAuthorizedUser();
    const result = ContactFormSchema.safeParse(formData);
    if (!result.success) return { success: false, error: result.error.flatten().fieldErrors };
    if (!isCrmDatabaseConfigured) {
        const contact = addDemoContact(result.data);
        revalidatePath('/');
        return { success: true, contact };
    }

    try {
        const serialNumber = await getNextSerialNumber('N', contactsCollection);
        const newContactData = {
            ...result.data,
            serialNumber,
            createdByName: user.name,
            createdByEmail: user.email,
            updatedByName: user.name,
            updatedByEmail: user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(contactsCollection, newContactData);
        revalidatePath('/');
        const docSnap = await getDoc(docRef);
        const savedData = docSnap.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'created',
            entityType: 'contact',
            entityId: docRef.id,
            entityLabel: result.data.name,
        });
        return { success: true, contact: { id: docRef.id, ...savedData, createdAt: savedData?.createdAt?.toDate().toISOString(), updatedAt: savedData?.updatedAt?.toDate().toISOString() } as Contact };
    } catch (error) {
        return { success: false, error: { _form: ['Failed to add contact.'] } };
    }
}

export async function updateContact(id: string, formData: z.infer<typeof ContactFormSchema>): Promise<{ success: boolean; contact?: Contact; error?: any }> {
    const user = await requireAuthorizedUser();
    const result = ContactFormSchema.safeParse(formData);
    if (!result.success) return { success: false, error: result.error.flatten().fieldErrors };
    if (!isCrmDatabaseConfigured) {
        const contact = updateDemoContact(id, result.data);
        if (!contact) return { success: false, error: { _form: ['Demo contact not found.'] } };
        revalidatePath('/');
        return { success: true, contact };
    }

    try {
        const contactRef = doc(db, 'contacts', id);
        const beforeSnapshot = await getDoc(contactRef);
        const beforeData = beforeSnapshot.data() || {};
        const updatedData = {
            ...result.data,
            updatedByName: user.name,
            updatedByEmail: user.email,
            updatedAt: serverTimestamp(),
        };
        await updateDoc(contactRef, updatedData);
        revalidatePath('/');
        const docSnap = await getDoc(contactRef);
        const savedData = docSnap.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'updated',
            entityType: 'contact',
            entityId: id,
            entityLabel: result.data.name,
            changes: getActivityChanges(beforeData, result.data),
        });
        return { success: true, contact: { id: id, ...savedData, createdAt: savedData?.createdAt?.toDate().toISOString(), updatedAt: savedData?.updatedAt?.toDate().toISOString() } as Contact };
    } catch (error) {
        return { success: false, error: { _form: ['Failed to update contact.'] } };
    }
}

export async function deleteContact(id: string): Promise<{ success: boolean; error?: string }> {
    const user = await requireAuthorizedUser();
    if (!isCrmDatabaseConfigured) {
        const deleted = deleteDemoContact(id);
        if (!deleted) return { success: false, error: 'Demo contact not found.' };
        revalidatePath('/');
        return { success: true };
    }
    try {
        const contactRef = doc(db, 'contacts', id);
        const beforeSnapshot = await getDoc(contactRef);
        const beforeData = beforeSnapshot.data();
        await deleteDoc(contactRef);
        revalidatePath('/');
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'deleted',
            entityType: 'contact',
            entityId: id,
            entityLabel: beforeData?.name || id,
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete contact.' };
    }
}

// LISTING ACTIONS
export async function getListings(): Promise<Listing[]> {
    await requireAuthorizedUser();
    noStore();
    if (!isCrmDatabaseConfigured) return demoListings;
    try {
        const q = query(listingsCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
            } as Listing;
        });
    } catch (error) {
        return demoListings;
    }
}

export async function getListingById(id: string): Promise<Listing | null> {
    await requireAuthorizedUser();
    if (!isCrmDatabaseConfigured) return demoListings.find((listing) => listing.id === id) || null;
    const docRef = doc(db, 'listings', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return { id: docSnap.id, ...data, createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(), updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString() } as Listing;
}

export async function addListing(formData: z.infer<typeof ListingFormSchema>): Promise<{ success: boolean; listing?: Listing; error?: any }> {
    const user = await requireAuthorizedUser();
    const result = ListingFormSchema.safeParse(formData);
    if (!result.success) return { success: false, error: result.error.flatten().fieldErrors };
    if (!isCrmDatabaseConfigured) {
        const listing = addDemoListing(result.data);
        revalidatePath('/listings');
        return { success: true, listing };
    }

    try {
        const newListingData = { ...result.data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        const docRef = await addDoc(listingsCollection, newListingData);
        revalidatePath('/listings');
        const docSnap = await getDoc(docRef);
        const savedData = docSnap.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'created',
            entityType: 'listing',
            entityId: docRef.id,
            entityLabel: result.data.listingName,
        });
        return { success: true, listing: { id: docRef.id, ...savedData, createdAt: savedData?.createdAt?.toDate().toISOString(), updatedAt: savedData?.updatedAt?.toDate().toISOString() } as Listing };
    } catch (error) {
        return { success: false, error: { _form: ['Failed to add listing.'] } };
    }
}

export async function updateListing(id: string, formData: z.infer<typeof ListingFormSchema>): Promise<{ success: boolean; listing?: Listing; error?: any }> {
    const user = await requireAuthorizedUser();
    const result = ListingFormSchema.safeParse(formData);
    if (!result.success) return { success: false, error: result.error.flatten().fieldErrors };
    if (!isCrmDatabaseConfigured) {
        const listing = updateDemoListing(id, result.data);
        if (!listing) return { success: false, error: { _form: ['Demo listing not found.'] } };
        revalidatePath('/listings');
        return { success: true, listing };
    }

    try {
        const listingRef = doc(db, 'listings', id);
        const beforeSnapshot = await getDoc(listingRef);
        const beforeData = beforeSnapshot.data() || {};
        const updatedData = { ...result.data, updatedAt: serverTimestamp() };
        await updateDoc(listingRef, updatedData);
        revalidatePath('/listings');
        const docSnap = await getDoc(listingRef);
        const savedData = docSnap.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'updated',
            entityType: 'listing',
            entityId: id,
            entityLabel: result.data.listingName,
            changes: getActivityChanges(beforeData, result.data),
        });
        return { success: true, listing: { id: id, ...savedData, createdAt: savedData?.createdAt?.toDate().toISOString(), updatedAt: savedData?.updatedAt?.toDate().toISOString() } as Listing };
    } catch (error) {
        return { success: false, error: { _form: ['Failed to update listing.'] } };
    }
}

export async function deleteListing(id: string): Promise<{ success: boolean; error?: string }> {
    const user = await requireAuthorizedUser();
    if (!isCrmDatabaseConfigured) {
        const deleted = deleteDemoListing(id);
        if (!deleted) return { success: false, error: 'Demo listing not found.' };
        revalidatePath('/listings');
        return { success: true };
    }
    try {
        const listingRef = doc(db, 'listings', id);
        const beforeSnapshot = await getDoc(listingRef);
        const beforeData = beforeSnapshot.data();
        await deleteDoc(listingRef);
        revalidatePath('/listings');
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'deleted',
            entityType: 'listing',
            entityId: id,
            entityLabel: beforeData?.listingName || id,
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete listing.' };
    }
}

// CHANNEL PARTNER ACTIONS
export async function getChannelPartners(): Promise<ChannelPartner[]> {
    await requireAuthorizedUser();
    noStore();
    if (!isCrmDatabaseConfigured) return demoChannelPartners;
    try {
        const q = query(channelPartnersCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data, createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(), updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString() } as ChannelPartner;
        });
    } catch (error) {
        return demoChannelPartners;
    }
}

export async function addChannelPartner(formData: z.infer<typeof ChannelPartnerFormSchema>): Promise<{ success: boolean; partner?: ChannelPartner; error?: any }> {
    const user = await requireAuthorizedUser();
    const result = ChannelPartnerFormSchema.safeParse(formData);
    if (!result.success) return { success: false, error: result.error.flatten().fieldErrors };
    if (!isCrmDatabaseConfigured) {
        const partner = addDemoChannelPartner(result.data);
        revalidatePath('/partners');
        return { success: true, partner };
    }

    try {
        const serialNumber = await getNextSerialNumber('P', channelPartnersCollection);
        const newPartnerData = {
            ...result.data,
            serialNumber,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(channelPartnersCollection, newPartnerData);
        revalidatePath('/partners');
        const docSnap = await getDoc(docRef);
        const savedData = docSnap.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'created',
            entityType: 'channelPartner',
            entityId: docRef.id,
            entityLabel: result.data.name,
        });
        return { success: true, partner: { id: docRef.id, ...savedData, createdAt: savedData?.createdAt?.toDate().toISOString(), updatedAt: savedData?.updatedAt?.toDate().toISOString() } as ChannelPartner };
    } catch (error) {
        return { success: false, error: { _form: ['Failed to add channel partner.'] } };
    }
}

export async function updateChannelPartner(id: string, formData: z.infer<typeof ChannelPartnerFormSchema>): Promise<{ success: boolean; partner?: ChannelPartner; error?: any }> {
    const user = await requireAuthorizedUser();
    const result = ChannelPartnerFormSchema.safeParse(formData);
    if (!result.success) return { success: false, error: result.error.flatten().fieldErrors };
    if (!isCrmDatabaseConfigured) {
        const partner = updateDemoChannelPartner(id, result.data);
        if (!partner) return { success: false, error: { _form: ['Demo channel partner not found.'] } };
        revalidatePath('/partners');
        return { success: true, partner };
    }

    try {
        const partnerRef = doc(db, 'channelPartners', id);
        const beforeSnapshot = await getDoc(partnerRef);
        const beforeData = beforeSnapshot.data() || {};
        const updatedData = { ...result.data, updatedAt: serverTimestamp() };
        await updateDoc(partnerRef, updatedData);
        revalidatePath('/partners');
        const docSnap = await getDoc(partnerRef);
        const savedData = docSnap.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'updated',
            entityType: 'channelPartner',
            entityId: id,
            entityLabel: result.data.name,
            changes: getActivityChanges(beforeData, result.data),
        });
        return { success: true, partner: { id: id, ...savedData, createdAt: savedData?.createdAt?.toDate().toISOString(), updatedAt: savedData?.updatedAt?.toDate().toISOString() } as ChannelPartner };
    } catch (error) {
        return { success: false, error: { _form: ['Failed to update channel partner.'] } };
    }
}

export async function deleteChannelPartner(id: string): Promise<{ success: boolean; error?: string }> {
    const user = await requireAuthorizedUser();
    if (!isCrmDatabaseConfigured) {
        const deleted = deleteDemoChannelPartner(id);
        if (!deleted) return { success: false, error: 'Demo channel partner not found.' };
        revalidatePath('/partners');
        return { success: true };
    }
    try {
        const partnerRef = doc(db, 'channelPartners', id);
        const beforeSnapshot = await getDoc(partnerRef);
        const beforeData = beforeSnapshot.data();
        await deleteDoc(partnerRef);
        revalidatePath('/partners');
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'deleted',
            entityType: 'channelPartner',
            entityId: id,
            entityLabel: beforeData?.name || id,
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to delete channel partner.' };
    }
}

export async function bulkAddContacts(contacts: any[]): Promise<{ success: boolean; count?: number; error?: string }> {
    await requireAuthorizedUser();
    try {
        let count = 0;
        for (const c of contacts) {
            const formData = {
                name: c.name || '',
                phone: c.phone || '',
                budget: c.budget || '<1',
                status: c.status || 'Cold',
            };
            const result = await addContact(formData as any);
            if (result.success) count++;
        }
        revalidatePath('/');
        return { success: true, count };
    } catch (error) {
        return { success: false, error: 'Failed to bulk add contacts.' };
    }
}

export async function getDashboardMetrics() {
    await requireAuthorizedUser();
    noStore();
    const contacts = await getContacts();
    const listings = await getListings();
    const partners = await getChannelPartners();

    const buyers = contacts.filter(c => c.contactType === 'Buyer').length;
    const sellers = contacts.filter(c => c.contactType === 'Seller').length;
    
    // safe property access using reduce
    const budgetCounts = contacts.reduce((acc, c) => {
        acc[c.budget] = (acc[c.budget] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const byBudget = Object.keys(budgetCounts).map(k => ({ budget: k, count: budgetCounts[k] }));

    const exclusiveListings = listings.filter(l => l.exclusiveMandate);
    const nonExclusiveListings = listings.filter(l => !l.exclusiveMandate);
    
    const calculateValue = (list: Listing[]) => list.reduce((sum, l) => sum + (Number(l.basePrice) || 0), 0);

    const locationCounts = listings.reduce((acc, l) => { acc[l.location] = (acc[l.location] || 0) + 1; return acc; }, {} as Record<string, number>);
    const byLocation = Object.keys(locationCounts).map(k => ({ location: k, count: locationCounts[k] }));

    const statusCounts = listings.reduce((acc, l) => { acc[l.projectStatus] = (acc[l.projectStatus] || 0) + 1; return acc; }, {} as Record<string, number>);
    const byStatus = Object.keys(statusCounts).map(k => ({ status: k, count: statusCounts[k] }));

    const typeCounts = listings.reduce((acc, l) => { acc[l.propertyType] = (acc[l.propertyType] || 0) + 1; return acc; }, {} as Record<string, number>);
    const byType = Object.keys(typeCounts).map(k => ({ type: k, count: typeCounts[k] }));

    // Price intervals: <1, 1-3, 3-6, >6
    const byPriceMap: Record<string, number> = { "<1": 0, "1-3": 0, "3-6": 0, ">6": 0 };
    listings.forEach(l => {
        const p = Number(l.basePrice) || 0;
        if (p < 1) byPriceMap["<1"]++;
        else if (p < 3) byPriceMap["1-3"]++;
        else if (p < 6) byPriceMap["3-6"]++;
        else byPriceMap[">6"]++;
    });
    const byPrice = Object.keys(byPriceMap).map(k => ({ range: k, count: byPriceMap[k] }));

    return {
        success: true,
        data: {
            contacts: {
                total: contacts.length,
                buyers,
                sellers,
                lastContactCreatedAt: contacts[0]?.createdAt || null,
                byBudget
            },
            listings: {
                total: listings.length,
                exclusive: exclusiveListings.length,
                nonExclusive: nonExclusiveListings.length,
                lastListingCreatedAt: listings[0]?.createdAt || null,
                totalInventoryValue: calculateValue(listings),
                exclusiveInventoryValue: calculateValue(exclusiveListings),
                nonExclusiveInventoryValue: calculateValue(nonExclusiveListings),
                byLocation,
                byStatus,
                byPrice,
                byType
            },
            partners: {
                total: partners.length,
                official: partners.filter(p => p.partnerType === 'Official').length,
                general: partners.filter(p => p.partnerType === 'General').length,
            },
            lastUpdatedAt: new Date().toISOString()
        }
    };
}

// AI actions were moved to actions-ai.ts. Use them by importing from @/app/actions-ai
