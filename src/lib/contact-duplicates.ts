import type { Contact } from '@/lib/types';

export type ContactDuplicate = Pick<Contact, 'id' | 'serialNumber' | 'name' | 'phone' | 'email'> & {
  matchedFields: Array<'phone' | 'email'>;
};

export function normalizePhone(value?: string) {
  const digits = (value || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function normalizeEmail(value?: string) {
  return (value || '').trim().toLowerCase();
}

export function findContactDuplicates(
  contacts: Contact[],
  values: { phone?: string; email?: string },
  excludeId?: string
): ContactDuplicate[] {
  const phone = normalizePhone(values.phone);
  const email = normalizeEmail(values.email);

  return contacts.flatMap((contact) => {
    if (contact.id === excludeId) return [];

    const matchedFields: ContactDuplicate['matchedFields'] = [];
    if (phone.length >= 10 && normalizePhone(contact.phone) === phone) matchedFields.push('phone');
    if (email && normalizeEmail(contact.email) === email) matchedFields.push('email');

    return matchedFields.length ? [{ ...contact, matchedFields }] : [];
  });
}
