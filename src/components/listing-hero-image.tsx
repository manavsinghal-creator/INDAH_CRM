'use client';

import * as React from 'react';
import Image from 'next/image';
import { ImageIcon, LoaderCircle, Upload, X } from 'lucide-react';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPersistentFirebaseAuth } from '@/lib/firebase-auth-client';
import { cn } from '@/lib/utils';
import { storage } from '@/lib/firebase';

type HeroImageSize = 'thumbnail' | 'card' | 'detail';

const heroImageClasses: Record<HeroImageSize, string> = {
  thumbnail: 'h-12 w-16 shrink-0',
  card: 'h-40 w-full',
  detail: 'h-56 w-full sm:h-72',
};

interface ListingHeroImageProps {
  src?: string;
  alt: string;
  size?: HeroImageSize;
  className?: string;
}

export function ListingHeroImage({ src, alt, size = 'thumbnail', className }: ListingHeroImageProps) {
  const [hasError, setHasError] = React.useState(false);
  const showImage = Boolean(src) && !hasError;

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  return (
    <div className={cn('relative overflow-hidden rounded-md border bg-muted', heroImageClasses[size], className)}>
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes={size === 'thumbnail' ? '64px' : size === 'card' ? '(max-width: 640px) 100vw, 320px' : '(max-width: 640px) 100vw, 896px'}
          className="object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-muted/70 px-2 text-center text-muted-foreground">
          <ImageIcon className={cn(size === 'detail' ? 'h-8 w-8' : 'h-5 w-5')} aria-hidden="true" />
          <span className={cn('font-medium', size === 'thumbnail' ? 'text-[10px]' : 'text-xs')}>No hero image</span>
        </div>
      )}
    </div>
  );
}

interface ListingHeroImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  listingLabel?: string;
}

async function compressImage(file: File): Promise<Blob> {
  const imageBitmapSupported = typeof createImageBitmap === 'function';
  const source = imageBitmapSupported
    ? await createImageBitmap(file)
    : await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not read this image.'));
      };
      image.src = objectUrl;
    });
  const maxDimension = 1800;
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing is unavailable in this browser.');
  context.drawImage(source, 0, 0, width, height);
  if ('close' in source) source.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not prepare this image.'));
    }, 'image/webp', 0.84);
  });
}

export function ListingHeroImageUpload({ value, onChange, listingLabel }: ListingHeroImageUploadProps) {
  const [isUploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputId = React.useId();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Choose an image smaller than 8 MB.');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      // Storage uses the signed-in user's Firebase token. Refresh it before uploading
      // so a long-lived CRM tab cannot send a stale credential.
      const auth = await getPersistentFirebaseAuth();
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user) throw new Error('AUTH_REQUIRED');
      await user.getIdToken(true);

      const compressedImage = await compressImage(file);
      const safeLabel = (listingLabel || 'new-listing').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const imageRef = ref(storage, `listing-hero-images/${safeLabel || 'listing'}-${Date.now()}.webp`);
      await uploadBytes(imageRef, compressedImage, { contentType: 'image/webp' });
      onChange(await getDownloadURL(imageRef));
    } catch (uploadError) {
      console.error('Listing hero image upload failed', uploadError);
      const errorCode = typeof uploadError === 'object' && uploadError && 'code' in uploadError
        ? String(uploadError.code)
        : '';
      if (uploadError instanceof Error && uploadError.message === 'AUTH_REQUIRED') {
        setError('Your Firebase sign-in has expired. Sign out of the CRM, sign back in, then upload again.');
      } else if (errorCode === 'storage/unauthorized') {
        setError('Firebase Storage rejected this signed-in account. Confirm the Storage Rules are published, then sign out and sign back in once.');
      } else {
        setError('The image could not be uploaded. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-4 sm:grid-cols-[12rem_1fr] sm:items-start">
      <ListingHeroImage src={value} alt="Listing hero image preview" size="card" className="h-36 sm:w-48" />
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Hero image</p>
          <p className="text-sm text-muted-foreground">Optional. A JPG, PNG, or WebP image is compressed before upload for faster mobile use.</p>
        </div>
        <Input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleFileChange} disabled={isUploading} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild disabled={isUploading}>
            <label htmlFor={inputId} className="cursor-pointer">
              {isUploading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isUploading ? 'Uploading...' : value ? 'Replace image' : 'Upload image'}
            </label>
          </Button>
          {value && (
            <Button type="button" variant="ghost" onClick={() => onChange('')} disabled={isUploading}>
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </div>
    </div>
  );
}
