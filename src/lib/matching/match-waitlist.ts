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
