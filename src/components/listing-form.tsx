
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
import { addListing, updateListing } from '@/app/actions';
// import { generateListingDescription } ... moved to fetch
import {
  Listing,
  ListingFormSchema,
  ListingFormData,
  propertyTypeOptions,
  projectStatusOptions,
  websiteStatusOptions,
  bhkOptions,
  constructionQualityOptions,
  accessibilityOptions,
  highlightOptions,
  furnishingOptions,
  GenerateDescriptionInputSchema,
  uspTagOptions,
  listingAvailabilityOptions,
  listingTypeOptions,
} from '@/lib/types';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { getListingAvailability } from '@/lib/crm-status';

interface ListingFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  listing?: Listing | null;
}

const defaultValues: ListingFormData = {
    listingId: '',
    listingName: '',
    projectName: '',
    titleProjectName: '',
    developerName: '',
    contactPerson: '',
    phone: '',
    email: '',
    propertyAddress: '',
    location: '',
    description: '',
    dateOfMeeting: '',
    propertyType: 'Villa',
    propertyTypeOther: '',
    furnishing: undefined,
    projectStatus: 'Ready to Move',
    websiteStatus: undefined,
    highlight: undefined,
    expectedPossessionDate: '',
    bhkConfiguration: '3 BHK',
    builtUpArea: 0,
    carpetArea: 0,
    plotArea: 0,
    floors: '',
    unitFloor: '',
    totalUnits: 0,
    availableUnits: 0,
    priceOnRequest: false,
    basePrice: 0,
    pricePerSqFt: 0,
    taxesApplicable: [],
    taxesApplicableOther: '',
    paymentSchedule: '',
    amenities: [],
    reraRegistration: '',
    titleClear: false,
    completionCertificate: '',
    constructionQuality: 'High',
    architectDesigner: '',
    exclusiveMandate: false,
    marketingMaterials: [],
    listingUrl: '',
    externalPublicLink: '',
    virtualTourLink: '',
    stagingAvailable: false,
    modelFlatReady: false,
    idealBuyerProfile: '',
    accessibility: 'Main Road',
    distanceFromMainRoad: '',
    usps: [],
    notes: '',
    additionalActions: [],
    availabilityStatus: 'Available',
    listingType: 'Public',
    isActive: true,
};

const taxesOptions = ["GST", "Stamp Duty", "Registration"];
const amenitiesOptions = [ "Water softening plants", "Sewage treatment plant", "Atmospheric water generator", "Heat pumps", "Solar Panels", "Rainwater Harvesting", "Modular Kitchen", "Automated Smart Homes", "Terrace", "Power Backup", "Powder Room", "Lift", "Garden", "Office", "Jacuzzi", "Home Theatre", "Yoga and Meditation Room", "Pet-Friendly Facilities", "Children’s Playground", "Library and Reading Room", "BBQ and Picnic Area", "Community Clubhouse", "Gym/Fitness Center", "24/7 Security", "Swimming Pool", "Heated Pool", "Automatic main door" ];
const marketingMaterialOptions = ["Brochure", "Floor Plans", "3D Elevations", "Sample Flat Photos"];
const additionalActionsOptions = ["Legal Verification", "Site Visit", "Photography", "Video Walkthrough"];

export function ListingForm({
  isOpen,
  onOpenChange,
  listing,
}: ListingFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const [isGenerating, startGenerating] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ListingFormData>({
    resolver: zodResolver(ListingFormSchema),
    defaultValues: defaultValues,
  });
  
  const basePrice = form.watch('basePrice');
  const builtUpArea = form.watch('builtUpArea');
  const priceOnRequest = form.watch('priceOnRequest');

  React.useEffect(() => {
    if (priceOnRequest) {
      form.setValue('pricePerSqFt', 0);
      return;
    }
    if (basePrice && builtUpArea && basePrice > 0 && builtUpArea > 0) {
      const priceInRupees = basePrice * 10000000;
      const pricePerSqFt = Math.round(priceInRupees / builtUpArea);
      if (!isNaN(pricePerSqFt) && isFinite(pricePerSqFt)) {
          form.setValue('pricePerSqFt', pricePerSqFt, { shouldValidate: true });
      } else {
          form.setValue('pricePerSqFt', 0);
      }
    } else {
        form.setValue('pricePerSqFt', 0);
    }
  }, [basePrice, builtUpArea, form, priceOnRequest]);

  const handleGenerateDescription = async () => {
    startGenerating(async () => {
      const formData = form.getValues();
      const parseResult = GenerateDescriptionInputSchema.safeParse(formData);

      if (!parseResult.success) {
        toast({
          title: "Missing Information",
          description: "Please fill in key details like name, location, type, BHK, area, and USPs before generating.",
          variant: "destructive"
        });
        return;
      }
      
      const response = await fetch('/api/ai/listing-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parseResult.data)
      });
      const result = await response.json();

      if (result.success && result.data?.description) {
        form.setValue('description', result.data.description, { shouldValidate: true });
        toast({ title: "Description Generated!", description: "The AI-generated description has been added to the form." });
      } else {
        toast({ title: "Generation Failed", description: result.error || 'The AI could not generate a description.', variant: 'destructive' });
      }
    });
  };

  React.useEffect(() => {
    if (isOpen) {
      if (listing) {
        const isDuplicate = !listing.id;
        const initialData = {
          ...defaultValues,
          ...listing,
          listingId: isDuplicate ? '' : listing.listingId || '',
          availabilityStatus: getListingAvailability(listing),
          isActive: getListingAvailability(listing) === 'Available',
        };
        form.reset(initialData);
      } else {
        form.reset(defaultValues);
      }
    }
  }, [isOpen, listing, form]);

  const onSubmit = (data: ListingFormData) => {
    startTransition(async () => {
      const listingData = { ...data, isActive: data.availabilityStatus === 'Available' };
      const action = listing?.id ? updateListing(listing.id, listingData) : addListing(listingData);
      const result = await action;

      if (result.success && result.listing) {
        toast({ title: 'Success!', description: `Listing ${listing?.id ? 'updated' : 'added'} successfully.` });
        onOpenChange(false);
        router.refresh();
      } else {
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
      }
    });
  };
  
  const CheckboxGroup = ({ name, options }: { name: "amenities" | "taxesApplicable" | "marketingMaterials" | "additionalActions" | "usps", options: readonly string[] | string[] }) => (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {options.map((item) => (
              <FormField
                key={item}
                control={form.control}
                name={name}
                render={({ field }) => (
                    <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(item)}
                          onCheckedChange={(checked) => {
                            return checked
                              ? field.onChange([...(field.value || []), item])
                              : field.onChange((field.value || []).filter((value) => value !== item))
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal text-sm capitalize">{item}</FormLabel>
                    </FormItem>
                )}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  
  const BooleanCheckbox = ({ name, label }: { name: "titleClear" | "exclusiveMandate" | "stagingAvailable" | "modelFlatReady", label: string }) => (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-1">
            <div className="space-y-0.5">
              <FormLabel>{label}</FormLabel>
            </div>
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
           <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{listing?.id ? 'Edit Listing' : 'Add New Listing'}</DialogTitle>
                <DialogDescription>
                    {listing?.id ? `Viewing and editing details for ${listing.projectName}.` : 'Fill in the details for the new property listing.'}
                </DialogDescription>
              </div>
              <FormField control={form.control} name="availabilityStatus" render={({ field }) => (
                <div className="min-w-52 space-y-2"><Label>Availability</Label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{listingAvailabilityOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )} />
           </div>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] pr-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="listingId" render={({ field }) => ( <FormItem><FormLabel>Listing ID</FormLabel><FormControl><Input placeholder="e.g. L1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="listingName" render={({ field }) => ( <FormItem><FormLabel>Listing Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="projectName" render={({ field }) => ( <FormItem><FormLabel>Project Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="titleProjectName" render={({ field }) => ( <FormItem><FormLabel>Title Project Name</FormLabel><FormControl><Input placeholder="Public-facing project title" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="developerName" render={({ field }) => ( <FormItem><FormLabel>Builder / Developer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="contactPerson" render={({ field }) => ( <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="propertyAddress" render={({ field }) => ( <FormItem><FormLabel>Property Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="location" render={({ field }) => ( <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="dateOfMeeting" render={({ field }) => ( <FormItem><FormLabel>Date of Meeting</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                     <FormField control={form.control} name="description" render={({ field }) => ( 
                        <FormItem>
                            <div className="flex items-center justify-between">
                                <FormLabel>Listing Description</FormLabel>
                                <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGenerating}>
                                    <Sparkles className="mr-2 h-4 w-4"/>
                                    {isGenerating ? 'Generating...' : 'Generate with AI'}
                                </Button>
                            </div>
                            <FormControl><Textarea placeholder="Enter description..." {...field} className="min-h-[120px]" /></FormControl>
                            <FormMessage />
                        </FormItem> 
                     )} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Property Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name="propertyType" render={({ field }) => (
                        <FormItem><FormLabel>Property Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                <SelectContent>{propertyTypeOptions.filter((o) => o !== 'Other').map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="listingType" render={({ field }) => (
                        <FormItem><FormLabel>Listing Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{listingTypeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="projectStatus" render={({ field }) => (
                        <FormItem><FormLabel>Project Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{projectStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="websiteStatus" render={({ field }) => (
                        <FormItem><FormLabel>Website Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                                <SelectContent>{websiteStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="highlight" render={({ field }) => (
                        <FormItem><FormLabel>Highlight</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select highlight" /></SelectTrigger></FormControl>
                                <SelectContent>{highlightOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="furnishing" render={({ field }) => (
                        <FormItem><FormLabel>Furnishing</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select furnishing" /></SelectTrigger></FormControl>
                                <SelectContent>{furnishingOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="expectedPossessionDate" render={({ field }) => ( <FormItem><FormLabel>Expected Possession</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="bhkConfiguration" render={({ field }) => (
                        <FormItem><FormLabel>BHK Config</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>{bhkOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Area & Unit Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name="builtUpArea" render={({ field }) => ( <FormItem><FormLabel>Built-up Area (sq.ft)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="carpetArea" render={({ field }) => ( <FormItem><FormLabel>Carpet Area (sq.ft)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="plotArea" render={({ field }) => ( <FormItem><FormLabel>Plot Area (sq.m)</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="floors" render={({ field }) => ( <FormItem><FormLabel>Number of Floors</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="unitFloor" render={({ field }) => ( <FormItem><FormLabel>Unit Floor Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="totalUnits" render={({ field }) => ( <FormItem><FormLabel>Total Units</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="availableUnits" render={({ field }) => ( <FormItem><FormLabel>Available Units</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Pricing & Payment</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FormField control={form.control} name="priceOnRequest" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Price on Request</FormLabel></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="basePrice" render={({ field }) => ( <FormItem><FormLabel>Price (Cr)</FormLabel><FormControl><Input type="number" min="0" step="0.1" disabled={priceOnRequest} {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="pricePerSqFt" render={({ field }) => ( <FormItem><FormLabel>Price per sq.ft</FormLabel><FormControl><Input type="number" min="0" readOnly disabled={priceOnRequest} {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="taxesApplicableOther" render={({ field }) => ( <FormItem><FormLabel>Other Taxes</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <div><FormLabel>Taxes Applicable</FormLabel><CheckboxGroup name="taxesApplicable" options={taxesOptions} /></div>
                    <FormField control={form.control} name="paymentSchedule" render={({ field }) => ( <FormItem><FormLabel>Payment Schedule</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Amenities & USPs</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div><FormLabel>Amenities</FormLabel><CheckboxGroup name="amenities" options={amenitiesOptions} /></div>
                    <div><FormLabel>USPs</FormLabel><CheckboxGroup name="usps" options={uspTagOptions} /></div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Legal & Quality</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="reraRegistration" render={({ field }) => ( <FormItem><FormLabel>RERA Registration</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="completionCertificate" render={({ field }) => ( <FormItem><FormLabel>Completion Certificate</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="architectDesigner" render={({ field }) => ( <FormItem><FormLabel>Architect / Designer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="constructionQuality" render={({ field }) => (
                            <FormItem><FormLabel>Construction Quality</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select quality" /></SelectTrigger></FormControl>
                                    <SelectContent>{constructionQualityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )} />
                        <BooleanCheckbox name="titleClear" label="Title Clear" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Marketing & Sales</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div><FormLabel>Marketing Materials</FormLabel><CheckboxGroup name="marketingMaterials" options={marketingMaterialOptions} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="listingUrl" render={({ field }) => ( <FormItem><FormLabel>Listing URL</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="externalPublicLink" render={({ field }) => ( <FormItem><FormLabel>External Public Link</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="virtualTourLink" render={({ field }) => ( <FormItem><FormLabel>Virtual Tour Link</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <BooleanCheckbox name="exclusiveMandate" label="Exclusive Mandate" />
                        <BooleanCheckbox name="stagingAvailable" label="Staging Available" />
                        <BooleanCheckbox name="modelFlatReady" label="Model Flat Ready" />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Additional Details</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="idealBuyerProfile" render={({ field }) => ( <FormItem><FormLabel>Ideal Buyer Profile</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="accessibility" render={({ field }) => (
                            <FormItem><FormLabel>Accessibility</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select accessibility" /></SelectTrigger></FormControl>
                                    <SelectContent>{accessibilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="distanceFromMainRoad" render={({ field }) => ( <FormItem><FormLabel>Distance from Main Road</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <div><FormLabel>Additional Actions Required</FormLabel><CheckboxGroup name="additionalActions" options={additionalActionsOptions} /></div>
                    <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes & Observations</FormLabel><FormControl><Textarea className="min-h-28" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </CardContent>
            </Card>
            <DialogFooter className="pt-6 sticky bottom-0 bg-card -mx-6 px-6 pb-6 -mb-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
