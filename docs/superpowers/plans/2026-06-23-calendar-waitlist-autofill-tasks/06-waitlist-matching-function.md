### Task 6: Waitlist Matching Function

**Files:**
- Create: `src/lib/matching/match-waitlist.ts`
- Test: `src/lib/matching/match-waitlist.test.ts`

**Interfaces:**
- Produces:
  - `interface TimeWindow { days: number[]; start: string; end: string }` (days: 0=Sunday..6=Saturday, start/end: `"HH:MM"` 24-hour)
  - `interface WaitlistEntryForMatching { id: string; createdAt: Date; timeWindows: TimeWindow[] }`
  - `interface SlotToMatch { startTime: Date; timezone: string }`
  - `matchWaitlistEntries(slot: SlotToMatch, entries: WaitlistEntryForMatching[]): WaitlistEntryForMatching[]`
  - Consumed by Task 13/14 (cron orchestration) to find candidates for a freed slot, given `waitlist_entries.time_windows` parsed into `TimeWindow[]`.

- [ ] **Step 1: Write the failing tests**

`src/lib/matching/match-waitlist.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { matchWaitlistEntries, type WaitlistEntryForMatching } from './match-waitlist'

function entry(
  id: string,
  createdAt: string,
  timeWindows: WaitlistEntryForMatching['timeWindows']
): WaitlistEntryForMatching {
  return { id, createdAt: new Date(createdAt), timeWindows }
}

describe('matchWaitlistEntries', () => {
  it('matches an entry whose window covers the slot day and time', () => {
    const slot = { startTime: new Date('2026-06-23T10:00:00Z'), timezone: 'UTC' }
    const entries = [entry('a', '2026-06-01T00:00:00Z', [{ days: [2], start: '09:00', end: '12:00' }])]
    expect(matchWaitlistEntries(slot, entries).map((e) => e.id)).toEqual(['a'])
  })

  it('does not match when the slot day is not in the window', () => {
    const slot = { startTime: new Date('2026-06-23T10:00:00Z'), timezone: 'UTC' }
    const entries = [entry('a', '2026-06-01T00:00:00Z', [{ days: [1], start: '09:00', end: '12:00' }])]
    expect(matchWaitlistEntries(slot, entries)).toEqual([])
  })

  it('does not match when the slot time is outside the window', () => {
    const slot = { startTime: new Date('2026-06-23T14:00:00Z'), timezone: 'UTC' }
    const entries = [entry('a', '2026-06-01T00:00:00Z', [{ days: [2], start: '09:00', end: '12:00' }])]
    expect(matchWaitlistEntries(slot, entries)).toEqual([])
  })

  it('matches an overnight window that wraps past midnight', () => {
    const slot = { startTime: new Date('2026-06-23T23:30:00Z'), timezone: 'UTC' }
    const entries = [entry('a', '2026-06-01T00:00:00Z', [{ days: [2], start: '22:00', end: '02:00' }])]
    expect(matchWaitlistEntries(slot, entries).map((e) => e.id)).toEqual(['a'])
  })

  it('matches if any one of multiple windows on an entry matches', () => {
    const slot = { startTime: new Date('2026-06-23T10:00:00Z'), timezone: 'UTC' }
    const entries = [
      entry('a', '2026-06-01T00:00:00Z', [
        { days: [1], start: '09:00', end: '12:00' },
        { days: [2], start: '09:00', end: '12:00' },
      ]),
    ]
    expect(matchWaitlistEntries(slot, entries).map((e) => e.id)).toEqual(['a'])
  })

  it('sorts matches by oldest createdAt first', () => {
    const slot = { startTime: new Date('2026-06-23T10:00:00Z'), timezone: 'UTC' }
    const window = [{ days: [2], start: '09:00', end: '12:00' }]
    const entries = [
      entry('newer', '2026-06-10T00:00:00Z', window),
      entry('older', '2026-05-01T00:00:00Z', window),
    ]
    expect(matchWaitlistEntries(slot, entries).map((e) => e.id)).toEqual(['older', 'newer'])
  })

  it('correctly converts to local time across a DST transition', () => {
    const slot = { startTime: new Date('2026-06-23T14:00:00Z'), timezone: 'America/New_York' }
    const entries = [entry('a', '2026-06-01T00:00:00Z', [{ days: [2], start: '09:00', end: '11:00' }])]
    expect(matchWaitlistEntries(slot, entries).map((e) => e.id)).toEqual(['a'])
  })

  it('handles local midnight correctly (Intl can report hour 24)', () => {
    const slot = { startTime: new Date('2026-06-23T00:00:00Z'), timezone: 'UTC' }
    const entries = [entry('a', '2026-06-01T00:00:00Z', [{ days: [2], start: '00:00', end: '01:00' }])]
    expect(matchWaitlistEntries(slot, entries).map((e) => e.id)).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- match-waitlist.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/lib/matching/match-waitlist.ts`**

```ts
export interface TimeWindow {
  days: number[]
  start: string
  end: string
}

export interface WaitlistEntryForMatching {
  id: string
  createdAt: Date
  timeWindows: TimeWindow[]
}

export interface SlotToMatch {
  startTime: Date
  timezone: string
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

function getLocalDayAndMinutes(instant: Date, timezone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant)

  const weekday = parts.find((p) => p.type === 'weekday')!.value
  const hourPart = parts.find((p) => p.type === 'hour')!.value
  const minutePart = parts.find((p) => p.type === 'minute')!.value

  const hour = hourPart === '24' ? 0 : parseInt(hourPart, 10)

  return {
    day: WEEKDAY_MAP[weekday],
    minutes: hour * 60 + parseInt(minutePart, 10),
  }
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function isWithinWindow(minutes: number, startMinutes: number, endMinutes: number): boolean {
  if (startMinutes <= endMinutes) {
    return minutes >= startMinutes && minutes < endMinutes
  }
  return minutes >= startMinutes || minutes < endMinutes
}

export function matchWaitlistEntries(
  slot: SlotToMatch,
  entries: WaitlistEntryForMatching[]
): WaitlistEntryForMatching[] {
  const { day, minutes } = getLocalDayAndMinutes(slot.startTime, slot.timezone)

  const matched = entries.filter((entry) =>
    entry.timeWindows.some((window) => {
      if (!window.days.includes(day)) return false
      return isWithinWindow(minutes, parseTimeToMinutes(window.start), parseTimeToMinutes(window.end))
    })
  )

  return matched.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- match-waitlist.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/matching
git commit -m "feat: add timezone-aware waitlist matching function"
```

---

