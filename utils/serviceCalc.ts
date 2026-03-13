import { maintenanceSchedule, ServiceMilestone } from '../data/maintenanceSchedule';
import { ServiceCompletion } from '../hooks/useVespaData';

export type ServiceStatus = 'done' | 'upcoming' | 'future';

export interface ServiceEntry {
  milestone: ServiceMilestone;
  status: ServiceStatus;
  estimatedDate: Date | null;
  kmRemaining: number | null;
  daysRemaining: number | null;
  monthOccurrence?: number;
}

export interface NextService {
  entry: ServiceEntry;
  kmRemaining: number | null;
  daysRemaining: number | null;
  serviceLabel: string;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Returns all service entries sorted by estimated date.
 * Skips the occ=0 entry (commissioning date) for time-based milestones.
 */
export function getServiceTimeline(
  commissioningDate: Date,
  currentKm: number,
  completedServices: Record<string, ServiceCompletion> = {}
): ServiceEntry[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysSinceCommissioning = Math.max(1, daysBetween(commissioningDate, today));
  const avgKmPerDay = currentKm / daysSinceCommissioning;
  const monthsElapsed =
    (today.getFullYear() - commissioningDate.getFullYear()) * 12 +
    (today.getMonth() - commissioningDate.getMonth());

  const entries: ServiceEntry[] = [];

  for (const milestone of maintenanceSchedule) {
    if (milestone.kmThreshold > 0 && milestone.monthsThreshold === 0) {
      // KM-based milestone
      const isManuallyDone = !!completedServices[milestone.id];
      const isKmReached = currentKm >= milestone.kmThreshold;
      const isDone = isManuallyDone || isKmReached;

      const kmRemaining = isDone ? 0 : milestone.kmThreshold - currentKm;

      let estimatedDate: Date | null = null;
      let daysRemaining: number | null = null;

      if (!isDone && avgKmPerDay > 0) {
        const daysUntil = Math.round(kmRemaining / avgKmPerDay);
        estimatedDate = addDays(today, daysUntil);
        daysRemaining = daysUntil;
      } else if (isDone) {
        if (isManuallyDone) {
          estimatedDate = new Date(completedServices[milestone.id].completedAt);
        } else if (avgKmPerDay > 0) {
          const daysAgo = Math.round(
            (currentKm - milestone.kmThreshold) / avgKmPerDay
          );
          estimatedDate = addDays(today, -daysAgo);
        }
      }

      entries.push({
        milestone,
        status: isDone ? 'done' : 'future', // will be resolved below
        estimatedDate,
        kmRemaining: isDone ? 0 : kmRemaining,
        daysRemaining: isDone ? null : daysRemaining,
      });
    } else if (milestone.kmThreshold === 0 && milestone.monthsThreshold > 0) {
      // Time-based repeating milestone
      const intervalMonths = milestone.monthsThreshold;
      const occurrencesDone = Math.floor(monthsElapsed / intervalMonths);

      // Skip occ=0 (commissioning date), start from occ=1
      const startOccurrence = Math.max(1, occurrencesDone - 1);
      const endOccurrence = occurrencesDone + 3;

      for (let occ = startOccurrence; occ <= endOccurrence; occ++) {
        const serviceDate = addMonths(commissioningDate, occ * intervalMonths);
        serviceDate.setHours(0, 0, 0, 0);

        const occId = `${milestone.id}_occ${occ}`;
        const isManuallyDone = !!completedServices[occId];
        const isDatePassed = today >= serviceDate;
        const isDone = isManuallyDone || isDatePassed;
        const daysRem = isDone ? null : daysBetween(today, serviceDate);

        const occLabel =
          occ === 1
            ? milestone.label
            : `${milestone.label} (${occ}×)`;

        entries.push({
          milestone: {
            ...milestone,
            id: occId,
            label: occLabel,
          },
          status: isDone ? 'done' : 'future',
          estimatedDate: serviceDate,
          kmRemaining: null,
          daysRemaining: daysRem,
          monthOccurrence: occ,
        });
      }
    }
  }

  // Sort by estimated date
  entries.sort((a, b) => {
    if (a.estimatedDate && b.estimatedDate) {
      return a.estimatedDate.getTime() - b.estimatedDate.getTime();
    }
    if (a.estimatedDate) return -1;
    if (b.estimatedDate) return 1;
    return a.milestone.kmThreshold - b.milestone.kmThreshold;
  });

  // First non-done entry becomes 'upcoming', the rest 'future'
  let foundUpcoming = false;
  for (const entry of entries) {
    if (entry.status !== 'done') {
      if (!foundUpcoming) {
        entry.status = 'upcoming';
        foundUpcoming = true;
      } else {
        entry.status = 'future';
      }
    }
  }

  return entries;
}

/**
 * Returns the next upcoming service with both km and days remaining.
 */
export function getNextService(
  commissioningDate: Date,
  currentKm: number,
  completedServices: Record<string, ServiceCompletion> = {}
): NextService | null {
  const timeline = getServiceTimeline(commissioningDate, currentKm, completedServices);
  const next = timeline.find((e) => e.status === 'upcoming');
  if (!next) return null;

  return {
    entry: next,
    kmRemaining: next.kmRemaining,
    daysRemaining: next.daysRemaining,
    serviceLabel:
      next.milestone.kmThreshold > 0
        ? `Pravidelná prohlídka ${next.milestone.label}`
        : `Časová prohlídka – ${next.milestone.label}`,
  };
}

export interface NextServicePair {
  nextKm: { entry: ServiceEntry; kmRemaining: number } | null;
  nextTime: { entry: ServiceEntry; daysRemaining: number } | null;
}

/**
 * Returns separately the next km-based and next time-based upcoming service.
 * Both can trigger a service, whichever comes first.
 */
export function getNextServicePair(
  commissioningDate: Date,
  currentKm: number,
  completedServices: Record<string, ServiceCompletion> = {}
): NextServicePair {
  const timeline = getServiceTimeline(commissioningDate, currentKm, completedServices);

  const nextKmEntry = timeline.find(
    (e) => e.status !== 'done' && e.milestone.kmThreshold > 0 && e.milestone.monthsThreshold === 0
  );
  const nextTimeEntry = timeline.find(
    (e) => e.status !== 'done' && e.milestone.kmThreshold === 0 && e.milestone.monthsThreshold > 0
  );

  return {
    nextKm:
      nextKmEntry && nextKmEntry.kmRemaining !== null
        ? { entry: nextKmEntry, kmRemaining: nextKmEntry.kmRemaining }
        : null,
    nextTime:
      nextTimeEntry && nextTimeEntry.daysRemaining !== null
        ? { entry: nextTimeEntry, daysRemaining: nextTimeEntry.daysRemaining }
        : null,
  };
}

/**
 * Checks whether any service is overdue (upcoming entry with date in the past or km exceeded).
 */
export function getOverdueService(
  commissioningDate: Date,
  currentKm: number,
  completedServices: Record<string, ServiceCompletion> = {}
): ServiceEntry | null {
  const timeline = getServiceTimeline(commissioningDate, currentKm, completedServices);
  const upcoming = timeline.find((e) => e.status === 'upcoming');
  if (!upcoming) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateOverdue =
    upcoming.estimatedDate !== null && upcoming.estimatedDate <= today;
  const isKmOverdue =
    upcoming.milestone.kmThreshold > 0 &&
    currentKm >= upcoming.milestone.kmThreshold;

  if (isDateOverdue || isKmOverdue) {
    return upcoming;
  }
  return null;
}

export function formatKm(km: number): string {
  return `${km.toLocaleString('cs-CZ')} km`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getProgressToNextKm(currentKm: number): number {
  const kmMilestones = maintenanceSchedule
    .filter((m) => m.kmThreshold > 0)
    .map((m) => m.kmThreshold)
    .sort((a, b) => a - b);

  const prevMilestone =
    [...kmMilestones].reverse().find((km) => km <= currentKm) ?? 0;
  const nextMilestone = kmMilestones.find((km) => km > currentKm);

  if (!nextMilestone) return 1;
  return Math.min(1, Math.max(0, (currentKm - prevMilestone) / (nextMilestone - prevMilestone)));
}
