export const OWNER_EMAIL = "jeff.thchaves@gmail.com";
export function isOwnerEmail(email: unknown): email is string {
  return typeof email === "string" && email.trim().toLowerCase() === OWNER_EMAIL;
}
