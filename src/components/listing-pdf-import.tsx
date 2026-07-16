'use client';

import * as React from 'react';
import { FileCheck2, LoaderCircle, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { importIndahListingForm } from '@/lib/indah-listing-import';
import type { ListingFormData } from '@/lib/types';

interface ListingPdfImportProps {
  onImported: (data: Partial<ListingFormData>) => void;
}

export function ListingPdfImport({ onImported }: ListingPdfImportProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({ title: 'Choose a PDF', description: 'Upload a completed INDAH listing form PDF.', variant: 'destructive' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'PDF is too large', description: 'Use an INDAH form PDF smaller than 8 MB.', variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    try {
      const data = await importIndahListingForm(file);
      onImported(data);
      toast({
        title: 'Listing form imported',
        description: 'Review the pre-filled details and complete any remaining fields before saving.',
      });
    } catch (error) {
      toast({
        title: 'Could not read this PDF',
        description: error instanceof Error ? error.message : 'Please upload a completed INDAH listing form PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className="border-b bg-muted/30 px-6 py-4" aria-label="Import INDAH listing form">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Import completed INDAH listing form</p>
          <p className="text-sm text-muted-foreground">Reads the PDF locally and pre-fills this form. Nothing is sent to AI.</p>
        </div>
        <input ref={inputRef} type="file" accept="application/pdf" className="sr-only" onChange={handleFileChange} />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isImporting} className="shrink-0">
          {isImporting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {isImporting ? 'Reading form...' : 'Upload PDF'}
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <FileCheck2 className="h-4 w-4" />
        Structured INDAH form PDFs only. Review every imported field before saving.
      </div>
    </section>
  );
}
