import { ResumeData, JobMatch } from '../types';
import {
  ExperienceTier,
  EXPERIENCE_TIER_LABELS,
  detectJobExperienceTier,
  matchesUserExperienceLevel,
} from './experienceLevelFilter';

export interface BaseJobOpening {
  id: string;
  title: string;
  company: string;
  logoColor: string;
  location: string;
  city: string;
  salary: string;
  tier: string;
  postedDate: string;
  requiredKeywords: string[];
  roleCategory: 'fullstack' | 'frontend' | 'backend' | 'data' | 'devops' | 'leadership' | 'general';
  experienceLevel?: ExperienceTier;
}

export const ALL_JOB_OPENINGS: BaseJobOpening[] = [
  // Entry-Level (0-2 yrs)
  {
    id: 'job-entry-1',
    title: 'Junior Full Stack Software Engineer (0-2 yrs)',
    company: 'Stripe',
    logoColor: '#635BFF',
    location: 'San Francisco, CA / Remote',
    city: 'San Francisco',
    salary: '$115,000 – $140,000 + Equity',
    tier: 'Early Career Program',
    postedDate: '1 day ago',
    roleCategory: 'fullstack',
    experienceLevel: 'entry',
    requiredKeywords: [
      'TypeScript & JavaScript',
      'React & Modern Frontend',
      'Node.js & Backend Services',
      'Git & Version Control',
      'RESTful API Integration',
    ],
  },
  {
    id: 'job-entry-2',
    title: 'Software Engineer I — Cloud Applications (Entry-Level)',
    company: 'Google',
    logoColor: '#4285F4',
    location: 'Mountain View / Bangalore (Hybrid)',
    city: 'Bangalore',
    salary: '₹16,00,000 – ₹24,00,000 / $120,000',
    tier: 'Early Career Talent',
    postedDate: 'Just now',
    roleCategory: 'fullstack',
    experienceLevel: 'entry',
    requiredKeywords: [
      'Problem Solving & Algorithms',
      'TypeScript & JavaScript',
      'React & Modern Frontend',
      'CI/CD Pipelines & Git Workflows',
      'RESTful API Integration',
    ],
  },
  {
    id: 'job-entry-3',
    title: 'Associate Frontend Developer (0-2 yrs)',
    company: 'Swiggy',
    logoColor: '#FC8019',
    location: 'Bangalore, India (Hybrid)',
    city: 'Bangalore',
    salary: '₹11,00,000 – ₹17,00,000',
    tier: 'Graduate Engineering Track',
    postedDate: '2 days ago',
    roleCategory: 'frontend',
    experienceLevel: 'entry',
    requiredKeywords: [
      'React',
      'TypeScript',
      'Tailwind CSS',
      'Git & Version Control',
      'RESTful API Integration',
    ],
  },

  // Mid-Level (3-5 yrs)
  {
    id: 'job-mid-1',
    title: 'Mid-Level Full Stack Engineer — Creator Products (3-5 yrs)',
    company: 'Spotify',
    logoColor: '#1DB954',
    location: 'New York, NY (Hybrid / Remote)',
    city: 'New York',
    salary: '$145,000 – $185,000',
    tier: 'Global Streaming Platform',
    postedDate: '4 days ago',
    roleCategory: 'fullstack',
    experienceLevel: 'mid',
    requiredKeywords: [
      'React',
      'TypeScript',
      'Node.js / Python',
      'RESTful API & GraphQL Design',
      'CI/CD Automation',
      'Git & Version Control',
    ],
  },
  {
    id: 'job-mid-2',
    title: 'Software Engineer II — Azure Platform (3-5 yrs)',
    company: 'Microsoft',
    logoColor: '#00A4EF',
    location: 'Redmond / Hyderabad / Remote',
    city: 'Seattle',
    salary: '$155,000 – $200,000 + Stock',
    tier: 'Enterprise Cloud Leader',
    postedDate: '3 days ago',
    roleCategory: 'fullstack',
    experienceLevel: 'mid',
    requiredKeywords: [
      'TypeScript & JavaScript',
      'React & Modern Frontend',
      'Node.js & Backend Services',
      'SQL & Database Design (PostgreSQL)',
      'Docker & Container Workflows',
    ],
  },
  {
    id: 'job-mid-3',
    title: 'Software Development Engineer II (SDE-2, 3-5 yrs)',
    company: 'Flipkart',
    logoColor: '#2874F0',
    location: 'Bangalore, India (Hybrid)',
    city: 'Bangalore',
    salary: '₹24,00,000 – ₹36,00,000',
    tier: 'E-Commerce Marketplace Giant',
    postedDate: '1 day ago',
    roleCategory: 'fullstack',
    experienceLevel: 'mid',
    requiredKeywords: [
      'Problem Solving & Algorithms',
      'TypeScript & JavaScript',
      'React & Modern Frontend',
      'Node.js & Backend Services',
      'SQL & Database Design (PostgreSQL)',
    ],
  },

  // Senior (6-10 yrs)
  {
    id: 'job-sf-1',
    title: 'Senior Full Stack Software Engineer (6-10 yrs)',
    company: 'Stripe',
    logoColor: '#635BFF',
    location: 'San Francisco, CA (Hybrid / Remote)',
    city: 'San Francisco',
    salary: '$185,000 – $240,000 + Equity',
    tier: 'Tier-1 Fintech Leader',
    postedDate: '2 days ago',
    roleCategory: 'fullstack',
    experienceLevel: 'senior',
    requiredKeywords: [
      'TypeScript & JavaScript',
      'React & Modern Frontend',
      'Node.js & Backend Services',
      'SQL & Database Design (PostgreSQL)',
      'RESTful API Integration',
      'CI/CD Pipelines & Git Workflows',
    ],
  },
  {
    id: 'job-sf-3',
    title: 'Senior Frontend Engineer — Design Systems (6-10 yrs)',
    company: 'Airbnb',
    logoColor: '#FF5A5F',
    location: 'San Francisco, CA / Hybrid',
    city: 'San Francisco',
    salary: '$180,000 – $235,000 + Equity',
    tier: 'Global Consumer Tech',
    postedDate: '1 day ago',
    roleCategory: 'frontend',
    experienceLevel: 'senior',
    requiredKeywords: [
      'React',
      'TypeScript',
      'Tailwind CSS',
      'Web Performance Optimization',
      'State Management (Redux/Zustand)',
      'CI/CD & Automated Testing (Jest/Cypress)',
    ],
  },
  {
    id: 'job-ny-2',
    title: 'Senior Backend Engineer — Distributed Infrastructure (6-10 yrs)',
    company: 'Datadog',
    logoColor: '#7742DA',
    location: 'New York, NY',
    city: 'New York',
    salary: '$185,000 – $245,000 + Equity',
    tier: 'Cloud Observability Leader',
    postedDate: '3 days ago',
    roleCategory: 'backend',
    experienceLevel: 'senior',
    requiredKeywords: [
      'Node.js / Python',
      'PostgreSQL & SQL Optimization',
      'Microservices Architecture',
      'Redis Caching & In-Memory Stores',
      'Docker & Containerization',
    ],
  },

  // Lead / Staff (10+ yrs)
  {
    id: 'job-lon-1',
    title: 'Lead Full Stack Engineer — Global Core (10+ yrs)',
    company: 'Revolut',
    logoColor: '#0075eb',
    location: 'London, UK (Hybrid / Remote)',
    city: 'London',
    salary: '£110,000 – £150,000 + Equity',
    tier: 'Global Fintech Unicorn',
    postedDate: '2 days ago',
    roleCategory: 'fullstack',
    experienceLevel: 'lead',
    requiredKeywords: [
      'TypeScript & JavaScript',
      'React & Modern Frontend',
      'Node.js & Backend Services',
      'PostgreSQL & SQL Optimization',
      'Microservices Architecture',
    ],
  },
  {
    id: 'job-rem-2',
    title: 'Staff UI / Frontend Platform Engineer (10+ yrs)',
    company: 'Netflix',
    logoColor: '#E50914',
    location: 'Los Gatos, CA / Remote',
    city: 'Remote',
    salary: '$220,000 – $310,000',
    tier: 'Entertainment & Streaming Leader',
    postedDate: '3 days ago',
    roleCategory: 'frontend',
    experienceLevel: 'lead',
    requiredKeywords: [
      'React',
      'TypeScript',
      'Web Performance Optimization',
      'State Management (Redux/Zustand)',
      'REST APIs & GraphQL',
    ],
  },

  // Director / Executive (12+ yrs)
  {
    id: 'job-exec-1',
    title: 'Director of Engineering — Core Cloud & AI Platform (12+ yrs)',
    company: 'GitHub',
    logoColor: '#24292e',
    location: 'Remote (Worldwide)',
    city: 'Remote',
    salary: '$265,000 – $360,000 + Equity',
    tier: 'Executive Engineering Leadership',
    postedDate: '2 days ago',
    roleCategory: 'leadership',
    experienceLevel: 'executive',
    requiredKeywords: [
      'Engineering Strategy & Roadmap',
      'System Architecture',
      'CI/CD Pipelines & Git Workflows',
      'Cloud Governance',
      'Cross-Org Delivery',
    ],
  },
];

function getCategoryFromRole(
  roleTitle: string
): 'fullstack' | 'frontend' | 'backend' | 'data' | 'devops' | 'leadership' | 'general' {
  const r = roleTitle.toLowerCase();
  if (r.includes('lead') || r.includes('manager') || r.includes('director') || r.includes('vp') || r.includes('head')) return 'leadership';
  if (r.includes('front') || r.includes('ui') || r.includes('react')) return 'frontend';
  if (r.includes('back') || r.includes('api') || r.includes('database')) return 'backend';
  if (r.includes('data') || r.includes('ml') || r.includes('ai') || r.includes('machine')) return 'data';
  if (r.includes('devops') || r.includes('cloud') || r.includes('sre') || r.includes('infra')) return 'devops';
  if (r.includes('full') || r.includes('software') || r.includes('developer') || r.includes('engineer')) return 'fullstack';
  return 'general';
}

export function calculateJobMatchesForResume(
  resume: ResumeData,
  preferredLocation?: string,
  userExperienceLevel?: string
): JobMatch[] {
  const targetCategory = getCategoryFromRole(resume.headline || resume.targetMarket);
  const candidateSkillsLower = resume.skills.map((s) => s.toLowerCase());
  const resumeTextLower = (
    (resume.rawText || '') +
    ' ' +
    resume.executiveProfile +
    ' ' +
    resume.workExperience.flatMap((e) => e.bullets.map((b) => b.text)).join(' ')
  ).toLowerCase();

  const userLocClean = (preferredLocation || resume.contactInfo || '').toLowerCase();

  const candidatePool = ALL_JOB_OPENINGS.filter((job) =>
    matchesUserExperienceLevel(
      {
        title: job.title,
        tier: job.tier,
        experienceLevel: job.experienceLevel ? EXPERIENCE_TIER_LABELS[job.experienceLevel] : undefined,
      },
      userExperienceLevel
    )
  );

  const sortedJobs = [...candidatePool].sort((a, b) => {
    let aScore = 0;
    let bScore = 0;

    if (a.roleCategory === targetCategory) aScore += 10;
    if (b.roleCategory === targetCategory) bScore += 10;

    if (userLocClean) {
      const aLoc = a.location.toLowerCase();
      const bLoc = b.location.toLowerCase();
      const aCity = a.city.toLowerCase();
      const bCity = b.city.toLowerCase();

      if (userLocClean.includes(aCity) || aLoc.includes(userLocClean)) aScore += 25;
      if (userLocClean.includes(bCity) || bLoc.includes(userLocClean)) bScore += 25;

      if (aLoc.includes('remote')) aScore += 8;
      if (bLoc.includes('remote')) bScore += 8;
    }

    return bScore - aScore;
  });

  return sortedJobs.slice(0, 8).map((job) => {
    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];

    job.requiredKeywords.forEach((kw) => {
      const kwLower = kw.toLowerCase();
      const parts = kwLower.split(/[/,&()]+/).map((p) => p.trim()).filter(Boolean);

      const isMatched =
        candidateSkillsLower.some((s) => kwLower.includes(s) || s.includes(kwLower)) ||
        parts.some((p) => candidateSkillsLower.some((s) => s.includes(p) || p.includes(s))) ||
        parts.some((p) => resumeTextLower.includes(p));

      if (isMatched) {
        matchedKeywords.push(kw);
      } else {
        missingKeywords.push(kw);
      }
    });

    const keywordRatio = matchedKeywords.length / job.requiredKeywords.length;
    const rawScore = Math.round(keywordRatio * 65 + (resume.metrics.impact / 100) * 25 + 8);
    const matchScore = Math.min(99, Math.max(72, rawScore));
    const detectedTier =
      job.experienceLevel || detectJobExperienceTier({ title: job.title, tier: job.tier });

    return {
      id: job.id,
      title: job.title,
      company: job.company,
      logoColor: job.logoColor,
      location: job.location,
      matchScore,
      salary: job.salary,
      matchedKeywords,
      missingKeywords,
      tier: job.tier,
      postedDate: job.postedDate,
      roleCategory: job.roleCategory,
      experienceLevel: EXPERIENCE_TIER_LABELS[detectedTier],
    };
  });
}
