# I Vibe Coded a Personal AI CRM Because Salesforce Made Me Feel Like a Sales Rep

### And somewhere between the voice notes and the birthday reminders, I built something I actually want to use every day.

---

I used to keep a messy Notion table of people I cared about. Mentors, old colleagues, friends I kept meaning to catch up with. Every few months I'd open it, feel vaguely guilty, add a note saying "coffee soon?" next to someone's name, and close it again without doing anything.

The problem wasn't that I was a bad friend. The problem was that the tool didn't match the feeling. Notion tables feel like spreadsheets. Spreadsheets feel like work. Work feels like obligation. And the people I was trying to stay close to deserve better than a guilt spreadsheet.

So I built Knowho.

---

## What Is Knowho?

Knowho is a personal AI CRM. Not a sales CRM — a *people* CRM. It's a place to manage your actual relationships: friends, mentors, colleagues, the professor who changed how you think, the collaborator you haven't talked to in six months but really should. You log interactions, attach voice notes, set reminders for birthdays and important dates, and before any meeting — a coffee, a catch-up call, a performance review — you hit one button and Claude Haiku reads your entire history with that person and generates a meeting prep card.

That card tells you what they were working on last time you talked, what topics you left unfinished, and what you've been meaning to ask them for months but kept forgetting.

Here's how all the pieces connect:

```
┌────────────────────────────────────────────────────────────┐
│                      Knowho Data Pipeline                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  User Input                                                │
│  ──────────────────────────────────────────────────────   │
│  Text interaction  ──┐                                     │
│  Voice note (mic)  ──┼──► Whisper API ──► transcript       │
│  Photo/emoji avatar  │                        │            │
│                      └────────────────────────┘            │
│                                ▼                           │
│  Prisma ORM ──► Vercel Postgres                            │
│  (Contact + Interaction + ImportantDate models)            │
│                                ▼                           │
│  API Routes (Next.js App Router)                           │
│  /api/contacts, /api/interactions, /api/prep-card, etc.    │
│                                ▼                           │
│  Claude Haiku (claude-haiku-4-5)                          │
│  System prompt: persona + instructions                     │
│  User prompt: full interaction history                     │
│                                ▼                           │
│  Meeting Prep Card JSON                                    │
│  { lastTopics, continueTopics, askAbout, tone }            │
│                                ▼                           │
│  Browser speechSynthesis (optional voice reply)            │
│  OpenWeatherMap widget (ambient context)                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## The Problem I Was Solving

I graduated from an AI Master's program and went straight into a job where relationship-building mattered more than I expected. Not networking in the hollow LinkedIn sense — real relationships. The kind where you remember someone's kid just started primary school, or that they were nervous about a board presentation last quarter.

I tried three different apps. The corporate CRMs made me feel like I was managing pipeline. The journaling apps were too freeform — I needed structure. The "smart contact book" apps on the App Store all had the same problem: they were built for people who already had good habits. I needed something that would *prompt* me.

The feature that crystallised everything was when I missed a mentor's birthday two years running. Not because I didn't care. Because it was saved in Google Calendar under her company name and I had calendar fatigue and it got buried.

I wanted a system that would look at a contact I hadn't spoken to in 90 days and say: *hey, this person matters to you. What happened?*

That's the "neglected contacts" feature on the dashboard. It's still my favourite thing in the app. It doesn't nag — it just surfaces quietly, a small list of people you've drifted from, with the last interaction date. Seeing it makes me want to do something about it. Not because I feel guilty. Because I remember why I liked them.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Server components + API routes in one repo |
| Language | TypeScript | Strict types saved me from myself repeatedly |
| Database | Vercel Postgres via Prisma | Fast setup, type-safe queries |
| Auth | NextAuth v5 (Google OAuth) | One less password to forget |
| AI — Cards | Claude Haiku (`claude-haiku-4-5`) | Fast, cheap, surprisingly good at structured output |
| AI — Voice | OpenAI Whisper API | Transcription that actually handles accents |
| Validation | Zod | Schema-first API safety |
| Styling | Tailwind CSS + shadcn/ui | Fast enough to keep momentum |
| Deployment | Vercel | Zero-config, matched the stack |
| Weather | OpenWeatherMap API | Ambient context on the dashboard |

---

## APIs Used

### Claude Haiku — Meeting Prep Cards and Interaction Summaries

Claude Haiku (`claude-haiku-4-5`) is the core intelligence of Knowho. Before every meeting, the app assembles the full chronological history of interactions with a contact — dates, summaries, tags, notes — and passes it to Haiku with a structured system prompt.

The model is asked to return a JSON object, not prose, so the UI can render each section independently. I use structured output prompting (explicitly defining the JSON shape in the system message) rather than function calling, because Haiku handles it cleanly without the overhead of tool definitions.

There are four AI personas built in: **Knowho** (neutral and analytical), **Susu** (wise and reflective, like a senior mentor), **Xiaonuan** (warm and emotionally attuned), and **Mingge** (direct and action-oriented). Each persona appends a `characterTone` block to the system prompt. The user picks their preferred persona in settings, and the card's language shifts accordingly — same data, different voice.

### OpenAI Whisper API — Voice Notes

Whisper handles transcription of voice memos. The user records directly in the browser using the MediaRecorder API, and the resulting audio blob is sent as a multipart form upload to a Next.js API route, which forwards it to Whisper's `transcriptions` endpoint. The transcript is then saved as the interaction note.

Model: `whisper-1`. No custom prompting — the default model handles mixed-language input well enough for personal notes.

### Vercel Postgres and Prisma — All Persistent Data

Every contact, interaction, tag, and important date is stored in Postgres via Prisma. The Prisma client is generated at build time, giving me type-safe query results throughout the app. Soft delete is implemented via a `deletedAt` nullable timestamp on contacts — nothing is ever hard-deleted, and every query filters `deletedAt: null`.

### NextAuth v5 — Google OAuth

Authentication is Google OAuth only. One provider, no passwords, session stored as JWT. The interesting constraint here is the Edge Runtime split, covered in the AI Techniques section below.

### OpenWeatherMap — Dashboard Widget

The weather widget on the dashboard is, strictly speaking, not necessary. But I love it. It calls the OpenWeatherMap current weather endpoint with the user's city, maps the weather condition code to an animated emoji (rain gets a small falling-drops CSS animation, clear sky gets a slow rotating sun), and shows temperature and a one-line description. It has nothing to do with relationship management. It makes the dashboard feel alive.

---

## AI Skills and Techniques

### 1. Structured Output Prompting with Claude Haiku

The meeting prep card prompt explicitly defines the JSON schema in the system message. Claude doesn't hallucinate field names because they're prescribed up front.

```typescript
// app/api/prep-card/route.ts

const systemPrompt = `You are ${persona.name}, a personal relationship assistant.
${persona.characterTone}

Your task: read the interaction history below and generate a meeting prep card.

Return ONLY valid JSON in this exact shape:
{
  "lastWorkedOn": "string — what this person was focused on last time",
  "topicsToContinue": ["string", "string"],
  "thingsToAsk": ["string", "string"],
  "toneNote": "string — one sentence on the emotional register of this relationship"
}

Rules:
- Draw only from the provided interaction history. Do not invent.
- Be specific. Prefer "her redesign of the onboarding flow" over "her work project".
- topicsToContinue and thingsToAsk: 2-4 items each.
- toneNote should feel warm, not clinical.`;

const userPrompt = `Contact: ${contact.name}
Last interaction: ${mostRecentDate}

Interaction history (oldest to newest):
${formattedHistory}

Generate the meeting prep card now.`;

const response = await anthropic.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: userPrompt }],
  system: systemPrompt,
});
```

The response content is parsed with `JSON.parse` inside a try/catch. If parsing fails (rare with Haiku, but possible), the route returns a 422 and the UI shows a retry button.

### 2. Prisma Schema — Contact and Interaction Models

The schema is the backbone of everything. The soft-delete pattern on Contact means users can archive someone without losing history, and it avoids the cascade-delete complexity of hard removal.

```prisma
// prisma/schema.prisma

model Contact {
  id          String    @id @default(cuid())
  userId      String
  name        String
  email       String?
  company     String?
  role        String?
  avatar      String?   // null = initial, emoji string = emoji, data:image = base64
  tags        String[]  @default([])
  notes       String?
  deletedAt   DateTime? // soft delete — null means active
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user            User             @relation(fields: [userId], references: [id])
  interactions    Interaction[]
  importantDates  ImportantDate[]

  @@index([userId, deletedAt])
}

model Interaction {
  id          String   @id @default(cuid())
  contactId   String
  userId      String
  type        String   // "coffee", "call", "email", "note", "voice"
  date        DateTime
  summary     String
  mood        String?
  tags        String[] @default([])
  audioUrl    String?  // Whisper transcript source
  createdAt   DateTime @default(now())

  contact  Contact @relation(fields: [contactId], references: [id])
  user     User    @relation(fields: [userId], references: [id])

  @@index([contactId, date])
  @@index([userId, date])
}
```

The avatar field is the most interesting column in the schema. A single nullable string carries three states: `null` renders the contact's initials in a coloured circle, a short emoji string (e.g. `"🦊"`) renders the emoji directly, and a `data:image/...` base64 string renders a real photo. No separate file storage needed for the MVP.

### 3. Edge Runtime vs Node.js — The Auth Split

NextAuth v5 with a Prisma adapter runs into a genuine constraint: the Prisma client uses Node.js APIs unavailable in the Edge Runtime. But Next.js middleware — where auth checks happen for route protection — runs on Edge by default.

The solution is to split auth into two files. This was one of those things I spent two days getting wrong on a previous project and have now internalised correctly.

```typescript
// auth.config.ts — Edge-safe, no Prisma, no Node.js APIs
// Used by middleware.ts for route protection

import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig = {
  providers: [Google],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnApp = nextUrl.pathname.startsWith("/contacts");

      if (isOnDashboard || isOnApp) {
        if (isLoggedIn) return true;
        return false; // redirect to login
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
```

```typescript
// auth.ts — Full Node.js, Prisma adapter, session handling
// Used by server components and API routes

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
```

Middleware imports only `authConfig`. Server components and API routes import from `auth.ts`. Two files, clear boundary, no Edge Runtime crashes.

### 4. Promise.all for Parallel Dashboard Queries

The dashboard shows: recent contacts, neglected contacts (no interaction in 90+ days), upcoming birthdays, and total interaction count this month. Sequentially, those queries take 500–700ms. In parallel they run in under 200ms.

```typescript
// app/dashboard/page.tsx (server component)

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    recentContacts,
    allActiveContacts,
    upcomingDates,
    monthInteractions,
  ] = await Promise.all([
    // Most recently interacted-with contacts
    prisma.interaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      distinct: ["contactId"],
      include: { contact: true },
    }),

    // All active contacts with their last interaction date
    prisma.contact.findMany({
      where: { userId, deletedAt: null },
      include: {
        interactions: {
          orderBy: { date: "desc" },
          take: 1,
        },
      },
    }),

    // Important dates in the next 30 days
    prisma.importantDate.findMany({
      where: {
        userId,
        contact: { deletedAt: null },
      },
      include: { contact: true },
    }),

    // Interaction count this calendar month
    prisma.interaction.count({
      where: {
        userId,
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  const neglectedContacts = allActiveContacts.filter((c) => {
    const lastDate = c.interactions[0]?.date;
    return !lastDate || lastDate < ninetyDaysAgo;
  });

  // ... render
}
```

I caught myself writing sequential awaits in an earlier version of this component, ran the page, noticed it was slow, and felt briefly embarrassed. Parallelising the queries was a ten-minute refactor that cut load time by roughly 65%. Just use `Promise.all` from the start when the queries don't depend on each other.

### 5. MediaRecorder with Cross-Browser mimeType Fallback

Safari and Chrome disagree on audio encoding. If you hardcode `audio/webm` for the MediaRecorder, Safari silently fails to record. The fix is a short capability check before initialising the recorder.

```typescript
// components/VoiceRecorder.tsx

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  // Fallback — let the browser decide
  return "";
}

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = getSupportedMimeType();

  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined
  );

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);

  recorder.onstop = async () => {
    const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
    await transcribeAudio(blob);
  };

  recorder.start();
  setMediaRecorder(recorder);
}
```

Chrome returns `audio/webm;codecs=opus` as supported. Safari returns `audio/mp4`. The empty string fallback lets the browser make the call, which works on every platform I've tested.

### 6. Zod Validation on Contact Update

Every API route that accepts user input validates it with Zod before touching the database. This schema handles the contact update endpoint — all fields optional because it's a PATCH, but with character limits and format checks where they matter.

```typescript
// lib/validations/contact.ts

import { z } from "zod";

export const updateContactSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  company: z.string().max(100).optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  avatar: z
    .union([
      z.null(),
      z.string().emoji(), // single emoji
      z.string().startsWith("data:image/"), // base64 photo
    ])
    .optional(),
});

// app/api/contacts/[id]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const body = await request.json();
  const parsed = updateContactSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const contact = await prisma.contact.update({
    where: { id: params.id, userId: session.user.id },
    data: parsed.data,
  });

  return Response.json(contact);
}
```

The avatar union type is my favourite Zod trick in this project. One nullable field, three valid shapes, all checked before any DB write. The `z.string().emoji()` validator is doing real work here — without it, you could pass an arbitrary string as an avatar and the UI would render gibberish.

---

## The Vibe Coding Process

I built Knowho with Claude Code and a set of "superpowers" — structured workflow skills that shape how I engage with the AI rather than just throwing feature requests at it.

The workflow for every meaningful feature looks like this:

**`superpowers:brainstorming`** — Before writing a single line, I describe the problem I'm trying to solve. Claude interrogates my intent. What does "meeting prep" actually mean to me? What format do I want the output in? What happens if there's no interaction history? What's the failure mode if Claude returns malformed JSON? This session surfaces assumptions I didn't know I was making. Half the time the brainstorm changes what I build.

**`superpowers:writing-plans`** — After brainstorming, Claude writes an implementation plan with file paths, function signatures, and the key decisions laid out. Not pseudocode — actual file paths like `app/api/prep-card/route.ts` and specific notes like "must validate that the contact belongs to the authenticated user before querying interactions." I review this before any code is written. If something looks wrong in the plan, I catch it now rather than after building.

**`superpowers:subagent-driven-development`** — Each task in the plan is executed by a fresh agent that receives only the spec for that task. After each task, there's a quality review pass. Fresh context per task means the agent isn't dragging assumptions from three features ago into the current one. It also makes it easy to catch when an agent has drifted from spec — because the spec is right there to compare against.

**`superpowers:systematic-debugging`** — When something breaks, instead of trial-and-error, Claude walks through a root-cause analysis. What's the actual error? What are the possible sources? What does the evidence support? This stops me from spending 45 minutes changing things at random and hoping one of them fixes it.

**`superpowers:verification-before-completion`** — Before marking any feature done, Claude runs actual verification: the route is called, the response is checked against the spec, edge cases are tested. Not "I think this works" — "here is evidence it works." This one has saved me from shipping broken features at least four times.

### Concrete Example: Building the Neglected Contacts Feature

I wanted a section on the dashboard showing contacts I hadn't spoken to in over 90 days. Here's how that actually went.

**Brainstorming produced these decisions:**
- What counts as an "interaction"? Any Interaction record linked to the contact.
- What if a contact has zero interactions at all? Show them too if they were added more than 30 days ago — they're established contacts, not brand new ones.
- Is 90 days configurable? Not for MVP — hardcode it, add a settings page later.
- What does the card show? Name, avatar, last interaction date as relative time ("4 months ago"), and a quick-add button.

**Plan excerpt produced by `superpowers:writing-plans`:**

```
File: app/dashboard/page.tsx
- Add neglectedContacts derived from allActiveContacts (after Promise.all)
- Filter: lastInteraction.date < 90 days ago
  OR no interactions AND createdAt < 30 days ago (exclude brand-new contacts)
- Pass as prop to DashboardNeglectedContacts component

File: components/dashboard/DashboardNeglectedContacts.tsx
- Props: contacts with lastInteractionDate
- Render: card grid, avatar, name, relative date badge
- "Log interaction" button links to /contacts/[id]/add-interaction
- Empty state: "Everyone's been heard from recently." (positive framing)
```

The subagent executing the dashboard query task received only that scope. It didn't touch the UI component — that was a separate task for a separate agent. The quality review after the query task caught one issue: the query was returning soft-deleted contacts because the Prisma `where` clause was structured incorrectly. The `deletedAt: null` guard had been placed inside the `interactions` subquery instead of on the Contact itself.

`superpowers:systematic-debugging` identified the bug in about two minutes: filter `deletedAt: null` needs to be a top-level condition on `Contact.findMany`, not nested inside the include. Fix was one line. No digging through Prisma docs, no guessing.

---

## App Pages Walkthrough

**Contact List** — Your address book. Search by name, filter by tag, sort by last interaction date or alphabetically. Each contact card shows their avatar (initial circle, emoji, or photo), name, role and company, tags as small chips, and a soft "last seen" indicator. A subtle red dot appears on contacts you haven't spoken to in a while — not aggressive, just visible.

**Contact Profile** — The heart of the app. A vertical timeline of every logged interaction, oldest at the bottom. Each entry shows the date, interaction type (coffee, call, email, note, voice) with a distinct icon, summary, mood indicator, and tags. The interaction types having visual icons is a small thing that matters a lot — you can scan a year of history in a few seconds and immediately see the shape of a relationship. The "Generate Prep Card" button sits at the top of the profile.

**Add Interaction** — A focused form: date picker, type selector, free-text summary, mood selector rendered as icons rather than words (five options, no labels, you just know which one is right), optional tag picker, and the voice recorder toggle. When voice recording is active, a waveform animation plays. After you stop recording, Whisper transcribes the audio and populates the summary field — editable before saving. The whole flow from voice to saved note is about 15 seconds.

**Meeting Prep Card** — This page still feels like magic to me, even having built it. You see the contact's name and avatar at the top, then three sections appear with a staggered fade-in: "Last time you talked about", "Topics to continue", "Things to ask". Below that, the tone note — a single sentence from Claude about the emotional texture of the relationship. There's a speaker icon that reads the card aloud via `speechSynthesis`, which costs nothing and works completely offline.

**Important Dates Calendar** — A monthly calendar view showing birthdays, anniversaries, and custom important dates across all contacts. Clicking any date shows who it belongs to and gives you a one-click path to their profile. The month navigation uses a slide transition — a tiny animation that makes the calendar feel like a real object rather than a data grid.

**Tag Browser** — A tag cloud sized by frequency, and below it a filtered contact list. Click any tag and see every contact who carries it. This is the feature that works best for people who have a large, varied network. Tags like `mentor`, `potential-collaborator`, `catch-up-soon` become navigable dimensions of your contact list.

**Dashboard** — The overview. Stats across the top (interactions this month, total contacts, contacts added this month). The neglected contacts section below. Upcoming important dates in the next 30 days. And the weather widget in the top right corner.

The weather widget was a Friday afternoon addition. It calls OpenWeatherMap with the user's city, maps the weather condition code to an animated emoji — a slow-rotating sun for clear days, tiny animated drops for rain, drifting dots for snow — and shows current temperature and a one-line description. It has no business being as charming as it is. Every morning when I open the dashboard and see it match what's outside my window, it makes the whole app feel slightly more human.

---

## Example: How the AI Meeting Prep Card Works End to End

Say I have a contact named Yuki — a former colleague who became a mentor. I've logged six interactions over the past year.

**Step 1 — User triggers the card**

On Yuki's contact profile, I click "Generate Prep Card." A loading spinner appears over the card placeholder.

**Step 2 — API route assembles the history**

The route at `GET /api/contacts/[id]/prep-card`:

1. Authenticates the session, verifies the contact belongs to the authenticated user.
2. Queries all interactions for Yuki, ordered by date ascending.
3. Formats each interaction into a readable string block.

The formatted history passed to Claude looks like this:

```
[2025-03-10] coffee
Summary: Caught up after she left her previous company. She's now consulting
independently. Nervous about cashflow in the first 6 months. Mentioned wanting
to do more mentoring.
Mood: hopeful
Tags: career-change, consulting

[2025-05-02] call
Summary: She'd landed her first two retained clients. One she described as
a "dream client." Wanted to talk through pricing — ongoing retainer vs.
project-based. We talked for 90 minutes.
Mood: energised
Tags: consulting, pricing

[2025-07-18] coffee
Summary: The dream client had expanded scope significantly. She was managing
overwhelm — too much good work, not enough systems. I recommended the Notion
setup she'd asked about.
Mood: stretched
Tags: operations, systems

[2025-09-30] voice note
Summary: Quick message updating me: she'd hired her first subcontractor.
Excited and slightly terrified.
Mood: excited
Tags: hiring, growth

[2025-11-14] email
Summary: She'd written a piece about independent consulting for her newsletter,
mentioned me in the acknowledgements. Asking for feedback on the draft.
Mood: proud
Tags: writing, newsletter

[2026-01-08] coffee
Summary: Newsletter piece had done well. She's thinking about a small cohort
programme for early-career people wanting to go independent. Asked if I'd be
a guest speaker.
Mood: ambitious
Tags: teaching, cohort, growth
```

**Step 3 — Claude Haiku generates the card**

The assembled history is passed to Haiku with the system prompt shown earlier. Haiku returns:

```json
{
  "lastWorkedOn": "Planning a cohort programme for early-career people who want
    to go independent, following the success of her consulting newsletter piece",
  "topicsToContinue": [
    "Whether she's finalised the format and timeline for the cohort",
    "How the first subcontractor hire has worked out — was it a good fit?"
  ],
  "thingsToAsk": [
    "Did she want me to confirm as guest speaker for the cohort?",
    "How has the dream client relationship evolved since the scope expansion?",
    "Is she still using the Notion systems setup we talked about?"
  ],
  "toneNote": "This is a relationship with genuine mutual investment — she shares
    her work openly and credits you honestly. Match that warmth."
}
```

**Step 4 — UI renders the card**

Each section fades in sequentially with a 150ms delay between them. The tone note appears last, in slightly smaller type with a soft warm background. There's a copy button for each section and a "Read aloud" button that fires `speechSynthesis.speak()` with the full card text concatenated.

**Step 5 — After the meeting**

I use the Add Interaction form to log what we actually talked about. With the voice recorder, I can do this while walking back from the coffee shop. About 90 seconds of speech, Whisper transcribes it, I scan the transcript for anything to correct, hit save. Done. The next prep card will include today.

---

## What I Learned

**Structured prompting beats clever prompting.** I spent a week trying to get Claude to produce better prose in the meeting prep cards. Fancier system prompts, more elaborate instructions. The real fix was being more precise about the JSON schema — once the output structure was unambiguous, the quality of the content went up automatically. Claude doesn't need encouragement. It needs clear specs.

**The Edge Runtime split is a genuine gotcha.** Every Next.js project using NextAuth v5 with a database adapter will hit this. The two-file pattern — `auth.config.ts` for Edge, `auth.ts` for Node — is the right solution and worth understanding before you need it, not while you're debugging it at midnight.

**Soft delete is almost always the right default for user data.** Hard deleting a contact with a year of interaction history because a user fat-fingered a button is a terrible outcome. `deletedAt` timestamps cost almost nothing and give you a path back. I made this decision early and never regretted it.

**`Promise.all` is one of those things you know but don't always do.** I wrote sequential awaits in my first version of the dashboard server component, felt no discomfort, and only noticed the problem when I measured. Parallelising the queries was a ten-minute fix. Just start with `Promise.all` whenever the queries are independent.

**Vibe coding with structure is faster than vibe coding without it.** The superpowers workflow — brainstorm, write a plan, execute per task with a fresh agent, verify before done — feels like overhead when you first encounter it. It isn't. What it replaces is the overhead of building something wrong and having to rebuild it. I shipped three features in Knowho that I would have previously half-reworked after initial implementation. The plan catches the mistake before the code exists.

**Build for yourself first.** The best thing about Knowho is that I actually use it. Not to test it — to actually manage relationships I care about. Every time I log an interaction or generate a prep card, I'm both developer and user. That dual role catches issues no amount of QA would surface. When something feels slightly wrong as a user, I fix it as a developer. The feedback loop is instant and honest. The neglected contacts feature works not because I designed it well in the abstract but because I opened the dashboard one morning and saw my own name in the list of people I'd been neglecting (it was a contact using my own test account, but the feeling was real). I knew immediately the UI needed to be warmer.

---

Knowho is still in active development. The cohort feature (sharing a contact with a trusted collaborator), bulk import from LinkedIn, and a mobile-optimised PWA are all on the roadmap. But the core loop — log, recall, prepare, log — works, and it's already changed how intentionally I approach the people in my life.

If you've ever felt guilty about a guilt spreadsheet, maybe you need this too.

**GitHub:** [github.com/sarahwangy/knowho](https://github.com/sarahwangy/knowho)

---

*Built with Claude Code, Next.js 14, Prisma, Vercel Postgres, Claude Haiku, and OpenAI Whisper. Powered by the genuine desire to be a better friend.*
