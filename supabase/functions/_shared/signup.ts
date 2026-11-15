// College ReadyAI — the decisions sign-up has to get right, with no I/O.
//
// Kept apart from the handler so it can be tested without Supabase, Deno or a
// network. The handler in ../signup/index.ts does the talking; everything that
// could go wrong in a way that matters is decided here.
//
// Written in erasable TypeScript so `node` can run it directly.

export type AgeBand = 'under13' | '13-17' | '18-24' | '25plus';
export type Stage = 'secondary' | 'applying' | 'university';

export type SignupInput = {
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
  ageBand?: unknown;
  stage?: unknown;
  guardianEmail?: unknown;
  guardianPhone?: unknown;
  acceptedTerms?: unknown;
  acceptedPrivacy?: unknown;
  marketingOptIn?: unknown;
};

export type CleanSignup = {
  email: string;
  password: string;
  fullName: string;
  ageBand: Exclude<AgeBand, 'under13'>;
  stage: Stage | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  marketingOptIn: boolean;
  isMinor: boolean;
  needsGuardian: boolean;
};

export type Refusal = { ok: false; status: number; error: string; field?: string; hint?: string };
export type Accepted = { ok: true; value: CleanSignup };

const BANDS: Array<AgeBand> = ['under13', '13-17', '18-24', '25plus'];
const STAGES: Array<Stage> = ['secondary', 'applying', 'university'];

// Deliberately loose. Real validation is "we sent you a mail and you opened it";
// this only rejects what obviously cannot be an address.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE = /^\+?[0-9][0-9\s-]{6,19}$/;

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const bool = (v: unknown): boolean => v === true || v === 'true' || v === 'on' || v === 1;

export const MIN_PASSWORD = 8;

/**
 * The gate. Note the order: age is checked before anything else, because an
 * under-13 must not reach Supabase Auth at all. The database trigger will refuse
 * them too, but by then a user row would already exist, and the promise is that
 * "no account is created and nothing is kept".
 */
export function validateSignup(input: SignupInput): Accepted | Refusal {
  const ageBand = text(input.ageBand) as AgeBand;

  if (!ageBand) {
    return { ok: false, status: 400, error: 'Choose an age group.', field: 'ageBand' };
  }
  if (!BANDS.includes(ageBand)) {
    return { ok: false, status: 400, error: 'That is not an age group we recognise.', field: 'ageBand' };
  }
  if (ageBand === 'under13') {
    return {
      ok: false,
      status: 403,
      error: 'College ReadyAI is for ages 13 and up. No account has been created.',
      field: 'ageBand',
      hint: 'cr_under_13',
    };
  }

  const email = text(input.email).toLowerCase();
  if (!EMAIL.test(email)) {
    return { ok: false, status: 400, error: 'Enter an email address we can reply to.', field: 'email' };
  }

  const password = typeof input.password === 'string' ? input.password : '';
  if (password.length < MIN_PASSWORD) {
    return {
      ok: false,
      status: 400,
      error: `Use a password of at least ${MIN_PASSWORD} characters.`,
      field: 'password',
    };
  }

  const fullName = text(input.fullName);
  if (fullName.length < 1 || fullName.length > 120) {
    return { ok: false, status: 400, error: 'Tell us your name.', field: 'fullName' };
  }

  // The form makes this box required, so an account should never exist without
  // it. Recorded with a timestamp in profile_private.
  if (!bool(input.acceptedTerms) || !bool(input.acceptedPrivacy)) {
    return {
      ok: false,
      status: 400,
      error: 'Please accept the Terms and acknowledge the Privacy Policy.',
      field: 'acceptedTerms',
    };
  }

  const stageRaw = text(input.stage) as Stage;
  if (stageRaw && !STAGES.includes(stageRaw)) {
    return { ok: false, status: 400, error: 'Choose where you are now.', field: 'stage' };
  }

  const isMinor = ageBand === '13-17';
  const guardianEmail = text(input.guardianEmail).toLowerCase();
  const guardianPhone = text(input.guardianPhone);

  if (isMinor) {
    const hasEmail = guardianEmail !== '' && EMAIL.test(guardianEmail);
    const hasPhone = guardianPhone !== '' && PHONE.test(guardianPhone);
    if (!hasEmail && !hasPhone) {
      return {
        ok: false,
        status: 400,
        error: "Add a parent or guardian's email address or phone number so we can ask them.",
        field: 'guardianEmail',
        hint: 'cr_guardian_contact_required',
      };
    }
    if (guardianEmail !== '' && guardianEmail === email) {
      return {
        ok: false,
        status: 400,
        error: 'A guardian needs a different email address from the student.',
        field: 'guardianEmail',
      };
    }
  }

  return {
    ok: true,
    value: {
      email,
      password,
      fullName,
      ageBand: ageBand as Exclude<AgeBand, 'under13'>,
      stage: stageRaw || null,
      guardianEmail: isMinor && EMAIL.test(guardianEmail) ? guardianEmail : null,
      guardianPhone: isMinor && PHONE.test(guardianPhone) ? guardianPhone : null,
      // Under 18 this stays off whatever the form sent. The database enforces it
      // too; this stops us even trying.
      marketingOptIn: isMinor ? false : bool(input.marketingOptIn),
      isMinor,
      needsGuardian: isMinor,
    },
  };
}

/**
 * A guardian link. The raw token goes in the email and is never stored; only
 * the hash reaches the database, so a leaked `guardian_requests` row approves
 * nothing. 32 bytes is far past guessing.
 */
export async function mintGuardianToken(): Promise<{ token: string; tokenHash: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = base64url(bytes);
  return { token, tokenHash: await sha256(token) };
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function guardianLink(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/guardian?t=${encodeURIComponent(token)}`;
}
