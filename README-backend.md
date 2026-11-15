# College ReadyAI — database blueprint

Plain Postgres, aimed at Supabase. Sign-in is Supabase Auth's job; this schema
never stores a password.

**Aligned to the public site.** The product facts come from `content/site.js` in
the founder's Next.js site — plans, prices, limits, stage values and age rules.
Where this blueprint and that file disagree, that file wins. What that changed:

| | |
|---|---|
| Name | College ReadyAI |
| Stages | `secondary` / `applying` / `university`, matching the form's option values |
| Age | an **age band**, not a birth date — the form asks `under13` / `13-17` / `18-24`. A birth date is optional and wins when supplied |
| Consent | Terms and Privacy acceptance is recorded with a timestamp and a policy version, and cannot be rewritten by the account |
| Plans | Free is capped **per day** (3 Advisor messages); Plus and Pro per month (150, 400). Decks, uploads, mock tests and scholarship matches each have their own cap |
| Prices | Plus ₦2,000 / ₦5,000 / ₦54,000 and Pro ₦4,000 / ₦10,000 / ₦108,000, weekly / monthly / yearly, stored in kobo |
| Decks | a deck holds up to 10 files, because the site offers "up to 10 files at a time" — so `decks` and `deck_files` are separate, and metered separately |

Laid out the way the Supabase CLI and the GitHub integration expect, so a push
to the default branch applies the migrations.

```
supabase/
  config.toml
  migrations/
    20261115090001_schema.sql     tables, enums, indexes
    20261115090002_functions.sql  the helpers the policies call
    20261115090003_guards.sql     age gate, approval state machine, protected columns
    20261115090004_rls.sql        row-level security and grants
    20261115090005_storage.sql    two private buckets and their policies
    20261115090006_rights.sql     export my data, delete my account
  functions/
    _shared/   the decisions, with no I/O: validation, tokens, the flow
    signup/    POST /functions/v1/signup
    guardian/  POST /functions/v1/guardian
tests/
  migrations.mjs    applies the migrations to a real Postgres and attacks them
  functions.mjs     runs the sign-up and approval logic with fakes
  notify-relay.mjs  catches the guardian message locally
```

The migration filenames are timestamps because that is what `supabase migration
new` generates; keeping to it means a migration you add later sorts after these
rather than fighting them.

## Running it

```bash
node tests/migrations.mjs
```

```bash
node tests/functions.mjs
```

That boots Postgres in WASM (PGlite), stubs the parts of Supabase the migrations
lean on — `auth.users`, `auth.uid()`, the `anon` / `authenticated` /
`service_role` roles, and `storage.objects` — applies every migration in order,
then tries to break the rules. 65 checks, all passing.

The second runs the sign-up and guardian logic with a fake database and a fake
sender, so the paths that matter — an under-13 never reaching the auth system, a
sign-up rolling back when the guardian cannot be reached — are actually
exercised. 59 checks, all passing. Node strips the TypeScript on import, so
neither needs a build step.

## Testing, in three stages

### 1. Now, with nothing installed

```bash
node tests/migrations.mjs
```

```bash
node tests/functions.mjs
```

Postgres comes from PGlite (WASM) and the TypeScript is stripped on import, so
there is nothing to install and nothing to deploy. This is the loop to work in:
both suites finish in seconds and cover every rule that matters.

### 2. The guardian flow, end to end, on your machine

In one terminal:

```bash
node tests/notify-relay.mjs
```

Then point `GUARDIAN_NOTIFY_URL` at `http://127.0.0.1:8788` and sign up as a
13–17-year-old. The relay prints the message the guardian would have received
and pulls the approval link out ready to paste.

Use this rather than a public request-bin. That link *is* the approval — anyone
holding it can open the account — so it must not be posted to a third-party
inbox you do not control.

### 3. Against a real Supabase project

```bash
supabase db push
```

```bash
supabase functions deploy signup && supabase functions deploy guardian
```

```bash
supabase secrets set SITE_URL=https://… ALLOWED_ORIGIN=https://… GUARDIAN_NOTIFY_URL=https://…
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function
automatically. The site calls both endpoints with the anon key in
`Authorization`, which satisfies Supabase's own JWT check; deploy with
`--no-verify-jwt` only if you intend to call them without it.

Worth walking through by hand once deployed: an under-13 sign-up (should refuse
before any user exists), a 13–17 sign-up (account created, locked, guardian
messaged), approving from the link, then withdrawing from the same link.

## The two ideas worth knowing

**Personal data is split from the roster.** `profiles` is the only table a
school's staff can read, and it holds no date of birth, no guardian contact and
no email. Those live in `profile_private`, which has no staff policy at all.
Column-level grants would have done the same job and would have been one
careless `select *` away from leaking; a separate table cannot be read by
accident. That is what makes "staff see progress, not private chats" true rather
than merely intended.

**`cr_is_service()` is not `security definer`, and must never become one.**
Inside a definer function Postgres sets `current_user` to the function's owner,
so a definer version would answer "yes, the server" to whoever asked, and the
triggers that stop a student approving themselves would silently never fire.
This was a real bug during the build; the test
`a student cannot approve themselves` is what catches it coming back.

## What the database refuses

| | |
|---|---|
| Under 13 | `cr_age_gate` raises before a profile row exists |
| 13–17 | created `pending_guardian`; the `cr_is_active()` check in every policy means a locked account reads nothing but its own profile |
| Approval | only `guardian_requests.decision` moves it, and that table has no policy — service role only, so the token hash never reaches a browser |
| Self-promotion | `status`, `approved`, `plan`, `org_id` are refused for anyone but the server |
| Under-18 switches | `ai_training_opt_in` and `marketing_opt_in` are forced false, for the server too |
| Withdrawal | sets `paused` — the student keeps their work but reads none of it |

## What is deliberately not here

The database cannot do these, and pretending otherwise would be the easy
mistake:

- **Sign-up.** An under-13 must never reach `auth.users` at all. The trigger is a
  backstop; the Edge Function that checks age before creating the auth user is
  the actual gate.
- **The guardian link.** Minting the token, hashing it into `guardian_requests`,
  sending the email or SMS, and expiring it.
- **The AI.** Every model call, with the usage check against `plan_limits` and
  `usage_counters` before it. `usage_counters` has no write policy on purpose:
  if the browser could increment it, the limit would not be a limit.
- **Document extraction.** A 100 MB PDF will not parse inside a request. Upload
  goes straight to storage with a signed URL; a queued worker moves the deck
  through `uploaded → extracting → generating → ready`.
- **Storage purge on delete.** `cr_delete_my_account()` cascades every table, but
  no foreign key reaches storage. The Delete button must empty
  `study-uploads/<uid>/` first.
- **Backups.** "Backups clear within 30 days" is a retention setting, not SQL.

## The sign-up path

```
AccountForm  ──POST──▶  /functions/v1/signup
                          │  refuse under-13 before anything exists
                          │  create the auth user
                          │  profiles + profile_private   ← trigger locks a minor
                          │  mint token, store only its hash
                          └▶ message the guardian   ← if this fails, roll it all back

guardian's email ──▶ SITE_URL/guardian?t=…  (a page: who is asking, Approve / Say no)
                          └──POST──▶  /functions/v1/guardian
                                        └▶ sets decision   ← trigger opens or pauses
```

Three things in there are load-bearing:

- **The under-13 check happens before `createUser`.** The database trigger
  refuses them too, but by then an auth user exists, and the promise is "no
  account is created and nothing is kept".
- **A sign-up that cannot reach the guardian is undone.** An account nobody can
  approve is worse than a refused sign-up, so a failed send deletes the user and
  returns the real reason.
- **The guardian endpoint is POST only.** The emailed link opens a page; only
  pressing a button decides anything. A GET that approved would be triggered by
  every mail scanner and link prefetcher that opens the message.

### Environment

| | |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | given by Supabase |
| `SITE_URL` | where the `/guardian` page lives |
| `ALLOWED_ORIGIN` | the site, for CORS |
| `GUARDIAN_NOTIFY_URL` | where to POST the guardian's message |
| `GUARDIAN_NOTIFY_TOKEN` | optional bearer for that endpoint |

**No mail provider is wired in.** Rather than pick one and leave a stub that
looks like it works, `_shared/notify.ts` POSTs the message to one endpoint you
configure — your provider's API, or a small relay in front of it. With
`GUARDIAN_NOTIFY_URL` unset, sending throws and sign-up for a minor is refused.
That is on purpose: it fails closed rather than telling a 15-year-old to check
an email that was never sent.

### The notify contract

Whatever sits at `GUARDIAN_NOTIFY_URL` has to accept this:

```http
POST <GUARDIAN_NOTIFY_URL>
content-type: application/json
authorization: Bearer <GUARDIAN_NOTIFY_TOKEN>    (only if the token is set)

{
  "to":      "parent@example.com",   // or "+2348031234567" when channel is sms
  "channel": "email",                 // "email" | "sms"
  "subject": "Please review Tobi Adeyemi's request to join College ReadyAI",
  "text":    "…plain text, including the approval link…"
}
```

- **Any 2xx means sent.** Anything else, or a connection failure, means not
  sent — and the sign-up is rolled back, so do not answer 200 on a queue you
  have not accepted.
- **`text` contains the guardian's approval link, which is a secret.** Anyone
  holding it can approve the account. Do not log the body, do not retry it to a
  dead-letter queue you can read, and do not forward it anywhere else.
- `subject` is empty of meaning for SMS; use `text`, which is written to fit
  one message.
- Swapping providers later is a change to that endpoint, not to this code.

## One change the site needs

The sign-up form asks a 13–17-year-old to tick *"My parent or guardian has
approved this sign-up."* That is the student saying so, not the guardian doing
it — and the site's own `placeholders.guardianConsent` already calls for "a
verifiable parent or guardian approval step before enabling account creation for
ages 13 to 17".

This blueprint is that step. `guardian_requests` holds a hashed token sent to the
guardian; only their answer moves the account out of `pending_guardian`. The
form's tick box can stay as an honest declaration, but it must stop being the
thing that opens the account: after sign-up a minor should land on a "waiting for
your guardian" screen, which is why `profiles` stays readable while locked.

## Still to decide

- Free's cap is 3 Advisor messages a day. Worth checking that against the real
  cost per call before launch — it is the one number that decides whether a free
  account can run up a bill.
- `institution` limits currently copy Pro. The site says they are agreed per
  school, so the server should override them per org.
- Reference data (`institutions`, `courses`, `scholarships`, `exam_dates`) has
  the right columns, including `source_url` and `checked_on`, but no rows.
  Keeping it current is an ongoing job, not a migration.
