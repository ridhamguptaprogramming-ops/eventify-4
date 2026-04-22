import { Event, EventStatus } from './api';

const DEFAULT_EVENT_DURATION_MS = 3 * 60 * 60 * 1000;

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getEventStartDate(event: Pick<Event, 'startDateTime' | 'date'>) {
  return parseDate(event.startDateTime) || parseDate(event.date);
}

export function getEventEndDate(
  event: Pick<Event, 'endDateTime' | 'startDateTime' | 'date'>
) {
  const explicitEnd = parseDate(event.endDateTime);
  const start = getEventStartDate(event);
  if (!start) {
    return explicitEnd;
  }
  if (explicitEnd && explicitEnd.getTime() > start.getTime()) {
    return explicitEnd;
  }
  return new Date(start.getTime() + DEFAULT_EVENT_DURATION_MS);
}

export function getEventStatus(
  event: Pick<Event, 'status' | 'startDateTime' | 'endDateTime' | 'date'>,
  now = new Date()
): EventStatus {
  if (event.status) {
    return event.status;
  }

  const start = getEventStartDate(event);
  if (!start) return 'upcoming';

  const end = getEventEndDate(event);
  if (!end) return 'upcoming';

  if (now.getTime() < start.getTime()) {
    return 'upcoming';
  }
  if (now.getTime() <= end.getTime()) {
    return 'ongoing';
  }
  return 'completed';
}

export function getEventLocation(event: Pick<Event, 'location' | 'venue'>) {
  return (event.location || event.venue || 'Location TBA').trim();
}

export function getEventAttendeesCount(
  event: Pick<Event, 'attendeesCount' | 'registeredCount'>
) {
  return typeof event.attendeesCount === 'number'
    ? event.attendeesCount
    : event.registeredCount ?? 0;
}

export function formatEventDateTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
) {
  if (!value) return 'Date TBD';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date TBD';
  return parsed.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

