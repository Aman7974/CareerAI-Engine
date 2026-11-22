export interface MetricScore {
  name: string;
  score: number;
  label: string;
  icon: string;
  colorClass: string;
  barColorClass: string;
}

export interface BulletPoint {
  id: string;
  text: string;
  originalText?: string;
  isAiModified?: boolean;
  isManuallyEdited?: boolean;
  isFlagged?: boolean;
  flagReason?: string;
  rewriteText?: string;
  hasStrongVerb?: boolean;
  hasQuantification?: boolean;
}

export interface WorkExperience {
  id: string;
  title: string;
  company: string;
  period: string;
  bullets: BulletPoint[];
}

export interface ProjectItem {
  id?: string;
  title: string;
  date?: string;
  link?: string;
  tech?: string;
  description: string; // High-level project overview/description (immutable metadata)
  bullets?: BulletPoint[]; // Existing project bullet points eligible for faithful ATS optimization
}

export interface ResumeSection {
  title: string;
  content: string[];
}

export interface PreAiResumeBaseline {
  workExperience: WorkExperience[];
  projects?: ProjectItem[];
  additionalInformation?: string[];
  skills: string[];
  headline: string;
  executiveProfile: string;
  overallScore: number;
  strongVerbsCount: number;
  passiveVoiceCount: number;
  metrics: {
    impact: number;
    keywordDensity: number;
    readability: number;
    executiveTone: number;
  };
}

export interface ResumeData {
  id: string;
  fileName: string;
  tier: string;
  lastScanned: string;
  parserEngine: string;
  targetMarket: string;
  candidateName: string;
  contactInfo: string;
  headline: string;
  executiveProfile: string;
  hasSummaryInOriginal?: boolean;
  workExperience: WorkExperience[];
  education?: string[];
  projects?: ProjectItem[];
  certifications?: string[];
  additionalInformation?: string[];
  additionalSections?: ResumeSection[];
  rawText?: string;
  skills: string[];
  suggestedSkills: { name: string; frequency: string; reason: string }[];
  missingKeywords: string[];
  aiAddedSkills?: string[];
  preAiBaseline?: PreAiResumeBaseline;
  strongVerbsCount: number;
  passiveVoiceCount: number;
  overallScore: number;
  metrics: {
    impact: number;
    keywordDensity: number;
    readability: number;
    executiveTone: number;
  };
  parseHash: string;
}

export type JobPortalSource =
  | 'Unstop'
  | 'LinkedIn'
  | 'Naukri'
  | 'Rozgaar Govt'
  | 'DRDO Careers'
  | 'Career Page'
  | 'Adzuna'
  | 'Web Live Feed'
  | 'Direct Employer';

export interface JobMatch {
  id: string;
  title: string;
  company: string;
  logoColor: string;
  location: string;
  matchScore: number;
  salary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  tier: string;
  postedDate: string;
  roleCategory?: string;
  experienceLevel?: string;
  applyUrl?: string;
  source?: 'Adzuna' | 'Web Live Feed' | 'Direct Employer';
  portalSource?: JobPortalSource;
  coordinates?: {
    lat: number;
    lng: number;
  };
  distanceKm?: number;
  description?: string;
  country?: string;
  countryCode?: string;
}

export interface CoPilotMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    actionType: string;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  targetRole: string;
  experienceLevel: string;
  yearsOfExperience: string;
  domain?: string;
  locationPreference?: string;
  location?: string;
  country?: string;
  countryCode?: string;
  emailVerified?: boolean;
  isGoogleAccount?: boolean;
  registeredPassword?: string;
}

