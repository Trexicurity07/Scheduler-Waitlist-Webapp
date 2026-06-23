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
