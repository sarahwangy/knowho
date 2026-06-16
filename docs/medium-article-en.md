# I Built a Personal Relationship Manager in 7 Days — Full Stack with AI, Voice, and Avatars

> Subtitle: A deep dive into building Knowho — a privacy-first contact intelligence app using Next.js, Claude AI, Whisper, and Web Speech API

---

There's a quiet irony in the modern age of connectivity: we have hundreds of contacts in our phones but can't remember when we last talked to half of them. LinkedIn tells you who got promoted. Your calendar tells you what's next. But nothing tells you that you haven't reached out to your college roommate in four months — and his birthday is next week.

That gap is what **Knowho** is built to fill.

---

## What Is Knowho?

Knowho is a personal relationship manager — not a CRM, not a social network, not a calendar. It's a private tool to help you remember the people who matter:

- Where you met someone and what your first impression was
- Their important dates (birthdays, anniversaries)
- Notes from every interaction
- An AI assistant that recalls context: *"When did I last see Sarah? Didn't she just have a baby?"*

The target user is one person: me. But building for yourself is the best way to build something that actually works.

---

## Tech Stack Decisions

I made stack decisions in the first few hours and didn't revisit them:

| Choice | Reason |
|--------|--------|
| **Next.js App Router** | Unified API + frontend, trivial deployment, perfect for solo projects |
| **Prisma 7 + PostgreSQL** | Type-safe ORM, relational data maps naturally to contact relationships |
| **NextAuth v5** | Google login in 5 minutes; JWT strategy for Edge Middleware compatibility |
| **Tailwind CSS v4** | Design token system; no CSS files to maintain |
| **Claude Haiku** | Fast and cheap; ideal for conversational assistants |
| **OpenAI Whisper** | Best-in-class transcription accuracy, especially for Chinese |

---

## The Development Journey

### Days 1–2 (May 31): Foundation

The first commit was less than an hour after initializing the project. The database schema is the skeleton of the whole product. I designed it carefully:

```prisma
model Contact {
  id             String          @id @default(cuid())
  userId         String
  name           String
  metAt          String?         // context of meeting
  impression     String?         // first impression note
  avatar         String?         // emoji char or base64 data URL
  contactFreq    String?         // intended contact frequency
  deletedAt      DateTime?       // soft delete
  tags           Tag[]
  importantDates ImportantDate[]
  interactions   Interaction[]
}
```

Two architectural decisions made here that paid off later:

**Soft delete**: Contacts are never truly removed — they get a `deletedAt` timestamp. All queries filter on `deletedAt: null`. This costs a little query complexity but saves users from accidental data loss.

**Auth/DB split**: NextAuth v5 with Prisma adapter requires Node.js runtime — but Next.js Middleware runs on the Edge, which doesn't support Node.js. The fix is to split auth configuration into two files:

```ts
// auth.config.ts — Edge-safe, pure JWT
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request }) {
      const isPublic = ["/login"].includes(request.nextUrl.pathname)
      return isPublic || !!auth
    }
  }
}

// auth.ts — Full config with Prisma adapter (Node.js only)
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [Google],
})
```

Middleware imports only `authConfig`. API routes import the full `auth`. Never cross the streams.

### Day 3 (June 2): Authentication

The login page is intentionally minimal: one Google button, a brand animation, done. Route protection is handled by Middleware — any unauthenticated request to a protected route redirects to `/login`. 

### Day 8 (June 6): The Core API Sprint

This was the heaviest single-day workload. I needed a complete REST API for the entire data model:

- **Contacts**: GET (with search + tag filters), POST, PATCH, soft DELETE
- **Tags**: Full CRUD for custom tags
- **Important Dates**: POST, DELETE
- **Interactions**: GET, POST, DELETE

Every route uses Zod for request validation. No dirty data enters the database:

```ts
const patchContactSchema = z.object({
  name: z.string().min(1).optional(),
  metAt: z.string().nullable().optional(),
  impression: z.string().nullable().optional(),
  contactFreq: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  avatar: z.string().nullable().optional(),
})
```

One subtle fix: DELETE operations use `deleteMany` instead of `delete`. Prisma's `delete` throws if the record doesn't exist — a race condition if you click twice. `deleteMany` silently does nothing. For a personal app this matters less, but the habit is good.

I also built the "Add Contact" UI this day: a `react-hook-form`-managed form with a `TagPicker` component that supports multi-select and inline creation of new tags.

### Day 9 (June 7): Feature Explosion

This was the most productive day — 8 features shipped from morning to evening.

#### Dashboard: Relationship Health at a Glance

The dashboard runs 5 database queries in parallel via `Promise.all`:

```ts
const [
  totalContacts,
  monthInteractions,
  upcomingDates,
  neglectedContacts,
  userName,
] = await Promise.all([
  prisma.contact.count({ where: { userId, deletedAt: null } }),
  // ...4 more queries
])
```

The "Neglected Contacts" list is my favorite feature — it finds people you haven't interacted with in 90+ days and shows how long it's been in bold red. It's a gentle, data-driven nudge.

#### Weather Widget: A Small Detail with Big Impact

The dashboard shows live weather in the top corner. Implementation:

1. Browser `Geolocation` API gets coordinates
2. Frontend calls `/api/weather?lat=...&lon=...` (server-side proxy)
3. Server holds the API key and proxies to OpenWeatherMap with 10-minute caching

A small but important security detail: **never put API keys in template literals**. Template strings appear in logs and error messages:

```ts
// ❌ Key could leak into logs via URL-in-error
const url = `https://api.openweathermap.org/...&appid=${apiKey}`

// ✅ URL object keeps the key out of string contexts
const url = new URL("https://api.openweathermap.org/data/2.5/weather")
url.searchParams.set("lat", String(lat))
url.searchParams.set("lon", String(lon))
url.searchParams.set("appid", apiKey)
```

Each weather condition maps to an emoji with a CSS animation: ☀️ pulses, 🌧️ drips downward, 🌫️ floats gently. One line of CSS @keyframes for each.

#### Voice Input: Record Instead of Type

The `MicButton` component uses the MediaRecorder API with a cross-browser format fallback:

```ts
const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
const recorder = new MediaRecorder(stream, { mimeType })

recorder.ondataavailable = (e) => chunks.push(e.data)
recorder.onstop = async () => {
  const blob = new Blob(chunks, { type: mimeType })
  const formData = new FormData()
  formData.append("audio", blob, `recording.${ext}`)
  // POST /api/voice/transcribe → Whisper API
}
```

While recording, 5 animated bars create a sound wave effect using pure CSS — each bar has a different `animationDelay` and `scaleY` range:

```css
@keyframes sound-bar-1 {
  0%, 100% { transform: scaleY(0.3); }
  50%       { transform: scaleY(1.0); }
}
.sound-bar-1 { animation: sound-bar-1 0.8s ease-in-out infinite; }
.sound-bar-2 { animation: sound-bar-2 0.9s ease-in-out infinite 0.1s; }
/* ... */
```

#### AI Assistant: Four Personalities, One Backend

The AI assistant connects to Claude Haiku with two operating modes:

- **Chat mode**: Natural conversation with full access to your contact data
- **Record mode**: Extract structured contact information from free-form text or voice

The four AI personalities (Knowho 🌿, Susu 🦉, Xiaonuan ☀️, Mingge 🎯) work by appending a `characterTone` suffix to the system prompt:

```ts
const toneSuffix = characterTone ? `\n\n${characterTone}` : ""
const systemPrompt = contacts.length > 0
  ? `You are the user's personal relationship assistant...${toneSuffix}`
  : `You are the user's personal relationship assistant...${toneSuffix}`
```

Voice replies use the browser's built-in `window.speechSynthesis` — zero cost, no API key:

```ts
function speakText(text: string) {
  if (!voiceReply || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = "zh-CN"
  // Xiaonuan: higher pitch, Mingge: lower pitch
  utter.pitch = character.id === "nuuan" ? 1.2 : character.id === "mingge" ? 0.9 : 1.0
  window.speechSynthesis.speak(utter)
}
```

This is a good reminder that the Web Platform itself is powerful — before reaching for an external API, check what the browser already provides.

#### Avatar System: Giving Contacts a Face

The avatar storage decision was intentionally simple: **a nullable string column**. Three possible states:

| Value | Display |
|-------|---------|
| `null` | Initial letter in a colored circle |
| `"🦊"` (emoji) | Emoji centered in a circle |
| `"data:image/..."` | Photo rendered via `<img>` |

Photo upload uses the FileReader API to convert to a base64 data URL — no object storage needed, no CDN, no extra cost:

```ts
function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    alert("Image must be under 2MB")
    return
  }
  const reader = new FileReader()
  reader.onload = (ev) => {
    if (typeof ev.target?.result === "string") onChange(ev.target.result)
  }
  reader.readAsDataURL(file)
}
```

For a personal tool with one user, storing base64 in PostgreSQL is completely reasonable. It simplifies the architecture significantly versus adding S3 or Cloudinary.

The `ContactAvatar` component handles all three cases:

```tsx
export function ContactAvatar({ name, avatar, size = "md" }: ContactAvatarProps) {
  if (avatar?.startsWith("data:image")) {
    return <img src={avatar} className="rounded-full object-cover" />
  }
  if (avatar) {
    return <span className="rounded-full">{avatar}</span>
  }
  return <div className="rounded-full">{name.charAt(0)}</div>
}
```

---

## Three Hard Problems Worth Discussing

### 1. Edge Runtime Boundaries

Next.js Middleware runs on the Edge Runtime, which excludes Node.js-specific modules. Prisma internally uses `node:util/types`, so it cannot run in Middleware. The solution is strict separation: Middleware only does JWT verification. No database access, ever.

This is actually a good architectural constraint — it forces you to think about what *needs* to happen on every request (auth check) versus what can wait for the actual route handler (data fetching).

### 2. Parallel Database Queries

The dashboard needed 5 different aggregations from the database. Running them sequentially would have meant waiting for each one to finish before starting the next. `Promise.all` parallelizes them:

```ts
// Sequential: ~600ms total
const a = await queryA()
const b = await queryB()
const c = await queryC()

// Parallel: ~200ms (limited by slowest query)
const [a, b, c] = await Promise.all([queryA(), queryB(), queryC()])
```

This is not a micro-optimization — it's a 3x improvement in perceived page load time.

### 3. Cross-Browser Audio Recording

Safari doesn't support `audio/webm`. Chrome doesn't support `audio/mp4` on some builds. The `MediaRecorder.isTypeSupported()` check is essential:

```ts
const mimeType = MediaRecorder.isTypeSupported("audio/webm") 
  ? "audio/webm" 
  : "audio/mp4"
```

Without this, the feature silently breaks in Safari. It's a small check that saves a lot of user confusion.

---

## Design Philosophy: Restraint Over Features

Three principles shaped every decision:

**1. Build for the actual use case, not the hypothetical one.** No collaboration features. No public profiles. No sharing. Knowho is a private tool, and it should stay private.

**2. Fail silently on optional features.** If geolocation is denied, no weather widget — but no error message either. If voice transcription fails, the input field stays blank — the user can type. The core flow should never be interrupted by a feature failure.

**3. Choose the simplest architecture that works.** Base64 avatars instead of S3. Browser TTS instead of OpenAI TTS. Local database instead of managed cloud DB. Each simplification removes a failure mode and reduces ongoing cost.

---

## What's Next

Knowho is currently a local-only personal tool. Planned next steps:

- [ ] Vercel deployment for multi-device access
- [ ] Relationship graph view (who introduced you to whom)
- [ ] Email digest: "You haven't contacted Li Ming in 30 days"
- [ ] CSV import from existing contacts

---

## Closing Thoughts

Building a tool for yourself removes the hardest part of product development: figuring out what users want. You already know what you want. The discipline shifts to a different place — resisting the urge to add "just one more feature" that you'll never actually use.

Knowho exists because I wanted something that would help me be a better friend, colleague, and human. Not by automating relationships, but by helping me remember and act.

The code will be open-sourced after cleanup. Until then, I hope this walkthrough is useful for anyone building something similar.

---

*Stack: Next.js · Prisma · PostgreSQL · NextAuth v5 · Tailwind CSS v4 · Anthropic Claude · OpenAI Whisper · OpenWeatherMap · Web Speech API*
