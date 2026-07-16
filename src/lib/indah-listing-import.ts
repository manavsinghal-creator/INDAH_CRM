import type { ListingFormData } from '@/lib/types';

type PdfTextItem = {
  str: string;
  transform: number[];
};

type TextLine = {
  text: string;
  x: number;
  y: number;
};

type PdfPage = {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>;
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type RenderedPdfPage = {
  context: CanvasRenderingContext2D;
  viewport: { width: number; height: number };
};

const amenities = [
  'Water softening plants', 'Sewage treatment plant', 'Atmospheric water generator', 'Heat pumps',
  'Solar Panels', 'Rainwater Harvesting', 'Modular Kitchen', 'Automated Smart Homes', 'Terrace',
  'Power Backup', 'Powder Room', 'Lift', 'Garden', 'Office', 'Jacuzzi', 'Home Theatre',
  'Yoga and Meditation Room', 'Pet-Friendly Facilities', 'Children’s Playground', 'Library and Reading Room',
  'BBQ and Picnic Area', 'Community Clubhouse', 'Gym/Fitness Center', '24/7 Security', 'Swimming Pool',
  'Heated Pool', 'Automatic main door',
] as const;

const usps = [
  'mediterranean', 'walk to beach', 'prime lane', 'sunset view', 'near cafes', 'near nightlife',
  'quiet lane', 'clubhouse', 'clear title', 'high roi', 'rental friendly', 'homestay potential',
  'family friendly', 'pet friendly', 'boho chic', 'portuguese', 'bali style', 'modern minimal',
  'rustic luxe', 'designer home', 'municipal water', 'hill view', 'paddy field view', 'amazing pool',
  'top-class location', 'river view', 'sea view', 'tropical villa', 'heritage home',
  'serviced apartment', 'duplex', 'high ceilings', 'beach front', 'high-speed internet',
  'Modern Portuguese Villa', '2 Side road excess', 'Vaastu Approved',
] as const;

const marketingMaterials = ['Brochure', 'Floor Plans', '3D Elevations', 'Renders', 'Virtual Tour'] as const;

function normalize(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\*/g, '')
    .trim()
    .toLowerCase();
}

function cleanValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toDateInput(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const monthMatch = value.trim().match(/^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})$/i);
  if (monthMatch) {
    const month = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ].indexOf(monthMatch[1].toLowerCase()) + 1;
    return `${monthMatch[2]}-${String(month).padStart(2, '0')}-01`;
  }

  const dateMatch = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dateMatch) {
    return `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
  }

  return undefined;
}

function linesFromItems(items: PdfTextItem[]): TextLine[] {
  const grouped = new Map<string, PdfTextItem[]>();

  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = item.transform[5];
    const key = Math.round(y / 2) * 2;
    grouped.set(String(key), [...(grouped.get(String(key)) || []), item]);
  }

  return Array.from(grouped.values())
    .map((lineItems) => {
      const sorted = [...lineItems].sort((a, b) => a.transform[4] - b.transform[4]);
      return {
        text: cleanValue(sorted.map((item) => item.str).join('')),
        x: sorted[0].transform[4],
        y: sorted[0].transform[5],
      };
    })
    .filter((line) => line.y > 40 && line.y < 800)
    .sort((a, b) => b.y - a.y);
}

function valueBelow(lines: TextLine[], label: string): string | undefined {
  const labelLine = lines.find((line) => normalize(line.text) === normalize(label));
  if (!labelLine) return undefined;

  const valueLine = lines.find((line) => (
    line.y < labelLine.y - 18
    && line.y > labelLine.y - 95
    && line.x < 220
    && line.text !== '*'
  ));

  return valueLine ? cleanValue(valueLine.text) : undefined;
}

function findLine(lines: TextLine[], value: string): TextLine | undefined {
  const target = normalize(value);
  return lines.find((line) => normalize(line.text) === target);
}

async function renderForSelection(page: PdfPage): Promise<RenderedPdfPage | undefined> {
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;

  await page.render({ canvasContext: context, viewport }).promise;
  return { context, viewport };
}

function isSelected(renderedPage: RenderedPdfPage, line: TextLine): boolean {
  const { context, viewport } = renderedPage;
  const scale = viewport.width / 594.96;
  const centerX = Math.round(54 * scale);
  const centerY = Math.round(viewport.height - line.y * scale + 4 * scale);
  const radius = Math.max(9, Math.round(11 * scale));
  const image = context.getImageData(centerX - radius, centerY - radius, radius * 2, radius * 2).data;
  let filledPixels = 0;

  for (let index = 0; index < image.length; index += 4) {
    const [red, green, blue, alpha] = image.slice(index, index + 4);
    if (alpha > 180 && green < 115 && red < 90 && blue < 115) filledPixels += 1;
  }

  return filledPixels > 55;
}

async function selectedOptions(page: PdfPage, lines: TextLine[], options: readonly string[]): Promise<string[]> {
  const renderedPage = await renderForSelection(page);
  if (!renderedPage) return [];
  const selected: string[] = [];

  for (const option of options) {
    const line = findLine(lines, option);
    if (line && isSelected(renderedPage, line)) selected.push(option);
  }

  return selected;
}

function mapProjectStatus(selected: string[]): ListingFormData['projectStatus'] | undefined {
  if (selected.includes('Pre-launch')) return 'Pre-Launch';
  if (selected.includes('Under Construction')) return 'Under Construction';
  if (selected.includes('Ready to Move-in')) return 'Ready to Move';
  return undefined;
}

function mapPropertyType(selected: string[]): ListingFormData['propertyType'] | undefined {
  return selected.find((option): option is ListingFormData['propertyType'] => (
    option === 'Villa' || option === 'Apartment' || option === 'Plot' || option === 'Commercial'
  ));
}

export async function importIndahListingForm(file: File): Promise<Partial<ListingFormData>> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise as unknown as PdfDocument;

  if (pdf.numPages < 4) {
    throw new Error('This does not appear to be an INDAH listing form PDF.');
  }

  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, async (_, index) => {
      const page = await pdf.getPage(index + 1);
      const content = await page.getTextContent();
      return { page, lines: linesFromItems(content.items) };
    }),
  );

  const firstPage = pages[0].lines;
  const secondPage = pages[1].lines;
  const thirdPage = pages[2].lines;
  const fourthPage = pages[3].lines;
  const fifthPage = pages[4];
  const sixthPage = pages[5];
  const seventhPage = pages[6];
  const eighthPage = pages[7];

  const projectName = valueBelow(firstPage, 'Project Name');
  const contactPersonValue = valueBelow(firstPage, 'Contact Person (Name & Contact Number)');
  const contactPhone = contactPersonValue?.match(/(?:\+?91[\s-]?)?\d[\d\s-]{8,}\d/)?.[0];
  const selectedProjectStatuses = await selectedOptions(pages[1].page, secondPage, ['Pre-launch', 'Under Construction', 'Ready to Move-in']);
  const selectedPropertyTypes = await selectedOptions(pages[1].page, secondPage, ['Villa', 'Apartment', 'Plot', 'Commercial']);
  const selectedBhks = await selectedOptions(pages[2].page, thirdPage, ['1', '2', '3', '4']);
  const selectedAmenities = [
    ...(fifthPage ? await selectedOptions(fifthPage.page, fifthPage.lines, amenities) : []),
    ...(sixthPage ? await selectedOptions(sixthPage.page, sixthPage.lines, amenities) : []),
  ];
  const selectedUsps = [
    ...(seventhPage ? await selectedOptions(seventhPage.page, seventhPage.lines, usps) : []),
    ...(eighthPage ? await selectedOptions(eighthPage.page, eighthPage.lines, usps) : []),
  ];
  const selectedMaterials = eighthPage ? await selectedOptions(eighthPage.page, eighthPage.lines, marketingMaterials) : [];

  const basePrice = toNumber(valueBelow(fourthPage, 'Base Price (in Crores)'));
  const builtUpArea = toNumber(valueBelow(thirdPage, 'Built-Up Area (sq.ft)'));
  const propertyAddress = valueBelow(firstPage, 'Location/Address');
  const cleanContactName = contactPersonValue?.replace(/(?:\+?91[\s-]?)?\d[\d\s-]{8,}\d/, '').replace(/[,-]+$/, '').trim();

  const imported: Partial<ListingFormData> = {
    listingName: projectName,
    projectName,
    titleProjectName: projectName,
    developerName: valueBelow(firstPage, 'Builder/Developer Name'),
    contactPerson: cleanContactName || contactPersonValue,
    phone: contactPhone?.replace(/\D/g, ''),
    propertyAddress,
    location: propertyAddress,
    reraRegistration: valueBelow(firstPage, 'RERA Registration No.'),
    architectDesigner: valueBelow(secondPage, 'Architect/Designer'),
    expectedPossessionDate: toDateInput(valueBelow(secondPage, 'Expected Possession Date')),
    projectStatus: mapProjectStatus(selectedProjectStatuses),
    propertyType: mapPropertyType(selectedPropertyTypes),
    bhkConfiguration: selectedBhks[0] ? `${selectedBhks[0]} BHK` as ListingFormData['bhkConfiguration'] : undefined,
    builtUpArea,
    carpetArea: toNumber(valueBelow(thirdPage, 'Carpet Area (sq.ft)')),
    totalUnits: toNumber(valueBelow(thirdPage, 'Total Units in Project')),
    availableUnits: toNumber(valueBelow(thirdPage, 'Available Inventory')),
    floors: valueBelow(thirdPage, 'Number of Floors'),
    basePrice,
    pricePerSqFt: toNumber(valueBelow(fourthPage, 'Price per sq. ft.')),
    priceOnRequest: basePrice ? false : undefined,
    amenities: Array.from(new Set(selectedAmenities)),
    usps: Array.from(new Set(selectedUsps)),
    marketingMaterials: selectedMaterials,
  };

  return Object.fromEntries(
    Object.entries(imported).filter(([, value]) => value !== undefined),
  ) as Partial<ListingFormData>;
}
