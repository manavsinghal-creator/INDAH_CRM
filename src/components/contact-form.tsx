
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { addContact, updateContact } from '@/app/actions';
import {
  Contact,
  ContactFormSchema,
  ContactFormData,
  budgetOptions,
  contactTypeOptions,
  leadStageOptions,
  propertyTypeOptions,
  requirementPurposeOptions,
  Listing,
} from '@/lib/types';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertTriangle } from 'lucide-react';
import { findContactDuplicates, type ContactDuplicate } from '@/lib/contact-duplicates';

interface ContactFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  contact?: Contact | null;
  allContacts: Contact[];
  allListings: Listing[];
  onSaved?: (contact: Contact) => void;
  initialValues?: Partial<ContactFormData>;
}

const defaultFormValues: Partial<ContactFormData> = {
  name: '',
  email: '',
  phone: '',
  budget: "<1",
  status: "Cold",
  city: '',
  contactType: undefined,
  leadStage: 'New',
  locationPreference: '',
  requirementPurpose: [],
  propertyPreference: [],
  offeredListings: [],
  notes: '',
  referenceContact: '',
  isActive: true,
};

export function ContactForm({
  isOpen,
  onOpenChange,
  contact,
  allContacts,
  allListings,
  onSaved,
  initialValues,
}: ContactFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(ContactFormSchema),
    defaultValues: defaultFormValues,
  });

  React.useEffect(() => {
    if (isOpen) {
      if (contact) {
        const contactValues: ContactFormData = {
          name: contact.name || '',
          email: contact.email || '',
          phone: contact.phone || '',
          budget: contact.budget,
          status: contact.status,
          city: contact.city || '',
          contactType: contact.contactType || undefined,
          leadStage: contact.leadStage || 'New',
          locationPreference: contact.locationPreference || '',
          requirementPurpose: contact.requirementPurpose || [],
          propertyPreference: contact.propertyPreference || [],
          offeredListings: contact.offeredListings || [],
          notes: contact.notes || '',
          referenceContact: contact.referenceContact || '',
          isActive: contact.isActive ?? true,
        };
        form.reset(contactValues);
      } else {
        form.reset({ ...defaultFormValues, ...initialValues });
      }
    }
  }, [isOpen, contact, form, initialValues]);

  const phone = form.watch('phone');
  const email = form.watch('email');
  const duplicates = React.useMemo(
    () => findContactDuplicates(allContacts, { phone, email }, contact?.id),
    [allContacts, contact?.id, email, phone]
  );

  const onSubmit = (data: ContactFormData) => {
    startTransition(async () => {
      const action = contact ? updateContact(contact.id, data) : addContact(data);
      const result = await action;

      if (result.success && result.contact) {
        toast({
          title: 'Success!',
          description: `Contact ${contact ? 'updated' : 'added'} successfully.`,
        });
        onSaved?.(result.contact);
        onOpenChange(false);
        router.refresh();
      } else {
        const serverDuplicates = result.error?.duplicates as ContactDuplicate[] | undefined;
        toast({
          title: serverDuplicates?.length ? 'Duplicate Contact' : 'Error',
          description: serverDuplicates?.length
            ? `${serverDuplicates[0].name} already uses this ${serverDuplicates[0].matchedFields.join(' and ')}.`
            : result.error?._form?.[0] || 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
                <DialogTitle>{contact ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
                <DialogDescription>
                    {contact ? `Viewing and editing details for ${contact.name}.` : 'Fill in the details for the new contact.'}
                </DialogDescription>
            </div>
             <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor="isActive" className="text-sm font-medium">
                      {field.value ? 'Active' : 'Inactive'}
                    </Label>
                  </FormItem>
                )}
              />
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {duplicates.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Possible duplicate contact</AlertTitle>
                <AlertDescription>
                  {duplicates.map((duplicate) => (
                    <span key={duplicate.id} className="block">
                      {duplicate.name} ({duplicate.serialNumber}) already has this {duplicate.matchedFields.join(' and ')}.
                    </span>
                  ))}
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email ID</FormLabel><FormControl><Input type="email" placeholder="e.g. john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g. 9876543210" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="budget" render={({ field }) => (
                <FormItem><FormLabel>Preferred Budget (crores)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a budget range" /></SelectTrigger></FormControl>
                    <SelectContent>{budgetOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="e.g. Mumbai" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="contactType" render={({ field }) => (
                <FormItem><FormLabel>Contact Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select contact type" /></SelectTrigger></FormControl>
                    <SelectContent>{contactTypeOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="leadStage" render={({ field }) => (
                <FormItem><FormLabel>Lead Pipeline Stage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select pipeline stage" /></SelectTrigger></FormControl>
                    <SelectContent>{leadStageOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="locationPreference" render={({ field }) => (
                <FormItem><FormLabel>Location Preference</FormLabel><FormControl><Input placeholder="e.g. South Delhi, Gurgaon" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="referenceContact" render={({ field }) => (
                <FormItem><FormLabel>Reference Contact</FormLabel><FormControl><Input placeholder="e.g. Referral name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField
              control={form.control}
              name="requirementPurpose"
              render={() => (
                <FormItem>
                  <FormLabel>Requirement Purpose</FormLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {requirementPurposeOptions.map((item) => (
                      <FormField
                        key={item}
                        control={form.control}
                        name="requirementPurpose"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), item])
                                    : field.onChange((field.value || []).filter((value) => value !== item));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">{item}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="propertyPreference"
              render={() => (
                <FormItem>
                    <FormLabel>Property Preference</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {propertyTypeOptions.map((item) => (
                          <FormField
                            key={item}
                            control={form.control}
                            name="propertyPreference"
                            render={({ field }) => {
                              return (
                                <FormItem key={item} className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-3">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), item])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value !== item
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">{item}</FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                    </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="offeredListings"
              render={() => (
                <FormItem>
                    <FormLabel>Offered Listings</FormLabel>
                    <ScrollArea className="h-48 rounded-md border">
                        <div className="p-4 grid grid-cols-1 gap-2">
                            {allListings.map((listing) => (
                              <FormField
                                key={listing.id}
                                control={form.control}
                                name="offeredListings"
                                render={({ field }) => {
                                  return (
                                    <FormItem key={listing.id} className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(listing.id)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), listing.id])
                                              : field.onChange(
                                                  (field.value || []).filter(
                                                    (value) => value !== listing.id
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal text-sm">{listing.listingName} ({listing.listingId})</FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                        </div>
                    </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Interaction Notes</FormLabel><FormControl>
                    <Textarea placeholder="Log calls, emails, and meeting notes here..." className="min-h-[120px]" {...field} />
                </FormControl><FormMessage /></FormItem>
            )} />
            
            {contact && <Separator />}

            {contact && (
              <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                      <span className="font-medium">Created:</span> {contact.createdAt ? format(new Date(contact.createdAt), "PPP p") : '-'}
                  </div>
                  <div>
                      <span className="font-medium">Last Updated:</span> {contact.updatedAt ? format(new Date(contact.updatedAt), "PPP p") : '-'}
                  </div>
              </div>
            )}

            <DialogFooter className="pt-6 sticky bottom-0 bg-card -mx-6 px-6 pb-6 -mb-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending || duplicates.length > 0}>
                {isPending ? 'Saving...' : contact ? 'Save Changes' : 'Add Contact'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
