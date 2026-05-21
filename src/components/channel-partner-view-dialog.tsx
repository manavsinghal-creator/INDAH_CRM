
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ChannelPartner } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Building, Phone, Mail, User, MapPin, Briefcase } from 'lucide-react';

interface ChannelPartnerViewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  partner: ChannelPartner;
}

const DetailItem: React.FC<{ icon: React.ElementType, label: string; value?: string | null; children?: React.ReactNode }> = ({ icon: Icon, label, value, children }) => {
    const content = value ?? children;
    if (!content) return null;
    return (
        <div className="flex items-start gap-4">
            <Icon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="grid gap-1 text-sm">
                <p className="font-medium">{label}</p>
                <div className="text-muted-foreground break-words">{content}</div>
            </div>
        </div>
    );
};

export function ChannelPartnerViewDialog({ isOpen, onOpenChange, partner }: ChannelPartnerViewDialogProps) {
  if (!partner) return null;

  const initials = partner.name.split(' ').map((n) => n[0]).join('');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
            <div className="flex flex-col items-center text-center gap-4 pt-4">
                <Avatar className="h-20 w-20 text-2xl">
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                    <DialogTitle className="text-2xl">{partner.name}</DialogTitle>
                    <DialogDescription>
                        {partner.companyName} (ID: {partner.serialNumber})
                    </DialogDescription>
                </div>
            </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-4">
            <DetailItem icon={Mail} label="Email Address" value={partner.email} />
            <Separator />
            <DetailItem icon={Phone} label="Phone Number" value={partner.phone} />
            {partner.alternatePhone && (
                <>
                    <Separator />
                    <DetailItem icon={Phone} label="Alternate Phone" value={partner.alternatePhone} />
                </>
            )}
            <Separator />
            <DetailItem icon={MapPin} label="City" value={partner.city} />
            <Separator />
            <div className="grid grid-cols-1 gap-4">
                 <DetailItem icon={Briefcase} label="Partner Type">
                    <Badge variant={partner.partnerType === 'Official' ? 'default' : 'secondary'}>{partner.partnerType}</Badge>
                 </DetailItem>
                 <DetailItem icon={User} label="Clientele Type">
                    <Badge variant="outline">{partner.clienteleType}</Badge>
                 </DetailItem>
                 <DetailItem icon={Building} label="Investment Preference">
                    <Badge variant="outline">{partner.investmentPreference}</Badge>
                 </DetailItem>
            </div>
             <Separator/>
             <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground text-center">
                <span>Partner since: {format(new Date(partner.createdAt), "PPP")}</span>
                <span>Last updated: {format(new Date(partner.updatedAt), "PPP p")}</span>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="border-t pt-4">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
