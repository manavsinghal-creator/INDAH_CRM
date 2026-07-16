import { jsPDF } from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';

import { getListingAvailability } from '@/lib/crm-status';
import { formatListingPricePlain, getListingDisplayTitle } from '@/lib/listing-display';
import type { Listing } from '@/lib/types';

type PdfDoc = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

type PdfMode = 'internal' | 'external';

const brand = {
  black: [18, 18, 18] as [number, number, number],
  charcoal: [42, 42, 42] as [number, number, number],
  muted: [105, 105, 105] as [number, number, number],
  gold: [178, 143, 82] as [number, number, number],
  paleGold: [248, 244, 235] as [number, number, number],
  line: [224, 224, 224] as [number, number, number],
};

function display(value: unknown) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  if (typeof value === 'number') return Number(value).toLocaleString('en-IN');
  return String(value);
}

function dateDisplay(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function filenameForListing(listing: Listing, mode: PdfMode) {
  const id = listing.listingId || 'listing';
  const title = getListingDisplayTitle(listing) || listing.projectName || 'details';
  return `${id}-${title}-${mode === 'internal' ? 'internal' : 'client'}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    || 'listing-details';
}

function sectionRows(rows: Array<[string, unknown]>): RowInput[] {
  return rows.map(([label, value]) => [label, display(value)]);
}

function setRgb(doc: jsPDF, method: 'setTextColor' | 'setFillColor' | 'setDrawColor', color: [number, number, number]) {
  doc[method](color[0], color[1], color[2]);
}

function addIndahLogo(doc: jsPDF, x: number, y: number) {
  setRgb(doc, 'setDrawColor', brand.black);
  doc.setLineWidth(0.35);
  doc.rect(x, y, 16, 16);
  setRgb(doc, 'setFillColor', brand.black);
  doc.rect(x + 2.2, y + 2.2, 11.6, 11.6, 'F');
  setRgb(doc, 'setTextColor', [255, 255, 255]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('IN', x + 8, y + 9.5, { align: 'center' });

  setRgb(doc, 'setTextColor', brand.black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('INDAH', x + 21, y + 6.8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setRgb(doc, 'setTextColor', brand.muted);
  doc.text('LIVING', x + 21, y + 12.6);
}

function addHeader(doc: jsPDF, listing: Listing, mode: PdfMode) {
  setRgb(doc, 'setFillColor', [255, 255, 255]);
  doc.rect(0, 0, 210, 30, 'F');
  addIndahLogo(doc, 14, 7);

  setRgb(doc, 'setTextColor', brand.charcoal);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(mode === 'internal' ? 'INTERNAL LISTING PDF' : 'CLIENT PROPERTY BRIEF', 196, 10, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Listing ID: ${listing.listingId || 'Not assigned'}`, 196, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setRgb(doc, 'setTextColor', brand.muted);
  doc.text(`Generated ${new Date().toLocaleDateString('en-IN')}`, 196, 21.5, { align: 'right' });

  setRgb(doc, 'setDrawColor', brand.gold);
  doc.setLineWidth(0.45);
  doc.line(14, 29, 196, 29);
  setRgb(doc, 'setTextColor', brand.black);
}

function addFooter(doc: jsPDF, mode: PdfMode) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    setRgb(doc, 'setDrawColor', brand.line);
    doc.setLineWidth(0.2);
    doc.line(14, 281.5, 196, 281.5);
    setRgb(doc, 'setTextColor', brand.muted);
    doc.text(mode === 'internal' ? 'Internal use only - INDAH LIVING CRM' : 'Prepared by INDAH LIVING', 14, 287);
    doc.text(`Page ${page} of ${pageCount}`, 196, 287, { align: 'right' });
  }
  setRgb(doc, 'setTextColor', brand.black);
}

function ensureSpace(doc: PdfDoc, y: number, needed = 28) {
  if (y + needed <= 274) return y;
  doc.addPage();
  return 38;
}

function addSection(doc: PdfDoc, listing: Listing, mode: PdfMode, title: string, rows: RowInput[], startY: number) {
  const y = ensureSpace(doc, startY, 36);
  autoTable(doc, {
    startY: y,
    head: [[title, '']],
    body: rows,
    theme: 'grid',
    margin: { left: 14, right: 14, top: 36, bottom: 16 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.7,
      overflow: 'linebreak',
      valign: 'top',
      lineColor: brand.line,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: brand.paleGold,
      textColor: brand.black,
      fontStyle: 'bold',
      lineColor: brand.gold,
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 54, fontStyle: 'bold', textColor: brand.charcoal, fillColor: [250, 250, 250] },
      1: { cellWidth: 128 },
    },
    didDrawPage: () => addHeader(doc, listing, mode),
  });
  return (doc.lastAutoTable?.finalY || y) + 8;
}

function addDescription(doc: PdfDoc, listing: Listing, mode: PdfMode, startY: number) {
  const description = listing.description?.trim() || '-';
  const y = ensureSpace(doc, startY, 44);
  autoTable(doc, {
    startY: y,
    head: [['Description']],
    body: [[description]],
    theme: 'grid',
    margin: { left: 14, right: 14, top: 36, bottom: 16 },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.7,
      overflow: 'linebreak',
      valign: 'top',
      lineColor: brand.line,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: brand.paleGold,
      textColor: brand.black,
      fontStyle: 'bold',
      lineColor: brand.gold,
      lineWidth: 0.2,
    },
    didDrawPage: () => addHeader(doc, listing, mode),
  });
  return (doc.lastAutoTable?.finalY || y) + 8;
}

async function heroImageData(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function addHeroImage(doc: PdfDoc, listing: Listing, startY: number) {
  const x = 14;
  const width = 182;
  const height = 58;
  setRgb(doc, 'setFillColor', brand.paleGold);
  doc.roundedRect(x, startY, width, height, 1.8, 1.8, 'F');

  const imageData = listing.heroImageUrl ? await heroImageData(listing.heroImageUrl) : null;
  if (imageData) {
    try {
      doc.addImage(imageData, x, startY, width, height);
      return startY + height + 8;
    } catch {
      // Keep the polished fallback panel when the image format cannot be embedded.
    }
  }

  setRgb(doc, 'setTextColor', brand.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('No hero image', x + width / 2, startY + height / 2, { align: 'center' });
  setRgb(doc, 'setTextColor', brand.black);
  return startY + height + 8;
}

export async function exportInternalListingPdf(listing: Listing) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as PdfDoc;
  addHeader(doc, listing, 'internal');

  const title = getListingDisplayTitle(listing) || 'Listing';
  setRgb(doc, 'setTextColor', brand.black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setRgb(doc, 'setTextColor', brand.muted);
  doc.text(`${listing.location || '-'} | ${listing.projectName || '-'}`, 14, 49);
  setRgb(doc, 'setTextColor', brand.black);

  let y = await addHeroImage(doc, listing, 56);

  y = addSection(doc, listing, 'internal', 'Quick Summary', sectionRows([
    ['Listing ID', listing.listingId || 'Not assigned'],
    ['Title / Project Name', title],
    ['Project Name', listing.projectName],
    ['Location', listing.location],
    ['Property Type', listing.propertyType === 'Other' ? listing.propertyTypeOther : listing.propertyType],
    ['Listing Type', listing.listingType || 'Public'],
    ['BHK Configuration', listing.bhkConfiguration],
    ['Price', formatListingPricePlain(listing)],
    ['Availability', getListingAvailability(listing)],
    ['Project Status', listing.projectStatus],
    ['Website Status', listing.websiteStatus],
  ]), y);

  y = addDescription(doc, listing, 'internal', y);

  y = addSection(doc, listing, 'internal', 'Owner / Source Details', sectionRows([
    ['Builder / Developer', listing.developerName],
    ['Contact Person', listing.contactPerson],
    ['Phone Number', listing.phone],
    ['Email Address', listing.email],
    ['Property Address', listing.propertyAddress],
    ['Date of Meeting', listing.dateOfMeeting],
  ]), y);

  y = addSection(doc, listing, 'internal', 'Property Details', sectionRows([
    ['Furnishing', listing.furnishing],
    ['Highlight', listing.highlight],
    ['Expected Possession', listing.expectedPossessionDate],
    ['Built-up Area', listing.builtUpArea ? `${display(listing.builtUpArea)} sq.ft` : '-'],
    ['Carpet Area', listing.carpetArea ? `${display(listing.carpetArea)} sq.ft` : '-'],
    ['Plot Area', listing.plotArea ? `${display(listing.plotArea)} sq.m` : '-'],
    ['Number of Floors', listing.floors],
    ['Unit Floor Number', listing.unitFloor],
    ['Total Units', listing.totalUnits],
    ['Available Units', listing.availableUnits],
  ]), y);

  y = addSection(doc, listing, 'internal', 'Pricing & Payment', sectionRows([
    ['Price on Request', listing.priceOnRequest],
    ['Base Price', formatListingPricePlain(listing)],
    ['Price per sq.ft', listing.priceOnRequest ? '-' : listing.pricePerSqFt ? `INR ${display(listing.pricePerSqFt)}` : '-'],
    ['Taxes Applicable', listing.taxesApplicable],
    ['Other Taxes', listing.taxesApplicableOther],
    ['Payment Schedule', listing.paymentSchedule],
  ]), y);

  y = addSection(doc, listing, 'internal', 'Amenities & USPs', sectionRows([
    ['Amenities', listing.amenities],
    ['USPs', listing.usps],
    ['Ideal Buyer Profile', listing.idealBuyerProfile],
  ]), y);

  y = addSection(doc, listing, 'internal', 'Legal & Quality', sectionRows([
    ['RERA Registration', listing.reraRegistration],
    ['Title Clear', listing.titleClear],
    ['Completion Certificate', listing.completionCertificate],
    ['Construction Quality', listing.constructionQuality],
    ['Architect / Designer', listing.architectDesigner],
  ]), y);

  y = addSection(doc, listing, 'internal', 'Marketing & Links', sectionRows([
    ['Marketing Materials', listing.marketingMaterials],
    ['Listing URL', listing.listingUrl],
    ['External Public Link', listing.externalPublicLink],
    ['Virtual Tour Link', listing.virtualTourLink],
    ['Exclusive Mandate', listing.exclusiveMandate],
    ['Staging Available', listing.stagingAvailable],
    ['Model Flat Ready', listing.modelFlatReady],
  ]), y);

  y = addSection(doc, listing, 'internal', 'Additional Internal Details', sectionRows([
    ['Accessibility', listing.accessibility],
    ['Distance from Main Road', listing.distanceFromMainRoad],
    ['Additional Actions Required', listing.additionalActions],
    ['Notes & Observations', listing.notes],
  ]), y);

  addSection(doc, listing, 'internal', 'History', sectionRows([
    ['Created On', dateDisplay(listing.createdAt)],
    ['Last Updated', dateDisplay(listing.updatedAt)],
  ]), y);

  addFooter(doc, 'internal');
  doc.save(`${filenameForListing(listing, 'internal')}.pdf`);
}

export async function exportExternalListingPdf(listing: Listing) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as PdfDoc;
  addHeader(doc, listing, 'external');

  const title = getListingDisplayTitle(listing) || 'Property Brief';
  setRgb(doc, 'setTextColor', brand.black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setRgb(doc, 'setTextColor', brand.muted);
  doc.text(`${listing.location || '-'} | ${listing.bhkConfiguration || '-'} | ${listing.propertyType || '-'}`, 14, 49);
  setRgb(doc, 'setTextColor', brand.black);

  let y = await addHeroImage(doc, listing, 56);

  y = addSection(doc, listing, 'external', 'Property Summary', sectionRows([
    ['Listing ID', listing.listingId || 'Not assigned'],
    ['Property Name', title],
    ['Location', listing.location],
    ['Property Type', listing.propertyType === 'Other' ? listing.propertyTypeOther : listing.propertyType],
    ['BHK Configuration', listing.bhkConfiguration],
    ['Price', formatListingPricePlain(listing)],
    ['Availability', getListingAvailability(listing)],
    ['Project Status', listing.projectStatus],
    ['Expected Possession', listing.expectedPossessionDate],
    ['Furnishing', listing.furnishing],
  ]), y);

  y = addDescription(doc, listing, 'external', y);

  y = addSection(doc, listing, 'external', 'Area & Unit Details', sectionRows([
    ['Built-up Area', listing.builtUpArea ? `${display(listing.builtUpArea)} sq.ft` : '-'],
    ['Carpet Area', listing.carpetArea ? `${display(listing.carpetArea)} sq.ft` : '-'],
    ['Plot Area', listing.plotArea ? `${display(listing.plotArea)} sq.m` : '-'],
    ['Number of Floors', listing.floors],
    ['Unit Floor Number', listing.unitFloor],
    ['Available Units', listing.availableUnits],
  ]), y);

  y = addSection(doc, listing, 'external', 'Highlights', sectionRows([
    ['Amenities', listing.amenities],
    ['USPs', listing.usps],
    ['Highlight', listing.highlight],
  ]), y);

  y = addSection(doc, listing, 'external', 'Useful Links', sectionRows([
    ['Website Link', listing.externalPublicLink || listing.listingUrl],
    ['Virtual Tour Link', listing.virtualTourLink],
  ]), y);

  addSection(doc, listing, 'external', 'Legal Snapshot', sectionRows([
    ['RERA Registration', listing.reraRegistration],
    ['Title Clear', listing.titleClear],
    ['Completion Certificate', listing.completionCertificate],
  ]), y);

  addFooter(doc, 'external');
  doc.save(`${filenameForListing(listing, 'external')}.pdf`);
}
