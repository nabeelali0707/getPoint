export const NU_EMAIL_PATTERN = /^[a-zA-Z][0-9]{6}@nu\.edu\.pk$/;

export function assertNuEmail(email: string) {
  if (!NU_EMAIL_PATTERN.test(email)) {
    throw new Error("Student email must match NU format, for example k123456@nu.edu.pk.");
  }
}

export function nuIdFromEmail(email: string) {
  return email.split("@")[0].toUpperCase();
}
