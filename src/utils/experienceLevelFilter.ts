import { JobMatch } from '../types';

export type ExperienceTier = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

export const EXPERIENCE_TIER_LABELS: Record<ExperienceTier, string> = {
  entry: 'Entry-Level (0-2 yrs)',
  mid: 'Mid-Level (3-5 yrs)',
  senior: 'Senior (6-10 yrs)',
  lead: 'Lead / Staff (10+ yrs)',
  executive: 'Director / Executive (12+ yrs)',
};

export const EXPERIENCE_TIER_YEARS: Record<ExperienceTier, string> = {
  entry: '1',
  mid: '4',
  senior: '8',
  lead: '11',
  executive: '14',
};

/**
 * Normalizes any signup or job experience-level label into one of 5 canonical tiers.
 */
export function normalizeExperienceLevel(raw?: string): ExperienceTier {
  if (!raw) return 'mid';
  const v = raw.toLowerCase().trim();

  if (
    v.includes('director') ||
    v.includes('executive') ||
    v.includes('vp') ||
    v.includes('vice president') ||
    v.includes('chief') ||
    v.includes('head of') ||
    v.includes('12+')
  ) {
    return 'executive';
  }

  if (
    v.includes('lead') ||
    v.includes('staff') ||
    v.includes('principal') ||
    v.includes('architect') ||
    v.includes('10+')
  ) {
    return 'lead';
  }

  if (
    v.includes('senior') ||
    v.includes('6-10') ||
    v.includes('sr.') ||
    /\bsr\b/.test(v)
  ) {
    return 'senior';
  }

  if (
    v.includes('entry') ||
    v.includes('0-2') ||
    v.includes('fresher') ||
    v.includes('junior') ||
    v.includes('trainee') ||
    v.includes('intern') ||
    v.includes('graduate')
  ) {
    return 'entry';
  }

  if (v.includes('mid') || v.includes('3-5') || v.includes('intermediate')) {
    return 'mid';
  }

  return 'mid';
}

export function getExperienceLevelLabel(raw?: string): string {
  return EXPERIENCE_TIER_LABELS[normalizeExperienceLevel(raw)];
}

export function getDefaultYearsForExperienceLevel(raw?: string): string {
  return EXPERIENCE_TIER_YEARS[normalizeExperienceLevel(raw)];
}

/**
 * Classifies a job posting into a canonical ExperienceTier based on explicit tag first,
 * then job title keywords, then description/tier clues.
 */
export function detectJobExperienceTier(
  job: Pick<JobMatch, 'title' | 'description' | 'tier' | 'experienceLevel'>
): ExperienceTier {
  if (job.experienceLevel && job.experienceLevel.trim()) {
    return normalizeExperienceLevel(job.experienceLevel);
  }

  const titleLower = (job.title || '').toLowerCase();
  const fullText = `${titleLower} ${(job.description || '').toLowerCase()} ${(job.tier || '').toLowerCase()}`;

  // 1. Strong title checks (highest confidence)
  if (/\b(director|vp|vice president|chief|cto|cio|ceo|executive|head of)\b/.test(titleLower)) {
    return 'executive';
  }

  if (/\b(lead|staff|principal|architect|distinguished|tech lead|team lead)\b/.test(titleLower)) {
    return 'lead';
  }

  if (
    /\b(entry[\s-]?level|junior|jr\.?|intern|internship|trainee|fresher|graduate|campus|apprentice|associate|sde[\s-]?1|sde[\s-]?i\b|engineer[\s-]?i\b|developer[\s-]?i\b|level[\s-]?1)\b/.test(
      titleLower
    )
  ) {
    return 'entry';
  }

  if (
    /\b(senior|sr\.?|sde[\s-]?3|sde[\s-]?iii|engineer[\s-]?iii|developer[\s-]?iii|specialist|scientist\s*'b')\b/.test(
      titleLower
    )
  ) {
    // Note: "SDE-2" / "II" is treated below as mid unless explicitly marked Senior
    if (/\b(sde[\s-]?2|sde[\s-]?ii)\b/.test(titleLower) && !/\b(senior|sr\.?)\b/.test(titleLower)) {
      return 'mid';
    }
    return 'senior';
  }

  if (
    /\b(mid[\s-]?level|intermediate|sde[\s-]?2|sde[\s-]?ii|engineer[\s-]?ii|developer[\s-]?ii)\b/.test(
      titleLower
    )
  ) {
    return 'mid';
  }

  // 2. Fallback checks on description/tier
  if (/\b(12\+\s*yrs|12\+\s*years|director|executive|vp)\b/.test(fullText)) {
    return 'executive';
  }
  if (/\b(10\+\s*yrs|10\+\s*years|staff engineer|principal engineer)\b/.test(fullText)) {
    return 'lead';
  }
  if (/\b(0-2\s*yrs|0–2\s*years|0-1\s*year|fresher|entry[\s-]?level|campus hiring|trainee)\b/.test(fullText)) {
    return 'entry';
  }
  if (/\b(6-10\s*yrs|5\+\s*years|6\+\s*years|7\+\s*years|senior engineer)\b/.test(fullText)) {
    return 'senior';
  }
  if (/\b(3-5\s*yrs|2-5\s*years|2-4\s*years|mid[\s-]?level)\b/.test(fullText)) {
    return 'mid';
  }

  return 'mid';
}

/**
 * Strictly checks whether a job matches the user's signup experienceLevel.
 * If userExperienceLevel is omitted/empty, allows all jobs.
 */
export function matchesUserExperienceLevel(
  job: Pick<JobMatch, 'title' | 'description' | 'tier' | 'experienceLevel'>,
  userExperienceLevel?: string
): boolean {
  if (!userExperienceLevel || !userExperienceLevel.trim()) return true;
  return detectJobExperienceTier(job) === normalizeExperienceLevel(userExperienceLevel);
}
