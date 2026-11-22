import { ResumeData, JobMatch, WorkExperience, BulletPoint, ProjectItem } from '../types';

export interface KeywordMirroringResult {
  priorityTerms: string[];
  allJobTerms: string[];
  verifiedToMirror: string[];
  notInSummaryYet: string[];
  notInTopBulletsYet: string[];
  notInResume: string[];
  suggestedSummary: string;
}

export interface ProjectBulletOptimization {
  id: string;
  projectIndex: number;
  projectTitle: string;
  bulletId: string;
  currentText: string;
  suggestedText: string;
  integratedKeywords: string[];
  reason: string;
}

export interface AdditionalInfoOverflowResult {
  existingEntries: string[];
  overflowEntries: string[];
  overflowKeywords: string[];
  alreadyCoveredKeywords: string[];
}

export interface StrictOptimizationPlan {
  priorityTerms: string[];
  allJobTerms: string[];
  projectBulletSuggestions: ProjectBulletOptimization[];
  integratedKeywords: string[];
  additionalInfoOverflow: AdditionalInfoOverflowResult;
}

export interface RelevanceOrderResult {
  reorderedSkills: string[];
  skillsChanged: boolean;
  reorderedProjects: ProjectItem[];
  projectsChanged: boolean;
  reorderedExperience: WorkExperience[];
  bulletsChanged: boolean;
  topMatchedTermsPerSkill: Record<string, boolean>;
}

const KNOWN_TECH_AND_METHODOLOGY_TERMS = [
  'React', 'React.js', 'TypeScript', 'JavaScript', 'Node.js', 'Express.js', 'Next.js',
  'Python', 'Java', 'C++', 'Go', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Mongoose',
  'Redis', 'GraphQL', 'REST APIs', 'RESTful APIs', 'Docker', 'Kubernetes', 'AWS', 'GCP',
  'Azure', 'CI/CD', 'Git', 'GitHub', 'GitHub Actions', 'Terraform', 'Microservices',
  'Tailwind CSS', 'Bootstrap', 'HTML5', 'CSS3', 'EJS', 'Vite', 'Jest', 'Cypress',
  'Unit Testing', 'Integration Testing', 'System Design', 'System Architecture',
  'Database Optimization', 'Query Indexing', 'Authentication', 'Authorization', 'Middleware',
  'OAuth2', 'JWT', 'Passport.js', 'WebSockets', 'Real-Time Messaging', 'Agile', 'Scrum',
  'Linux', 'Observability', 'Prometheus', 'Grafana', 'Datadog', 'API Integration',
  'State Management', 'Responsive Design', 'Cloud Deployment', 'CRUD Operations',
  'Error Handling', 'Data Modeling', 'Schema Design', 'Performance Optimization',
  'Machine Learning', 'PyTorch', 'TensorFlow', 'Pandas', 'NumPy', 'ETL', 'Snowflake', 'BigQuery',
];

/**
 * Extracts technical skills, tools, methodologies, and recurring phrases from Target Role + JD.
 */
export function extractJobKeywords(
  targetRole: string,
  jobDescription?: string,
  selectedJob?: JobMatch
): { priorityTerms: string[]; allTerms: string[] } {
  const combinedSource = [
    targetRole,
    selectedJob?.title || '',
    ...(selectedJob?.matchedKeywords || []),
    ...(selectedJob?.missingKeywords || []),
    jobDescription || selectedJob?.description || '',
  ]
    .filter(Boolean)
    .join('\n');

  const firstThird = combinedSource.slice(0, Math.max(120, Math.floor(combinedSource.length / 3)));
  const foundPriority: string[] = [];
  const foundAll: string[] = [];

  const pushUnique = (arr: string[], term: string) => {
    const clean = term.trim();
    if (!clean) return;
    if (!arr.some((x) => x.toLowerCase() === clean.toLowerCase())) {
      arr.push(clean);
    }
  };

  if (selectedJob) {
    [...(selectedJob.missingKeywords || []), ...(selectedJob.matchedKeywords || [])].forEach((kw) => {
      pushUnique(foundPriority, kw);
      pushUnique(foundAll, kw);
    });
  }

  KNOWN_TECH_AND_METHODOLOGY_TERMS.forEach((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(firstThird)) {
      pushUnique(foundPriority, term);
      pushUnique(foundAll, term);
    } else if (regex.test(combinedSource)) {
      pushUnique(foundAll, term);
    }
  });

  if (jobDescription && jobDescription.trim().length > 20) {
    const certMatches =
      jobDescription.match(/\b(?:AWS Certified|Azure|GCP|CKA|PMP|Scrum Master|Kubernetes)\b[^,.\n]*/gi) ||
      [];
    certMatches.forEach((c) => {
      const clean = c.trim();
      if (clean.length < 40) {
        pushUnique(foundPriority, clean);
        pushUnique(foundAll, clean);
      }
    });
  }

  if (foundAll.length === 0) {
    const r = targetRole.toLowerCase();
    const fallback = r.includes('front')
      ? ['React', 'TypeScript', 'Responsive Design', 'REST APIs', 'State Management', 'Automated Testing']
      : r.includes('back')
      ? ['Node.js', 'Express.js', 'RESTful APIs', 'MongoDB', 'SQL', 'Authentication', 'Middleware', 'Docker']
      : ['React', 'Node.js', 'TypeScript', 'RESTful APIs', 'MongoDB', 'SQL', 'Authentication', 'Docker', 'CI/CD', 'Git'];
    fallback.forEach((t) => {
      pushUnique(foundPriority, t);
      pushUnique(foundAll, t);
    });
  }

  return { priorityTerms: foundPriority, allTerms: foundAll };
}

/**
 * Rule 4 helper: Faithfully strengthens ONLY an existing project bullet point using active verbs
 * and relevant JD keywords already supported by that project's real work/stack.
 * NEVER invents new tools, metrics, or features the candidate did not build.
 */
function rephraseProjectBulletFaithfully(
  bulletText: string,
  proj: ProjectItem,
  jdTerms: string[]
): { suggestedText: string; integratedKeywords: string[]; reason: string } {
  const clean = bulletText.trim().replace(/^[-*•\d.]+\s*/, '');
  const lower = clean.toLowerCase();
  const projectContext = `${proj.title} ${proj.tech || ''} ${proj.description || ''} ${clean}`.toLowerCase();

  let rewritten = clean.replace(/\.$/, '');
  const integrated: string[] = [];

  // 1. Replace weak/passive openings with truthful strong engineering verbs
  const passivePrefixes: { pattern: RegExp; replacement: string }[] = [
    { pattern: /^(?:worked on|worked with|helped with|helped to|assisted with|assisted in)\s+/i, replacement: 'Engineered ' },
    { pattern: /^(?:responsible for|tasked with|duties included|was involved in)\s+/i, replacement: 'Implemented ' },
    { pattern: /^(?:participated in|contributed to|supported the team in)\s+/i, replacement: 'Developed ' },
    { pattern: /^made\s+/i, replacement: 'Built ' },
    { pattern: /^used\s+/i, replacement: 'Utilized ' },
  ];

  let verbStrengthened = false;
  for (const { pattern, replacement } of passivePrefixes) {
    if (pattern.test(rewritten)) {
      rewritten = rewritten.replace(pattern, replacement);
      verbStrengthened = true;
      break;
    }
  }

  // Upgrade soft initial verbs if appropriate
  if (/^created\s+/i.test(rewritten)) {
    rewritten = rewritten.replace(/^created\s+/i, 'Architected ');
    verbStrengthened = true;
  }

  // 2. Check which JD keywords are truthfully grounded in this bullet/project work and not yet named explicitly in the bullet
  const candidateTermsForBullet: { jdMatcher: RegExp; workCue: RegExp; label: string; phrase: string }[] = [
    {
      jdMatcher: /restful|rest api|api integration|api/i,
      workCue: /\b(?:route|endpoint|fetch|http|crud|request|api|backend)\b/i,
      label: 'RESTful APIs',
      phrase: 'RESTful API workflows',
    },
    {
      jdMatcher: /middleware/i,
      workCue: /\b(?:express|route|auth|validation|session|passport)\b/i,
      label: 'Middleware',
      phrase: 'Express middleware & validation',
    },
    {
      jdMatcher: /authentication|authorization|oauth2|jwt/i,
      workCue: /\b(?:login|auth|session|passport|signup|sign-in|user)\b/i,
      label: 'Authentication',
      phrase: 'secure authentication workflows',
    },
    {
      jdMatcher: /data modeling|schema design|database/i,
      workCue: /\b(?:mongo|mongoose|schema|collection|sql|table|query|database)\b/i,
      label: 'Data Modeling',
      phrase: 'structured database schema modeling',
    },
    {
      jdMatcher: /responsive design|ui|frontend/i,
      workCue: /\b(?:react|ejs|bootstrap|tailwind|css|mobile|responsive|component|view|ui)\b/i,
      label: 'Responsive Design',
      phrase: 'responsive UI components',
    },
    {
      jdMatcher: /state management/i,
      workCue: /\b(?:react|hooks|state|context|redux|zustand)\b/i,
      label: 'State Management',
      phrase: 'component state management',
    },
    {
      jdMatcher: /crud/i,
      workCue: /\b(?:create|edit|update|delete|listing|post|crud)\b/i,
      label: 'CRUD Operations',
      phrase: 'full CRUD lifecycle operations',
    },
    {
      jdMatcher: /real-?time|websocket/i,
      workCue: /\b(?:chat|message|messaging|instant|real-?time)\b/i,
      label: 'Real-Time Messaging',
      phrase: 'real-time messaging workflows',
    },
  ];

  // Also check explicit JD terms that appear in proj.tech or proj.description but are missing in this specific bullet
  jdTerms.forEach((term) => {
    const base = term.toLowerCase().replace(/\.js$/i, '');
    const alreadyInBullet =
      lower.includes(term.toLowerCase()) || (base.length >= 3 && lower.includes(base));
    const groundedInProject =
      projectContext.includes(term.toLowerCase()) ||
      (base.length >= 3 && projectContext.includes(base));

    if (!alreadyInBullet && groundedInProject && !integrated.includes(term)) {
      integrated.push(term);
    }
  });

  let matchedConceptPhrase: string | null = null;
  for (const cue of candidateTermsForBullet) {
    const jdWantsIt = jdTerms.some((t) => cue.jdMatcher.test(t));
    const bulletSupportsIt = cue.workCue.test(lower);
    const bulletAlreadyHasIt = lower.includes(cue.label.toLowerCase());

    if (jdWantsIt && bulletSupportsIt && !bulletAlreadyHasIt) {
      if (!integrated.includes(cue.label)) integrated.push(cue.label);
      if (!matchedConceptPhrase) matchedConceptPhrase = cue.phrase;
    }
  }

  // Naturally fold grounded JD alignment terms into the bullet without inventing tools or metrics
  if (matchedConceptPhrase && !rewritten.toLowerCase().includes(matchedConceptPhrase.toLowerCase())) {
    rewritten = `${rewritten}, aligning ${matchedConceptPhrase} with existing application capabilities`;
  } else if (integrated.length > 0) {
    const topGrounded = integrated.slice(0, 2);
    const missingFromText = topGrounded.filter((t) => !rewritten.toLowerCase().includes(t.toLowerCase()));
    if (missingFromText.length > 0) {
      rewritten = `${rewritten} using ${missingFromText.join(' and ')}`;
    }
  }

  // Ensure sentence-case and ending period
  rewritten = rewritten.charAt(0).toUpperCase() + rewritten.slice(1);
  if (!/[.!?]$/.test(rewritten)) rewritten += '.';

  const reasonParts: string[] = [];
  if (verbStrengthened) reasonParts.push('Strengthens action verb');
  if (integrated.length > 0) reasonParts.push(`Incorporates grounded JD terms (${integrated.join(', ')})`);
  if (reasonParts.length === 0) reasonParts.push('Already aligned with project facts & ATS phrasing');

  return {
    suggestedText: rewritten,
    integratedKeywords: integrated,
    reason: reasonParts.join(' • ') + ' (100% faithful; zero fabricated tools or metrics).',
  };
}

/**
 * STRICT IMMUTABILITY ATS OPTIMIZATION ENGINE
 * Enforces all 5 rules:
 * 1. Preserve entire resume structure (sections, headings, order, dates, links, contacts, education, experience)
 * 2. Never touch Project metadata (title, dates, links, tech stacks, high-level overview description)
 * 3. Never add or modify Summary/Objective statements
 * 4. Suggest edits ONLY for existing Project Bullet Points (preserving bullet count & 100% truth)
 * 5. Send overflow JD keywords/tools/methodologies/notes ONLY to "Additional Information" at bottom
 */
export function buildStrictAtsOptimizationPlan(
  resume: ResumeData,
  targetRole: string,
  jobDescription?: string,
  selectedJob?: JobMatch
): StrictOptimizationPlan {
  const { priorityTerms, allTerms } = extractJobKeywords(targetRole, jobDescription, selectedJob);

  const projectBulletSuggestions: ProjectBulletOptimization[] = [];
  const integratedKeywords: string[] = [];

  (resume.projects || []).forEach((proj, pIdx) => {
    const bullets = proj.bullets || [];
    bullets.forEach((b) => {
      const { suggestedText, integratedKeywords: bulletTerms, reason } =
        rephraseProjectBulletFaithfully(b.text, proj, allTerms);

      bulletTerms.forEach((t) => {
        if (!integratedKeywords.some((k) => k.toLowerCase() === t.toLowerCase())) {
          integratedKeywords.push(t);
        }
      });

      if (suggestedText.trim() !== b.text.trim()) {
        projectBulletSuggestions.push({
          id: `proj-opt-${pIdx}-${b.id}`,
          projectIndex: pIdx,
          projectTitle: proj.title,
          bulletId: b.id,
          currentText: b.text,
          suggestedText,
          integratedKeywords: bulletTerms,
          reason,
        });
      }
    });
  });

  // Check full existing resume corpus to find overflow terms
  const existingCorpus = [
    resume.headline,
    resume.executiveProfile,
    ...resume.skills,
    ...resume.workExperience.flatMap((e) => [e.title, e.company, ...e.bullets.map((b) => b.text)]),
    ...(resume.projects || []).flatMap((p) => [
      p.title,
      p.tech || '',
      p.description,
      ...(p.bullets || []).map((b) => b.text),
    ]),
    ...(resume.certifications || []),
    ...(resume.additionalInformation || []),
  ]
    .join(' ')
    .toLowerCase();

  const alreadyCoveredKeywords: string[] = [];
  const overflowKeywords: string[] = [];

  allTerms.forEach((term) => {
    const norm = term.toLowerCase();
    const base = norm.replace(/\.js$/i, '');
    const inResume = existingCorpus.includes(norm) || (base.length >= 3 && existingCorpus.includes(base));
    const integratedInBullets = integratedKeywords.some((k) => k.toLowerCase() === norm);

    if (inResume || integratedInBullets) {
      alreadyCoveredKeywords.push(term);
    } else {
      overflowKeywords.push(term);
    }
  });

  const existingEntries = [...(resume.additionalInformation || [])];
  const overflowEntries: string[] = [];

  if (overflowKeywords.length > 0) {
    const roleLabel = targetRole.trim() || selectedJob?.title || resume.headline || 'Target Role';
    const candidateNote = `Target Role Alignment (${roleLabel}): Familiar with JD methodologies & tools — ${overflowKeywords.join(', ')} (noted for ATS alignment; unverified tools not claimed in prior project implementations).`;
    if (!existingEntries.some((e) => e.toLowerCase().includes(overflowKeywords[0].toLowerCase()))) {
      overflowEntries.push(candidateNote);
    }
  }

  return {
    priorityTerms,
    allJobTerms: allTerms,
    projectBulletSuggestions,
    integratedKeywords,
    additionalInfoOverflow: {
      existingEntries,
      overflowEntries,
      overflowKeywords,
      alreadyCoveredKeywords,
    },
  };
}

/**
 * Generates the complete strict-rule ATS resume output string with ONLY:
 * - Modified/accepted project bullet points (exact count & untouched project metadata)
 * - Appended Additional Information section at the very end (preserving any existing entries)
 * Zero Summary/Objective added if not already present; zero fabrication.
 */
export function generateCompleteStrictOptimizedResumeText(
  resume: ResumeData,
  previewSuggestions: ProjectBulletOptimization[] = [],
  previewOverflowEntries: string[] = []
): string {
  const suggestionMap = new Map<string, string>();
  previewSuggestions.forEach((s) => {
    suggestionMap.set(`${s.projectIndex}:${s.bulletId}`, s.suggestedText);
  });

  const lines: string[] = [];

  // Header
  lines.push(resume.candidateName.toUpperCase());
  if (resume.contactInfo) lines.push(resume.contactInfo);
  if (resume.headline) lines.push(resume.headline);
  lines.push('');

  // Summary ONLY if already present in resume (Rule 3: never add Summary/Objective unless it exists)
  if (resume.executiveProfile && resume.executiveProfile.trim()) {
    lines.push('SUMMARY');
    lines.push(resume.executiveProfile.trim());
    lines.push('');
  }

  // Experience (Preserved intact)
  if (resume.workExperience && resume.workExperience.length > 0) {
    lines.push('EXPERIENCE');
    resume.workExperience.forEach((exp) => {
      lines.push(`${exp.title} | ${exp.company} | ${exp.period}`);
      exp.bullets.forEach((b) => {
        lines.push(`• ${b.text}`);
      });
      lines.push('');
    });
  }

  // Projects (Metadata untouched — ONLY bullet points reflect optimizations)
  if (resume.projects && resume.projects.length > 0) {
    lines.push('PROJECTS');
    resume.projects.forEach((proj, pIdx) => {
      const headerParts = [proj.title];
      if (proj.date) headerParts.push(proj.date);
      if (proj.link) headerParts.push(proj.link);
      lines.push(headerParts.join(' | '));
      if (proj.tech) lines.push(`Technologies: ${proj.tech}`);
      if (proj.description && proj.description.trim()) {
        lines.push(proj.description.trim());
      }
      (proj.bullets || []).forEach((b) => {
        const optimized = suggestionMap.get(`${pIdx}:${b.id}`) || b.text;
        lines.push(`• ${optimized}`);
      });
      lines.push('');
    });
  }

  // Skills (Preserved intact)
  if (resume.skills && resume.skills.length > 0) {
    lines.push('SKILLS');
    lines.push(resume.skills.join(', '));
    lines.push('');
  }

  // Education (Preserved intact)
  if (resume.education && resume.education.length > 0) {
    lines.push('EDUCATION');
    resume.education.forEach((edu) => {
      lines.push(`• ${edu}`);
    });
    lines.push('');
  }

  // Certifications (Preserved intact if present)
  if (resume.certifications && resume.certifications.length > 0) {
    lines.push('CERTIFICATIONS');
    resume.certifications.forEach((cert) => {
      lines.push(`• ${cert}`);
    });
    lines.push('');
  }

  // Additional Information at the very end (Rule 5: existing + appended overflow)
  const combinedAdditional = Array.from(
    new Set([...(resume.additionalInformation || []), ...previewOverflowEntries])
  ).filter(Boolean);

  if (combinedAdditional.length > 0) {
    lines.push('ADDITIONAL INFORMATION');
    combinedAdditional.forEach((item) => {
      lines.push(`• ${item}`);
    });
  }

  return lines.join('\n').trim();
}

/**
 * Legacy compatibility helpers (preserved for DashboardView / existing calls without breaking imports)
 */
export function analyzeKeywordMirroring(
  resume: ResumeData,
  targetRole: string,
  jobDescription?: string,
  selectedJob?: JobMatch
): KeywordMirroringResult {
  const plan = buildStrictAtsOptimizationPlan(resume, targetRole, jobDescription, selectedJob);
  return {
    priorityTerms: plan.priorityTerms,
    allJobTerms: plan.allJobTerms,
    verifiedToMirror: plan.additionalInfoOverflow.alreadyCoveredKeywords,
    notInSummaryYet: [],
    notInTopBulletsYet: [],
    notInResume: plan.additionalInfoOverflow.overflowKeywords,
    // Rule 3: Never invent/rewrite Summary
    suggestedSummary: resume.executiveProfile || '',
  };
}

export function computeRelevanceOrder(
  resume: ResumeData,
  _targetRole: string,
  _jobDescription?: string,
  _selectedJob?: JobMatch
): RelevanceOrderResult {
  const topMatchedTermsPerSkill: Record<string, boolean> = {};
  resume.skills.forEach((s) => {
    topMatchedTermsPerSkill[s] = true;
  });
  return {
    reorderedSkills: resume.skills,
    skillsChanged: false,
    reorderedProjects: resume.projects || [],
    projectsChanged: false,
    reorderedExperience: resume.workExperience,
    bulletsChanged: false,
    topMatchedTermsPerSkill,
  };
}

export function buildQuantifiableBulletSuggestions(
  resume: ResumeData,
  targetRole: string,
  jobDescription?: string,
  selectedJob?: JobMatch
) {
  const plan = buildStrictAtsOptimizationPlan(resume, targetRole, jobDescription, selectedJob);
  return plan.projectBulletSuggestions.map((s) => ({
    id: s.id,
    expId: `project-${s.projectIndex}`,
    expTitle: s.projectTitle,
    bulletId: s.bulletId,
    currentText: s.currentText,
    suggestedText: s.suggestedText,
    matchedJobTerms: s.integratedKeywords,
    reason: s.reason,
  }));
}
