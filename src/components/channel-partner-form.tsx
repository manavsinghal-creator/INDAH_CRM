
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
import { addChannelPartner, updateChannelPartner } from '@/app/actions';
import {
  ChannelPartner,
  ChannelPartnerFormSchema,
  ChannelPartnerFormData,
  clienteleTypeOptions,
  investmentPreferenceOptions,
  partnerTypeOptions,
} from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface ChannelPartnerFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  partner?: ChannelPartner | null;
}

const defaultFormValues: ChannelPartnerFormData = {
  name: '',
  companyName: '',
  email: '',
  phone: '',
  alternatePhone: '',
  city: '',
  partnerType: 'General',
  clienteleType: 'Medium',
  investmentPreference: 'Residential',
};

export function ChannelPartnerForm({
  isOpen,
  onOpenChange,
  partner,
}: ChannelPartnerFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ChannelPartnerFormData>({
    resolver: zodResolver(ChannelPartnerFormSchema),
    defaultValues: defaultFormValues,
  });

  React.useEffect(() => {
    if (isOpen) {
      if (partner) {
        form.reset(partner);
      } else {
        form.reset(defaultFormValues);
      }
    }
  }, [isOpen, partner, form]);

  const onSubmit = (data: ChannelPartnerFormData) => {
    startTransition(async () => {
      const action = partner ? updateChannelPartner(partner.id, data) : addChannelPartner(data);
      const result = await action;

      if (result.success && result.partner) {
        toast({
          title: 'Success!',
          description: `Partner ${partner ? 'updated' : 'added'} successfully.`,
        });
        onOpenChange(false);
        router.refresh();
      } else {
        toast({
          title: 'Error',
          description: 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{partner ? 'Edit Partner' : 'Add New Partner'}</DialogTitle>
          <DialogDescription>
            {partner ? `Editing details for ${partner.name}.` : 'Fill in the details for the new channel partner.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem><FormLabel>Company Name (Optional)</FormLabel><FormControl><Input placeholder="e.g. JD Realty" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email ID (Optional)</FormLabel><FormControl><Input type="email" placeholder="e.g. john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="e.g. 9876543210" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="alternatePhone" render={({ field }) => (
                <FormItem><FormLabel>Alternate Phone Number</FormLabel><FormControl><Input placeholder="e.g. 8765432109" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="e.g. Mumbai" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="partnerType" render={({ field }) => (
                <FormItem><FormLabel>Partner Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select partner type" /></SelectTrigger></FormControl>
                    <SelectContent>{partnerTypeOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="clienteleType" render={({ field }) => (
                <FormItem><FormLabel>Type of Clientele</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select clientele type" /></SelectTrigger></FormControl>
                    <SelectContent>{clienteleTypeOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="investmentPreference" render={({ field }) => (
                <FormItem><FormLabel>Investment Preferred</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select preference" /></SelectTrigger></FormControl>
                    <SelectContent>{investmentPreferenceOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter className="pt-6 sticky bottom-0 bg-card -mx-6 px-6 pb-6 -mb-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : partner ? 'Save Changes' : 'Add Partner'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
