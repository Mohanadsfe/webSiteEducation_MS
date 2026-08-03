/** Platform owners — soft-admin even if Firestore role is not yet "teacher" */
export const OWNER_ADMIN_EMAILS = [
  'safi89099@gmail.com',
  'mohanadsfe@gmail.com',
];

export function isOwnerAdminEmail(email) {
  const e = (email || '').toLowerCase().trim();
  if (!e) return false;
  return OWNER_ADMIN_EMAILS.some((owner) => owner.toLowerCase() === e);
}
