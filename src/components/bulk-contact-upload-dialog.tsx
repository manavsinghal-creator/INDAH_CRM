
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { bulkAddContacts } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { FileText, Download, Upload, FileUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';

interface BulkContactUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function BulkContactUploadDialog({ isOpen, onOpenChange }: BulkContactUploadDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        title: 'No File Selected',
        description: 'Please select a CSV file to upload.',
        variant: 'destructive',
      });
      return;
    }

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const data = results.data;

            if (!Array.isArray(data)) {
                toast({
                    title: 'Invalid File',
                    description: 'The CSV file could not be processed correctly.',
                    variant: 'destructive',
                });
                return;
            }

            startTransition(async () => {
              const result = await bulkAddContacts(data);
              if (result.success) {
                toast({
                  title: 'Upload Successful!',
                  description: `${result.count} new contacts were added.`,
                });
                onOpenChange(false);
                router.refresh();
              } else {
                 toast({
                    title: 'Upload Failed',
                    description: result.error || 'An unknown error occurred.',
                    variant: 'destructive',
                });
              }
            });
        },
        error: (error) => {
             toast({
              title: 'Parsing Error',
              description: error.message,
              variant: 'destructive',
            });
        }
    });
  };
  
  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Upload Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV file with a list of contacts to add them in bulk.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Alert>
            <FileUp className="h-4 w-4" />
            <AlertTitle>Instructions</AlertTitle>
            <AlertDescription>
                <p className="mb-2">
                    Your CSV file must contain headers that match the contact fields (e.g., name, email, phone, budget).
                </p>
                <Button asChild variant="link" className="p-0 h-auto">
                    <a href="/contacts-template.csv" download>
                        <Download className="mr-2" />
                        Download Template
                    </a>
                </Button>
            </AlertDescription>
          </Alert>

          <div className="grid w-full items-center gap-2">
            <Label htmlFor="contact-file">CSV File</Label>
            <Input id="contact-file" type="file" accept=".csv" onChange={handleFileChange} />
             {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <span className="ml-auto text-xs">{Math.round(file.size / 1024)} KB</span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || isPending}>
            <Upload className="mr-2" />
            {isPending ? 'Uploading...' : 'Upload and Add Contacts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
