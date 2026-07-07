
'use server';

import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';
import { z } from 'zod';
import { db, isCrmDatabaseConfigured } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, serverTimestamp, getDoc } from 'firebase/firestore';

import { ActivityAction, ActivityChange, ActivityEntityType, ActivityLog, Contact, ContactFormSchema, Listing, ListingFormSchema, ChannelPartner, ChannelPartnerFormSchema, GenerateDescriptionInputSchema, QuickPropertyMatcherInputSchema, SiteVisit, SiteVisitFormSchema, budgetOptions, leadStageOptions, listingAvailabilityOptions, projectStatusOptions, propertyTypeOptions, type LeadStage } from '@/lib/types';
import { QuickPropertyMatcherOutput } from '@/lib/types';
import {
    addDemoChannelPartner,
    addDemoContact,
    addDemoListing,
    addDemoSiteVisit,
    deleteDemoChannelPartner,
    deleteDemoContact,
    deleteDemoListing,
    demoChannelPartners,
    demoContacts,
    demoListings,
    demoSiteVisits,
    updateDemoChannelPartner,
    updateDemoContact,
    updateDemoListing,
    updateDemoSiteVisit,
} from '@/lib/demo-data';
import { requireAuthorizedUser } from '@/lib/auth-server';
import { PRIMARY_ADMIN_EMAIL } from '@/lib/auth-config';
import { findContactDuplicates } from '@/lib/contact-duplicates';
import { getContactLeadStage, getListingAvailability, isListingAvailable } from '@/lib/crm-status';
import { clearMatchCache } from '@/lib/ai-match-cache';

const contactsCollection = collection(db, 'contacts');
const listingsCollection = collection(db, 'listings');
const channelPartnersCollection = collection(db, 'channelPartners');
const activityLogsCollection = collection(db, 'activityLogs');
const siteVisitsCollection = collection(db, 'siteVisits');

function withLegacyContactOwnership(contact: Contact): Contact {
    return {
        ...contact,
        budget: String(contact.budget) === '>10' ? '10-20' : contact.budget,
        leadStage: contact.leadStage || 'New',
        requirementPurpose: contact.requirementPurpose || [],
        closedLostReason: contact.closedLostReason || '',
        disqualifiedReason: contact.disqualifiedReason || '',
        createdByName: contact.createdByName || 'Admin',
        createdByEmail: contact.createdByEmail || PRIMARY_ADMIN_EMAIL,
        updatedByName: contact.updatedByName || contact.createdByName || 'Admin',
        updatedByEmail: contact.updatedByEmail || contact.createdByEmail || PRIMARY_ADMIN_EMAIL,
    };
}

function withLegacyListingAvailability(listing: Listing): Listing {
    return {
        ...listing,
        availabilityStatus: getListingAvailability(listing),
        listingType: listing.listingType || 'Public',
        priceOnRequest: listing.priceOnRequest || false,
        titleProjectName: listing.titleProjectName || '',
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
            const fallbackLabel = data.entityType === 'listing'
                ? 'Listing'
                : data.entityType === 'contact'
                    ? 'Contact'
                    : data.entityType === 'channelPartner'
                        ? 'Channel Partner'
                        : data.entityType === 'siteVisit'
                            ? 'Site Visit'
                            : 'Login Session';
            return {
                id: activityDoc.id,
                userEmail: data.userEmail || '',
                userName: data.userName || data.userEmail || '',
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId || '',
                entityLabel: data.entityLabel && data.entityLabel !== data.entityId
                    ? data.entityLabel
                    : fallbackLabel,
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

const EmailDraftActivitySchema = z.object({
    recipientId: z.string().min(1),
    recipientName: z.string().min(1),
    recipientType: z.enum(['contact', 'channelPartner']),
    email: z.string().email(),
    listingIds: z.array(z.string()),
    listingNames: z.array(z.string()),
});

export async function recordEmailDraftOpened(input: z.infer<typeof EmailDraftActivitySchema>): Promise<{ success: boolean }> {
    const user = await requireAuthorizedUser();
    const result = EmailDraftActivitySchema.safeParse(input);
    if (!result.success) return { success: false };

    await logActivity({
        userEmail: user.email,
        userName: user.name,
        action: 'emailDraftOpened',
        entityType: result.data.recipientType,
        entityId: result.data.recipientId,
        entityLabel: result.data.recipientName,
        changes: [
            { field: 'email', before: '—', after: result.data.email },
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
    const duplicates = findContactDuplicates(await getContacts(), result.data);
    if (duplicates.length) {
        return { success: false, error: { duplicates, _form: ['A contact with this phone number or email already exists.'] } };
    }
    if (!isCrmDatabaseConfigured) {
        const contact = addDemoContact(result.data);
        clearMatchCache();
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
        clearMatchCache();
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
    const duplicates = findContactDuplicates(await getContacts(), result.data, id);
    if (duplicates.length) {
        return { success: false, error: { duplicates, _form: ['Another contact with this phone number or email already exists.'] } };
    }
    if (!isCrmDatabaseConfigured) {
        const contact = updateDemoContact(id, result.data);
        if (!contact) return { success: false, error: { _form: ['Demo contact not found.'] } };
        clearMatchCache();
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
        clearMatchCache();
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

export async function updateContactLeadStage(id: string, leadStage: LeadStage, reason?: string): Promise<{ success: boolean; contact?: Contact; error?: string }> {
    const user = await requireAuthorizedUser();
    if (!leadStageOptions.includes(leadStage)) return { success: false, error: 'Invalid pipeline stage.' };
    const trimmedReason = reason?.trim() || '';
    if (leadStage === 'Closed/Lost' && !trimmedReason) return { success: false, error: 'Closed/Lost reason is required.' };
    if (leadStage === 'Disqualified' && !trimmedReason) return { success: false, error: 'Disqualified reason is required.' };

    if (!isCrmDatabaseConfigured) {
        const existing = demoContacts.find((contact) => contact.id === id);
        if (!existing) return { success: false, error: 'Demo contact not found.' };
        const contact = updateDemoContact(id, {
            ...existing,
            leadStage,
            closedLostReason: leadStage === 'Closed/Lost' ? trimmedReason : existing.closedLostReason || '',
            disqualifiedReason: leadStage === 'Disqualified' ? trimmedReason : existing.disqualifiedReason || '',
        });
        clearMatchCache();
        revalidatePath('/');
        return contact ? { success: true, contact } : { success: false, error: 'Demo contact not found.' };
    }

    try {
        const contactRef = doc(db, 'contacts', id);
        const beforeSnapshot = await getDoc(contactRef);
        if (!beforeSnapshot.exists()) return { success: false, error: 'Contact not found.' };
        const beforeData = beforeSnapshot.data();
        const previousStage = beforeData.leadStage || 'New';
        const updatedData = {
            leadStage,
            ...(leadStage === 'Closed/Lost' ? { closedLostReason: trimmedReason } : {}),
            ...(leadStage === 'Disqualified' ? { disqualifiedReason: trimmedReason } : {}),
            updatedByName: user.name,
            updatedByEmail: user.email,
            updatedAt: serverTimestamp(),
        };
        await updateDoc(contactRef, updatedData);
        clearMatchCache();
        revalidatePath('/');
        const savedSnapshot = await getDoc(contactRef);
        const savedData = savedSnapshot.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'updated',
            entityType: 'contact',
            entityId: id,
            entityLabel: beforeData.name || 'Contact',
            changes: displayActivityValue(previousStage) !== displayActivityValue(leadStage)
                ? [{
                    field: 'leadStage',
                    before: displayActivityValue(previousStage),
                    after: displayActivityValue(leadStage),
                },
                ...(trimmedReason ? [{
                    field: leadStage === 'Closed/Lost' ? 'closedLostReason' : 'disqualifiedReason',
                    before: '—',
                    after: trimmedReason,
                }] : [])]
                : [],
        });
        return {
            success: true,
            contact: {
                id,
                ...savedData,
                createdAt: savedData?.createdAt?.toDate().toISOString(),
                updatedAt: savedData?.updatedAt?.toDate().toISOString(),
            } as Contact,
        };
    } catch {
        return { success: false, error: 'Failed to update pipeline stage.' };
    }
}

export async function markContactPropertiesShared(
    id: string,
    listingIds: string[],
    listingLabels: string[],
    updatePipeline: boolean
): Promise<{ success: boolean; contact?: Contact; error?: string }> {
    const user = await requireAuthorizedUser();
    const uniqueListingIds = [...new Set(listingIds.filter(Boolean))];
    if (!uniqueListingIds.length) return { success: false, error: 'No listings selected.' };

    if (!isCrmDatabaseConfigured) {
        const existing = demoContacts.find((contact) => contact.id === id);
        if (!existing) return { success: false, error: 'Demo contact not found.' };
        const contact = updateDemoContact(id, {
            ...existing,
            offeredListings: [...new Set([...(existing.offeredListings || []), ...uniqueListingIds])],
            leadStage: updatePipeline ? 'Property Shared' : getContactLeadStage(existing),
        });
        clearMatchCache();
        revalidatePath('/');
        return contact ? { success: true, contact } : { success: false, error: 'Demo contact not found.' };
    }

    try {
        const contactRef = doc(db, 'contacts', id);
        const beforeSnapshot = await getDoc(contactRef);
        if (!beforeSnapshot.exists()) return { success: false, error: 'Contact not found.' };
        const beforeData = beforeSnapshot.data();
        const updatedData = {
            offeredListings: [...new Set([...(beforeData.offeredListings || []), ...uniqueListingIds])],
            leadStage: updatePipeline ? 'Property Shared' : beforeData.leadStage || 'New',
            updatedByName: user.name,
            updatedByEmail: user.email,
            updatedAt: serverTimestamp(),
        };
        await updateDoc(contactRef, updatedData);
        clearMatchCache();
        revalidatePath('/');
        const savedSnapshot = await getDoc(contactRef);
        const savedData = savedSnapshot.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'updated',
            entityType: 'contact',
            entityId: id,
            entityLabel: beforeData.name || 'Contact',
            changes: [
                {
                    field: 'propertiesShared',
                    before: '—',
                    after: listingLabels.length ? listingLabels.join(', ') : `${uniqueListingIds.length} selected properties`,
                },
                ...(displayActivityValue(beforeData.leadStage) !== displayActivityValue(updatedData.leadStage)
                    ? [{
                        field: 'leadStage',
                        before: displayActivityValue(beforeData.leadStage || 'New'),
                        after: displayActivityValue(updatedData.leadStage),
                    }]
                    : []),
            ],
        });
        return {
            success: true,
            contact: {
                id,
                ...savedData,
                createdAt: savedData?.createdAt?.toDate().toISOString(),
                updatedAt: savedData?.updatedAt?.toDate().toISOString(),
            } as Contact,
        };
    } catch {
        return { success: false, error: 'Failed to update shared properties.' };
    }
}

export async function deleteContact(id: string): Promise<{ success: boolean; error?: string }> {
    const user = await requireAuthorizedUser();
    if (!isCrmDatabaseConfigured) {
        const deleted = deleteDemoContact(id);
        if (!deleted) return { success: false, error: 'Demo contact not found.' };
        clearMatchCache();
        revalidatePath('/');
        return { success: true };
    }
    try {
        const contactRef = doc(db, 'contacts', id);
        const beforeSnapshot = await getDoc(contactRef);
        const beforeData = beforeSnapshot.data();
        await deleteDoc(contactRef);
        clearMatchCache();
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

// SITE VISIT ACTIONS
export async function getSiteVisits(): Promise<SiteVisit[]> {
    await requireAuthorizedUser();
    noStore();
    if (!isCrmDatabaseConfigured) return demoSiteVisits;

    try {
        const q = query(siteVisitsCollection, orderBy('visitAt', 'desc'), limit(300));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((siteVisitDoc) => {
            const data = siteVisitDoc.data();
            return {
                id: siteVisitDoc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
            } as SiteVisit;
        });
    } catch (error) {
        console.error('Failed to load site visits', error);
        return [];
    }
}

export async function addSiteVisit(formData: z.infer<typeof SiteVisitFormSchema>): Promise<{ success: boolean; siteVisit?: SiteVisit; contact?: Contact; error?: any }> {
    const user = await requireAuthorizedUser();
    const result = SiteVisitFormSchema.safeParse(formData);
    if (!result.success) return { success: false, error: result.error.flatten().fieldErrors };

    const contacts = await getContacts();
    const listings = await getListings();
    const contact = contacts.find((item) => item.id === result.data.contactId);
    if (!contact) return { success: false, error: { contactId: ['Selected contact was not found.'] } };

    const selectedListings = result.data.listingIds
        .map((listingId) => listings.find((listing) => listing.id === listingId))
        .filter((listing): listing is Listing => Boolean(listing));

    const listingLabels = selectedListings.map((listing) => listing.listingId
        ? `${listing.listingId} - ${listing.listingName}`
        : listing.listingName);
    const uniqueListingIds = [...new Set(result.data.listingIds.filter(Boolean))];
    const previousStage = getContactLeadStage(contact);
    const shouldUpdatePipeline = result.data.updatePipeline !== false && previousStage !== 'Site Visit';

    if (!isCrmDatabaseConfigured) {
        const siteVisit = addDemoSiteVisit(result.data, contact.name, listingLabels);
        const updatedContact = updateDemoContact(contact.id, {
            ...contact,
            offeredListings: [...new Set([...(contact.offeredListings || []), ...uniqueListingIds])],
            leadStage: shouldUpdatePipeline ? 'Site Visit' : getContactLeadStage(contact),
        }) || contact;
        clearMatchCache();
        revalidatePath('/');
        revalidatePath('/site-visits');
        revalidatePath('/activity');
        return { success: true, siteVisit, contact: updatedContact || contact };
    }

    try {
        const newSiteVisitData = {
            contactId: result.data.contactId,
            contactName: contact.name,
            listingIds: result.data.listingIds,
            listingLabels,
            visitAt: result.data.visitAt,
            notes: result.data.notes || '',
            createdByName: user.name,
            createdByEmail: user.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(siteVisitsCollection, newSiteVisitData);
        let savedContact: Contact | undefined;

        if (shouldUpdatePipeline || uniqueListingIds.length) {
            const contactRef = doc(db, 'contacts', contact.id);
            const updatedOfferedListings = [...new Set([...(contact.offeredListings || []), ...uniqueListingIds])];
            await updateDoc(contactRef, {
                ...(shouldUpdatePipeline ? { leadStage: 'Site Visit' } : {}),
                ...(uniqueListingIds.length ? { offeredListings: updatedOfferedListings } : {}),
                updatedByName: user.name,
                updatedByEmail: user.email,
                updatedAt: serverTimestamp(),
            });
            const savedContactSnap = await getDoc(contactRef);
            const savedContactData = savedContactSnap.data();
            savedContact = savedContactData
                ? {
                    id: contact.id,
                    ...savedContactData,
                    createdAt: savedContactData.createdAt?.toDate().toISOString() || contact.createdAt,
                    updatedAt: savedContactData.updatedAt?.toDate().toISOString() || new Date().toISOString(),
                } as Contact
                : undefined;
        }

        clearMatchCache();
        revalidatePath('/');
        revalidatePath('/site-visits');
        revalidatePath('/activity');

        const docSnap = await getDoc(docRef);
        const savedData = docSnap.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'siteVisitLogged',
            entityType: 'siteVisit',
            entityId: docRef.id,
            entityLabel: contact.name,
            changes: [
                { field: 'contact', before: '—', after: contact.name },
                { field: 'listingsShown', before: '—', after: listingLabels.length ? listingLabels.join(', ') : 'No listings selected' },
                ...(listingLabels.length ? [{ field: 'propertiesShared', before: '—', after: listingLabels.join(', ') }] : []),
                { field: 'visitAt', before: '—', after: result.data.visitAt },
                ...(result.data.notes ? [{ field: 'notes', before: '—', after: result.data.notes }] : []),
                ...(shouldUpdatePipeline ? [{
                    field: 'leadStage',
                    before: displayActivityValue(previousStage),
                    after: 'Site Visit',
                }] : []),
            ],
        });

        return {
            success: true,
            siteVisit: {
                id: docRef.id,
                ...savedData,
                createdAt: savedData?.createdAt?.toDate().toISOString(),
                updatedAt: savedData?.updatedAt?.toDate().toISOString(),
            } as SiteVisit,
            contact: savedContact,
        };
    } catch (error) {
        console.error('Failed to add site visit', error);
        return { success: false, error: { _form: ['Failed to log site visit.'] } };
    }
}

export async function updateSiteVisit(id: string, formData: z.infer<typeof SiteVisitFormSchema>): Promise<{ success: boolean; siteVisit?: SiteVisit; contact?: Contact; error?: any }> {
    const user = await requireAuthorizedUser();
    const result = SiteVisitFormSchema.safeParse(formData);
    if (!result.success) return { success: false, error: result.error.flatten().fieldErrors };

    const contacts = await getContacts();
    const listings = await getListings();
    const contact = contacts.find((item) => item.id === result.data.contactId);
    if (!contact) return { success: false, error: { contactId: ['Selected contact was not found.'] } };

    const selectedListings = result.data.listingIds
        .map((listingId) => listings.find((listing) => listing.id === listingId))
        .filter((listing): listing is Listing => Boolean(listing));

    const listingLabels = selectedListings.map((listing) => listing.listingId
        ? `${listing.listingId} - ${listing.listingName}`
        : listing.listingName);
    const uniqueListingIds = [...new Set(result.data.listingIds.filter(Boolean))];

    if (!isCrmDatabaseConfigured) {
        const siteVisit = updateDemoSiteVisit(id, result.data, contact.name, listingLabels);
        if (!siteVisit) return { success: false, error: { _form: ['Demo site visit not found.'] } };
        const updatedContact = uniqueListingIds.length
            ? updateDemoContact(contact.id, {
                ...contact,
                offeredListings: [...new Set([...(contact.offeredListings || []), ...uniqueListingIds])],
            }) || contact
            : contact;
        clearMatchCache();
        revalidatePath('/');
        revalidatePath('/site-visits');
        revalidatePath('/activity');
        return { success: true, siteVisit, contact: updatedContact };
    }

    try {
        const siteVisitRef = doc(db, 'siteVisits', id);
        const beforeSnapshot = await getDoc(siteVisitRef);
        if (!beforeSnapshot.exists()) return { success: false, error: { _form: ['Site visit not found.'] } };
        const beforeData = beforeSnapshot.data();

        const updatedData = {
            contactId: result.data.contactId,
            contactName: contact.name,
            listingIds: result.data.listingIds,
            listingLabels,
            visitAt: result.data.visitAt,
            notes: result.data.notes || '',
            updatedAt: serverTimestamp(),
        };

        await updateDoc(siteVisitRef, updatedData);

        let savedContact: Contact | undefined;
        if (uniqueListingIds.length) {
            const contactRef = doc(db, 'contacts', contact.id);
            const updatedOfferedListings = [...new Set([...(contact.offeredListings || []), ...uniqueListingIds])];
            await updateDoc(contactRef, {
                offeredListings: updatedOfferedListings,
                updatedByName: user.name,
                updatedByEmail: user.email,
                updatedAt: serverTimestamp(),
            });
            const savedContactSnap = await getDoc(contactRef);
            const savedContactData = savedContactSnap.data();
            savedContact = savedContactData
                ? {
                    id: contact.id,
                    ...savedContactData,
                    createdAt: savedContactData.createdAt?.toDate().toISOString() || contact.createdAt,
                    updatedAt: savedContactData.updatedAt?.toDate().toISOString() || new Date().toISOString(),
                } as Contact
                : undefined;
        }

        clearMatchCache();
        revalidatePath('/');
        revalidatePath('/site-visits');
        revalidatePath('/activity');

        const docSnap = await getDoc(siteVisitRef);
        const savedData = docSnap.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'updated',
            entityType: 'siteVisit',
            entityId: id,
            entityLabel: contact.name,
            changes: getActivityChanges({
                contactName: beforeData.contactName,
                listingLabels: beforeData.listingLabels || [],
                visitAt: beforeData.visitAt,
                notes: beforeData.notes || '',
            }, {
                contactName: contact.name,
                listingLabels,
                visitAt: result.data.visitAt,
                notes: result.data.notes || '',
            }),
        });

        return {
            success: true,
            siteVisit: {
                id,
                ...savedData,
                createdAt: savedData?.createdAt?.toDate().toISOString(),
                updatedAt: savedData?.updatedAt?.toDate().toISOString(),
            } as SiteVisit,
            contact: savedContact,
        };
    } catch (error) {
        console.error('Failed to update site visit', error);
        return { success: false, error: { _form: ['Failed to update site visit.'] } };
    }
}

// LISTING ACTIONS
export async function getListings(): Promise<Listing[]> {
    await requireAuthorizedUser();
    noStore();
    if (!isCrmDatabaseConfigured) return demoListings.map(withLegacyListingAvailability);
    try {
        const q = query(listingsCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return withLegacyListingAvailability({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
            } as Listing);
        });
    } catch (error) {
        return demoListings.map(withLegacyListingAvailability);
    }
}

export async function getListingById(id: string): Promise<Listing | null> {
    await requireAuthorizedUser();
    if (!isCrmDatabaseConfigured) {
        const listing = demoListings.find((item) => item.id === id);
        return listing ? withLegacyListingAvailability(listing) : null;
    }
    const docRef = doc(db, 'listings', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return withLegacyListingAvailability({ id: docSnap.id, ...data, createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(), updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString() } as Listing);
}

export async function addListing(formData: z.infer<typeof ListingFormSchema>): Promise<{ success: boolean; listing?: Listing; error?: any }> {
    const user = await requireAuthorizedUser();
    const result = ListingFormSchema.safeParse(formData);
    if (!result.success) return { success: false, error: result.error.flatten().fieldErrors };
    if (!isCrmDatabaseConfigured) {
        const listing = addDemoListing(result.data);
        clearMatchCache();
        revalidatePath('/listings');
        return { success: true, listing };
    }

    try {
        const newListingData = {
            ...result.data,
            isActive: result.data.availabilityStatus === 'Available',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(listingsCollection, newListingData);
        clearMatchCache();
        revalidatePath('/listings');
        const docSnap = await getDoc(docRef);
        const savedData = docSnap.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'created',
            entityType: 'listing',
            entityId: docRef.id,
            entityLabel: result.data.listingId
                ? `${result.data.listingId} - ${result.data.listingName}`
                : result.data.listingName,
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
        clearMatchCache();
        revalidatePath('/listings');
        return { success: true, listing };
    }

    try {
        const listingRef = doc(db, 'listings', id);
        const beforeSnapshot = await getDoc(listingRef);
        const beforeData = beforeSnapshot.data() || {};
        const updatedData = {
            ...result.data,
            isActive: result.data.availabilityStatus === 'Available',
            updatedAt: serverTimestamp(),
        };
        await updateDoc(listingRef, updatedData);
        clearMatchCache();
        revalidatePath('/listings');
        const docSnap = await getDoc(listingRef);
        const savedData = docSnap.data();
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'updated',
            entityType: 'listing',
            entityId: id,
            entityLabel: result.data.listingId
                ? `${result.data.listingId} - ${result.data.listingName}`
                : result.data.listingName,
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
        clearMatchCache();
        revalidatePath('/listings');
        return { success: true };
    }
    try {
        const listingRef = doc(db, 'listings', id);
        const beforeSnapshot = await getDoc(listingRef);
        const beforeData = beforeSnapshot.data();
        await deleteDoc(listingRef);
        clearMatchCache();
        revalidatePath('/listings');
        await logActivity({
            userEmail: user.email,
            userName: user.name,
            action: 'deleted',
            entityType: 'listing',
            entityId: id,
            entityLabel: beforeData?.listingId
                ? `${beforeData.listingId} - ${beforeData.listingName || 'Listing'}`
                : beforeData?.listingName || 'Listing',
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
    const contactsWithoutType = contacts.length - buyers - sellers;
    const activeContacts = contacts.filter(c => c.isActive !== false).length;
    const inactiveContacts = contacts.length - activeContacts;
    
    const budgetCounts = contacts.reduce((acc, c) => {
        acc[c.budget] = (acc[c.budget] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const byBudget = budgetOptions.map(budget => ({ budget, count: budgetCounts[budget] || 0 }));

    const pipelineCounts = contacts
        .filter(contact => contact.contactType === 'Buyer')
        .reduce((acc, contact) => {
            const stage = getContactLeadStage(contact);
            acc[stage] = (acc[stage] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    const byPipelineStage = leadStageOptions.map(stage => ({ stage, count: pipelineCounts[stage] || 0 }));

    const exclusiveListings = listings.filter(l => l.exclusiveMandate);
    const nonExclusiveListings = listings.filter(l => !l.exclusiveMandate);
    const availableListings = listings.filter(isListingAvailable);
    
    const calculateValue = (list: Listing[]) => list.reduce((sum, l) => sum + (Number(l.basePrice) || 0), 0);

    const locationCounts = listings.reduce((acc, l) => {
        const location = l.location?.trim() || 'Not specified';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const byLocation = Object.keys(locationCounts)
        .map(location => ({ location, count: locationCounts[location] }))
        .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location));

    const statusCounts = listings.reduce((acc, l) => { acc[l.projectStatus] = (acc[l.projectStatus] || 0) + 1; return acc; }, {} as Record<string, number>);
    const byStatus = projectStatusOptions.map(status => ({ status, count: statusCounts[status] || 0 }));

    const availabilityCounts = listings.reduce((acc, listing) => {
        const status = getListingAvailability(listing);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const byAvailability = listingAvailabilityOptions.map(status => ({ status, count: availabilityCounts[status] || 0 }));

    const typeCounts = listings.reduce((acc, l) => { acc[l.propertyType] = (acc[l.propertyType] || 0) + 1; return acc; }, {} as Record<string, number>);
    const byType = propertyTypeOptions
        .map(type => ({ type, count: typeCounts[type] || 0 }))
        .filter(item => item.count > 0);

    const byPriceMap: Record<string, number> = { "<1": 0, "1-3": 0, "3-6": 0, ">6": 0 };
    listings.forEach(l => {
        const p = Number(l.basePrice) || 0;
        if (p < 1) byPriceMap["<1"]++;
        else if (p <= 3) byPriceMap["1-3"]++;
        else if (p <= 6) byPriceMap["3-6"]++;
        else byPriceMap[">6"]++;
    });
    const byPrice = Object.keys(byPriceMap).map(k => ({ range: k, count: byPriceMap[k] }));

    const latestDate = (values: string[]) => values
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

    return {
        success: true,
        data: {
            contacts: {
                total: contacts.length,
                buyers,
                sellers,
                contactsWithoutType,
                active: activeContacts,
                inactive: inactiveContacts,
                lastContactCreatedAt: latestDate(contacts.map(contact => contact.createdAt)),
                byBudget,
                byPipelineStage,
            },
            listings: {
                total: listings.length,
                available: availableListings.length,
                exclusive: exclusiveListings.length,
                nonExclusive: nonExclusiveListings.length,
                lastListingCreatedAt: latestDate(listings.map(listing => listing.createdAt)),
                totalInventoryValue: calculateValue(listings),
                availableInventoryValue: calculateValue(availableListings),
                exclusiveInventoryValue: calculateValue(exclusiveListings),
                nonExclusiveInventoryValue: calculateValue(nonExclusiveListings),
                byLocation,
                byStatus,
                byAvailability,
                byPrice,
                byType,
            },
            partners: {
                total: partners.length,
                official: partners.filter(p => p.partnerType === 'Official').length,
                general: partners.filter(p => p.partnerType === 'General').length,
            },
            dataQuality: {
                contactsWithoutType,
                contactsWithoutEmail: contacts.filter(contact => !contact.email).length,
                listingsWithoutPublicLink: listings.filter(listing => !listing.listingUrl && !listing.externalPublicLink).length,
                listingsWithoutDescription: listings.filter(listing => !listing.description).length,
                listingsWithoutCarpetArea: listings.filter(listing => !listing.carpetArea).length,
                zeroPriceListings: listings.filter(listing => !Number(listing.basePrice)).length,
            },
            lastUpdatedAt: new Date().toISOString()
        }
    };
}

// AI actions were moved to actions-ai.ts. Use them by importing from @/app/actions-ai
