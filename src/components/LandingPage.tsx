import React, { useState } from 'react';
import { Check, X, Minus, ArrowRight, FileText, MapPin, Download, ShieldCheck, Sliders } from 'lucide-react';
import heroWorkspaceImg from '../assets/images/hero_career_workspace_1795249070257.jpg';

interface LandingPageProps {
  onGetStarted: (initialMode: 'signup' | 'signin') => void;
  hasSavedAccount?: boolean;
}

type BenchmarkCategory = 'all' | 'resume' | 'jobs' | 'control';
type WorkflowStepId = 'diagnose' | 'tailor' | 'match';

interface BenchmarkMetric {
  id: string;
  category: Exclude<BenchmarkCategory, 'all'>;
  label: string;
  description: string;
  careerAi: number;
  genericCheckers: number;
  keywordScanners: number;
  jobPortals: number;
}

const BENCHMARK_METRICS: BenchmarkMetric[] = [
  {
    id: 'education-lock',
    category: 'control',
    label: 'Education, Personal Info & Project Preservation',
    description: 'Keeps your original degree, college, grades, and projects untouched during tailoring.',
    careerAi: 100,
    genericCheckers: 45,
    keywordScanners: 60,
    jobPortals: 50,
  },
  {
    id: 'concise-bullets',
    category: 'resume',
    label: 'Concise 3–4 Prominent Statement Tailoring',
    description: 'Avoids bulky 12-bullet rewrites by curating 3 to 4 high-impact, quantified statements.',
    careerAi: 98,
    genericCheckers: 42,
    keywordScanners: 35,
    jobPortals: 25,
  },
  {
    id: 'location-jobs',
    category: 'jobs',
    label: 'Location-Aware Multi-Board Job Sync',
    description: 'Connects resume skills to live openings near your city across LinkedIn, Naukri, Unstop, and Adzuna.',
    careerAi: 96,
    genericCheckers: 15,
    keywordScanners: 25,
    jobPortals: 74,
  },
  {
    id: 'keyword-export',
    category: 'resume',
    label: 'Keyword Add/Remove & PDF / .DOC / .TXT Export',
    description: 'Direct skill adjustments and instant multi-format document downloads without formatting loss.',
    careerAi: 100,
    genericCheckers: 52,
    keywordScanners: 48,
    jobPortals: 20,
  },
  {
    id: 'zero-paywall',
    category: 'control',
    label: 'Full Feature Access & Returning User Auto-Load',
    description: 'Complete diagnostics, tailoring, exports, and saved resume reload with no mandatory paywall.',
    careerAi: 100,
    genericCheckers: 22,
    keywordScanners: 28,
    jobPortals: 45,
  },
];

interface ComparisonRow {
  criterion: string;
  detail: string;
  careerAi: { status: 'yes' | 'partial' | 'no'; label: string };
  checkers: { status: 'yes' | 'partial' | 'no'; label: string };
  scanners: { status: 'yes' | 'partial' | 'no'; label: string };
  portals: { status: 'yes' | 'partial' | 'no'; label: string };
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    criterion: 'Preserves Education & Personal Details',
    detail: 'Locks degrees, school names, CGPA, and contact links strictly as uploaded',
    careerAi: { status: 'yes', label: 'Always Preserved' },
    checkers: { status: 'partial', label: 'Template Overwrites' },
    scanners: { status: 'partial', label: 'Text-Only View' },
    portals: { status: 'partial', label: 'Re-parses Fields' },
  },
  {
    criterion: 'Tailored Statement Conciseness',
    detail: 'Number of rewritten experience statements injected per role',
    careerAi: { status: 'yes', label: '3–4 Prominent' },
    checkers: { status: 'no', label: 'Bulky 10+ Rewrites' },
    scanners: { status: 'no', label: 'No Rewrite Engine' },
    portals: { status: 'no', label: 'None' },
  },
  {
    criterion: 'Project Portfolio Integrity',
    detail: 'Keeps real personal and academic projects intact without replacing them',
    careerAi: { status: 'yes', label: '100% Intact' },
    checkers: { status: 'partial', label: 'Often Merged/Altered' },
    scanners: { status: 'no', label: 'Unparsed Text' },
    portals: { status: 'partial', label: 'Basic Form Only' },
  },
  {
    criterion: 'Interactive Keyword Add & Remove',
    detail: 'One-click skill injection and removal aligned to target job descriptions',
    careerAi: { status: 'yes', label: 'Full Control' },
    checkers: { status: 'partial', label: 'Read-Only Hints' },
    scanners: { status: 'partial', label: 'Checklist Only' },
    portals: { status: 'no', label: 'Tag Cloud Only' },
  },
  {
    criterion: 'Location & Nearby Live Job Matching',
    detail: 'Real openings synced to LinkedIn, Naukri, Unstop, and Adzuna by city',
    careerAi: { status: 'yes', label: 'Multi-Board + Map' },
    checkers: { status: 'no', label: 'Not Supported' },
    scanners: { status: 'no', label: 'Not Supported' },
    portals: { status: 'partial', label: 'Single Site Only' },
  },
  {
    criterion: 'Direct Multi-Format System Export',
    detail: 'Download tailored resume immediately as formatted PDF, Word (.doc), or .txt',
    careerAi: { status: 'yes', label: 'PDF, .DOC & .TXT' },
    checkers: { status: 'partial', label: 'Locked Behind Paywall' },
    scanners: { status: 'no', label: 'No Export' },
    portals: { status: 'no', label: 'Generic Profile PDF' },
  },
  {
    criterion: 'Saved User Instant Resume Reload',
    detail: 'Returning users skip re-upload and load saved analysis automatically',
    careerAi: { status: 'yes', label: 'Auto-Loaded' },
    checkers: { status: 'partial', label: 'Manual Selection' },
    scanners: { status: 'no', label: 'Re-Paste Required' },
    portals: { status: 'yes', label: 'Profile Saved' },
  },
  {
    criterion: 'Pre-Signup Transparency',
    detail: 'Review features, diagnostics method, and benchmarks before entering personal data',
    careerAi: { status: 'yes', label: 'Zero Data Gate' },
    checkers: { status: 'no', label: 'Forced Upload First' },
    scanners: { status: 'no', label: 'Paywall / Login Wall' },
    portals: { status: 'no', label: 'Account Required' },
  },
];

const WORKFLOW_STEPS: Record<
  WorkflowStepId,
  {
    stepLabel: string;
    title: string;
    summary: string;
    highlights: string[];
    previewTitle: string;
    beforeLabel: string;
    beforeContent: string;
    afterLabel: string;
    afterContent: string;
  }
> = {
  diagnose: {
    stepLabel: '01. Diagnose',
    title: 'Pinpoint weak phrasing without losing your real academic history',
    summary:
      'Upload PDF or plain-text resumes once. CareerAI Engine separates personal info, education, projects, and skill tags, then highlights passive statements that lack measurable impact.',
    highlights: [
      'Highlights exact lines needing action verbs or quantified metrics',
      'Locks degree, college, CGPA, and personal contact details automatically',
      'Returning users load their saved resume right away without re-uploading',
    ],
    previewTitle: 'Diagnostic Statement Review',
    beforeLabel: 'Detected Issue · Missing Metric & Passive Verb',
    beforeContent:
      'Worked on backend messaging application using Express.js and MongoDB for data storage and user communication.',
    afterLabel: 'Recommended Upgrade · Action Verb + Measurable Outcome',
    afterContent:
      'Engineered high-concurrency real-time messaging services using Express.js and MongoDB, achieving 99.9% message transmission reliability.',
  },
  tailor: {
    stepLabel: '02. Tailor',
    title: 'Curate 3 to 4 prominent statements tailored to each role',
    summary:
      'Instead of padding your resume with repetitive 10-bullet walls of text, the Tailorer distills your strongest achievements into 3 to 4 punchy statements while letting you add or remove role keywords cleanly.',
    highlights: [
      'Strictly capped at 3–4 prominent experience statements for 1-page clarity',
      'Add missing ATS keywords or remove irrelevant skills in one click',
      'Export directly to your computer as PDF, Word (.doc), or ATS .txt',
    ],
    previewTitle: 'Clean 3–4 Statement Profile Output',
    beforeLabel: 'Generic Resume Checker Output',
    beforeContent:
      '12 dense bullet lines repeating similar phrasing across overlapping project blocks, pushing education onto a cluttered second page.',
    afterLabel: 'CareerAI Tailored Output (4 Prominent Statements)',
    afterContent:
      '1) Architected full-stack travel platform supporting 50+ concurrent listings (<120ms API latency). 2) Engineered Express/MongoDB messaging (99.9% delivery). 3) Built React/Vite UI (98+ Lighthouse). 4) Indexed Mongoose schemas (+42% query speed).',
  },
  match: {
    stepLabel: '03. Match Jobs',
    title: 'Discover live roles near your city across major hiring boards',
    summary:
      'Every tailored skill feeds directly into location-aware job discovery across LinkedIn, Naukri, Unstop, and Adzuna—ranked by skill overlap so you know which roles fit best and where to apply.',
    highlights: [
      'Filters roles by your preferred city, country, and nearby commute radius',
      'Shows matched vs. missing keywords before you click apply',
      'Direct links to live listings on LinkedIn, Naukri, Unstop, and Adzuna',
    ],
    previewTitle: 'Location-Synced Job Match Breakdown',
    beforeLabel: 'Standard Job Portal Feed',
    beforeContent:
      'Unfiltered listings mixed across distant locations with zero visibility into which resume keywords triggered or failed recruiter ATS filters.',
    afterLabel: 'CareerAI Location Match · Bengaluru / Bhopal / Remote',
    afterContent:
      'Full Stack Software Engineer · 92% Skill Overlap · Matched: React, Node.js, Express, MongoDB · 1 Missing Keyword: Docker (1-Click Add to Resume) · Live on LinkedIn & Naukri.',
  },
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  hasSavedAccount = false,
}) => {
  const [heroImageError, setHeroImageError] = useState(false);
  const [benchmarkFilter, setBenchmarkFilter] = useState<BenchmarkCategory>('all');
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowStepId>('diagnose');

  const visibleBenchmarks =
    benchmarkFilter === 'all'
      ? BENCHMARK_METRICS
      : BENCHMARK_METRICS.filter((m) => m.category === benchmarkFilter);

  const currentStep = WORKFLOW_STEPS[activeWorkflow];

  const renderStatusCell = (cell: { status: 'yes' | 'partial' | 'no'; label: string }, isPrimaryCol: boolean) => {
    if (cell.status === 'yes') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            isPrimaryCol ? 'text-sky-700' : 'text-emerald-700'
          }`}
        >
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{cell.label}</span>
        </span>
      );
    }
    if (cell.status === 'partial') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
          <Minus className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{cell.label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <X className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{cell.label}</span>
      </span>
    );
  };

  return (
    <div
      id="top"
      className="min-h-screen bg-[#f8fafc] text-[#0b192c] font-['DM_Sans',sans-serif] selection:bg-sky-600 selection:text-white"
    >
      {/* Top Bar Contract: Zone 1 (Wordmark) — Zone 2 (4 Single-line Nav Links) — Zone 3 (1 Primary CTA) */}
      <header className="sticky top-0 z-40 bg-[#f8fafc]/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-[#0b192c] font-['Plus_Jakarta_Sans',sans-serif] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 rounded"
          >
            CareerAI Engine
          </a>

          {/* Zone 2: 4 concise single-line text links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            <a
              href="#what-it-provides"
              className="hover:text-[#0b192c] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              What It Provides
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#0b192c] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#comparison"
              className="hover:text-[#0b192c] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Compare Platforms
            </a>
            <a
              href="#job-matching"
              className="hover:text-[#0b192c] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Job Matching
            </a>
          </nav>

          {/* Zone 3: Separate Log In and Sign Up entry actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onGetStarted('signin')}
              className="px-3 py-2 text-sm font-semibold text-[#0b192c] hover:text-[#0284c7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => onGetStarted('signup')}
              className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284c7]"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* 1. HERO SECTION — Proposition before collecting any user data */}
        <section className="max-w-[1280px] mx-auto px-6 pt-12 pb-16 lg:pt-16 lg:pb-20 border-b border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Column: Core Proposition */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-sm font-semibold text-[#0284c7] tracking-tight mb-3">
                Resume Diagnostics &amp; Location-Aware Job Matching
              </p>
              <h1
                className="font-['Plus_Jakarta_Sans',sans-serif] font-extrabold tracking-tight text-[#0b192c] leading-[1.08] mb-5"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                Improve your resume cleanly and find roles near your city.
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-7">
                CareerAI Engine inspects your actual resume, upgrades weak bullets into strictly 3 to 4 prominent quantified statements, preserves your education and projects untouched, and matches you with live jobs on LinkedIn, Naukri, Unstop, and Adzuna.
              </p>

              {/* Single Dominant Primary CTA + Quiet Secondary Link */}
              <div className="flex flex-wrap items-center gap-5 mb-6">
                <button
                  type="button"
                  onClick={() => onGetStarted('signup')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284c7]"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onGetStarted('signin')}
                  className="text-sm font-semibold text-[#0b192c] hover:text-[#0284c7] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Already registered? Log in
                </button>
              </div>

              {/* Clean unboxed metadata strip (Zero-Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pt-2 border-t border-slate-200/80">
                <span>No information taken until sign-up</span>
                <span aria-hidden="true">·</span>
                <span>Education &amp; projects locked</span>
                <span aria-hidden="true">·</span>
                <span>Export PDF, .DOC &amp; .TXT</span>
              </div>
            </div>

            {/* Right Column: High-Impact 16:9 Visual Asset */}
            <div className="lg:col-span-6 flex items-stretch">
              <div className="w-full rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between">
                {!heroImageError ? (
                  <img
                    src={heroWorkspaceImg}
                    alt="Dual-screen CareerAI workspace displaying structured resume sections alongside geographic job matching map"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImageError(true)}
                    className="w-full h-full min-h-[280px] lg:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full min-h-[300px] bg-gradient-to-br from-slate-100 via-sky-50 to-slate-200 p-8 flex flex-col justify-center items-center text-center gap-3">
                    <FileText className="w-10 h-10 text-[#0284c7]" aria-hidden="true" />
                    <p className="text-sm font-semibold text-[#0b192c]">
                      Resume Diagnostic &amp; Location Job Map Workspace
                    </p>
                    <p className="text-xs text-slate-600 max-w-sm">
                      Structured statement diagnostics paired with live geographic job discovery.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column Capability Metrics Strip Below Hero Split */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-10 mt-10 border-t border-slate-200">
            <div>
              <div className="font-['JetBrains_Mono',monospace] tabular-nums text-2xl font-semibold text-[#0b192c]">
                3–4 Bullets
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Prominent tailored statements per profile to keep your resume concise and scannable.
              </p>
            </div>
            <div>
              <div className="font-['JetBrains_Mono',monospace] tabular-nums text-2xl font-semibold text-[#0b192c]">
                100% Intact
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Education qualifications, personal details, and academic projects are never altered.
              </p>
            </div>
            <div>
              <div className="font-['JetBrains_Mono',monospace] tabular-nums text-2xl font-semibold text-[#0b192c]">
                4+ Portals
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Live location-matched listings surfaced from LinkedIn, Naukri, Unstop, and Adzuna.
              </p>
            </div>
            <div>
              <div className="font-['JetBrains_Mono',monospace] tabular-nums text-2xl font-semibold text-[#0b192c]">
                3 Formats
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Download your updated resume directly to your device in PDF, Word (.doc), or .txt.
              </p>
            </div>
          </div>
        </section>

        {/* 2. WHAT IT PROVIDES — Asymmetric Capabilities Bento (No 3-column icon cliché) */}
        <section id="what-it-provides" className="max-w-[1280px] mx-auto px-6 py-16 border-b border-slate-200">
          <div className="max-w-2xl mb-10">
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-3xl font-bold tracking-tight text-[#0b192c] mb-3">
              What CareerAI Engine Provides
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Built to solve two concrete bottlenecks: generic resume checkers that bloat your document with robotic bullets, and disconnected job boards that ignore your local preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 01. Prominent 7-col card */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-bold text-[#0b192c] mb-2">
                  01. Real Document Parsing with Strict Education &amp; Project Lock
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Unlike automated templates that overwrite your history, CareerAI Engine parses your actual PDF or text upload line by line. Your candidate name, contact links, degrees, CGPA, school records, and software projects stay strictly preserved while only technical keywords and experience statements are refined.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-100 text-xs">
                <div>
                  <div className="font-semibold text-[#0b192c] flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4 text-[#0284c7]" aria-hidden="true" />
                    <span>Personal Details</span>
                  </div>
                  <p className="text-slate-600">Name, email, phone &amp; links untouched.</p>
                </div>
                <div>
                  <div className="font-semibold text-[#0b192c] flex items-center gap-1.5 mb-1">
                    <FileText className="w-4 h-4 text-[#0284c7]" aria-hidden="true" />
                    <span>Education Records</span>
                  </div>
                  <p className="text-slate-600">University, board, grades &amp; years locked.</p>
                </div>
                <div>
                  <div className="font-semibold text-[#0b192c] flex items-center gap-1.5 mb-1">
                    <Sliders className="w-4 h-4 text-[#0284c7]" aria-hidden="true" />
                    <span>Original Projects</span>
                  </div>
                  <p className="text-slate-600">Real project titles &amp; tech stack kept intact.</p>
                </div>
              </div>
            </div>

            {/* 02. Concise 5-col card */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-bold text-[#0b192c] mb-2">
                  02. Focused 3–4 Statement Tailoring
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Recruiters skim resumes in seconds. Instead of injecting 12 verbose statements that make your resume bulky, the Tailorer curates strictly 3 to 4 prominent, quantified statements tailored to your target profile—along with simple add/remove controls for role-specific keywords.
                </p>
              </div>
              <div className="pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium text-[#0b192c]">Single-page clarity preserved</span>
                <span className="font-['JetBrains_Mono',monospace] tabular-nums text-[#0284c7] font-semibold">
                  Max 4 bullets / profile
                </span>
              </div>
            </div>

            {/* 03. Location-aware 5-col card */}
            <div id="job-matching" className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-bold text-[#0b192c] mb-2">
                  03. Nearby &amp; Remote Live Job Matching
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Stop scrolling irrelevant listings. Based on your country and preferred city, CareerAI Engine surfaces active opportunities across LinkedIn, Naukri, Unstop, and Adzuna—ranking each job by exact skill match and showing which missing keywords will lift your odds before you apply.
                </p>
              </div>
              <div className="pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#0b192c]">
                  <MapPin className="w-4 h-4 text-[#0284c7]" aria-hidden="true" />
                  <span>Location-ranked openings</span>
                </span>
                <span>LinkedIn · Naukri · Unstop · Adzuna</span>
              </div>
            </div>

            {/* 04. Multi-format export 7-col card */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-lg font-bold text-[#0b192c] mb-2">
                  04. Direct System Downloads &amp; Saved Profile Continuity
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  New accounts are guided straight to upload their resume once and sync securely to Cloud Firestore. Returning users log in and immediately resume their saved workspace without re-uploading. Whenever you tailor for a role, export the clean resume straight to your system.
                </p>
              </div>
              <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#0b192c]">
                  <Download className="w-4 h-4 text-[#0284c7]" aria-hidden="true" />
                  <span>Direct downloads ready for applications:</span>
                </span>
                <div className="flex items-center gap-4 font-['JetBrains_Mono',monospace] text-slate-700 font-medium">
                  <span>Print-Ready .PDF</span>
                  <span aria-hidden="true">/</span>
                  <span>Microsoft Word .DOC</span>
                  <span aria-hidden="true">/</span>
                  <span>ATS Plain .TXT</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. HOW IT HELPS YOU IMPROVE YOUR RESUME & FIND JOBS — Interactive Walkthrough */}
        <section id="how-it-works" className="max-w-[1280px] mx-auto px-6 py-16 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="max-w-2xl">
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-3xl font-bold tracking-tight text-[#0b192c] mb-2">
                How It Improves Your Resume &amp; Finds Jobs
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                Inspect each step of the engine below before creating an account or uploading any document.
              </p>
            </div>

            {/* Interactive Segmented Control */}
            <div
              role="tablist"
              aria-label="Workflow Steps"
              className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start"
            >
              {(Object.keys(WORKFLOW_STEPS) as WorkflowStepId[]).map((stepKey) => {
                const isActive = activeWorkflow === stepKey;
                return (
                  <button
                    key={stepKey}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveWorkflow(stepKey)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#0b192c] shadow-xs'
                        : 'text-slate-600 hover:text-[#0b192c]'
                    }`}
                  >
                    {WORKFLOW_STEPS[stepKey].stepLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Step Detail Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-xl font-bold text-[#0b192c]">
                {currentStep.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {currentStep.summary}
              </p>
              <ul className="space-y-2.5 pt-2 text-sm text-slate-700">
                {currentStep.highlights.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0284c7] mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Side-by-Side Before & After Demonstration */}
            <div className="lg:col-span-7 space-y-4">
              <div className="text-xs font-semibold text-slate-500">
                {currentStep.previewTitle}
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-xs font-semibold text-slate-500">
                  {currentStep.beforeLabel}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {currentStep.beforeContent}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-sky-50/70 border border-sky-200 space-y-1.5">
                <div className="text-xs font-semibold text-[#0369a1]">
                  {currentStep.afterLabel}
                </div>
                <p className="text-sm font-medium text-[#0b192c] leading-relaxed">
                  {currentStep.afterContent}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. COMPARE TABLE & BENCHMARK CHART — Why CareerAI Engine Is Better */}
        <section id="comparison" className="max-w-[1280px] mx-auto px-6 py-16 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-3xl font-bold tracking-tight text-[#0b192c] mb-2">
                How CareerAI Engine Compares to Other Platforms
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Side-by-side capability benchmark and feature matrix comparing CareerAI Engine against traditional resume checkers, keyword scanners, and standalone job portals.
              </p>
            </div>

            {/* Interactive Chart Category Filter */}
            <div
              role="group"
              aria-label="Filter Benchmark Chart"
              className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start"
            >
              {[
                { id: 'all', label: 'All Criteria' },
                { id: 'resume', label: 'Resume Quality' },
                { id: 'jobs', label: 'Job Matching' },
                { id: 'control', label: 'Data & Control' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBenchmarkFilter(tab.id as BenchmarkCategory)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    benchmarkFilter === tab.id
                      ? 'bg-white text-[#0b192c] shadow-xs'
                      : 'text-slate-600 hover:text-[#0b192c]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Part A: Visual Benchmark Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-base font-bold text-[#0b192c]">
                  Capability Benchmark Chart (0–100% Rubric Coverage)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Measured across preservation accuracy, bullet conciseness, location job sync, and export freedom.
                </p>
              </div>

              {/* Clean Chart Legend */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-700">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#0b192c]">
                  <span className="w-3 h-3 rounded-xs bg-[#0284c7]" aria-hidden="true" />
                  <span>CareerAI Engine</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-slate-500" aria-hidden="true" />
                  <span>Generic Checkers</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-slate-400" aria-hidden="true" />
                  <span>Keyword Scanners</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-slate-300" aria-hidden="true" />
                  <span>Job Portals</span>
                </span>
              </div>
            </div>

            <div className="space-y-6">
              {visibleBenchmarks.map((metric) => (
                <div key={metric.id} className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <div>
                      <div className="text-sm font-semibold text-[#0b192c]">{metric.label}</div>
                      <p className="text-xs text-slate-500">{metric.description}</p>
                    </div>
                    <div className="font-['JetBrains_Mono',monospace] tabular-nums text-xs font-semibold text-[#0284c7] shrink-0">
                      CareerAI: {metric.careerAi}%
                    </div>
                  </div>

                  {/* Multi-system horizontal comparison bars */}
                  <div className="space-y-1.5">
                    {/* CareerAI Bar */}
                    <div className="flex items-center gap-3">
                      <span className="w-28 text-[11px] font-semibold text-[#0b192c] shrink-0">
                        CareerAI Engine
                      </span>
                      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0284c7] rounded-full transition-all duration-300"
                          style={{ width: `${metric.careerAi}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-['JetBrains_Mono',monospace] tabular-nums text-[11px] font-semibold text-[#0b192c]">
                        {metric.careerAi}%
                      </span>
                    </div>

                    {/* Generic Resume Checkers Bar */}
                    <div className="flex items-center gap-3">
                      <span className="w-28 text-[11px] text-slate-600 shrink-0">
                        Resume Checkers
                      </span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-500 rounded-full transition-all duration-300"
                          style={{ width: `${metric.genericCheckers}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-['JetBrains_Mono',monospace] tabular-nums text-[11px] text-slate-600">
                        {metric.genericCheckers}%
                      </span>
                    </div>

                    {/* Keyword Scanners Bar */}
                    <div className="flex items-center gap-3">
                      <span className="w-28 text-[11px] text-slate-500 shrink-0">
                        Keyword Scanners
                      </span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-400 rounded-full transition-all duration-300"
                          style={{ width: `${metric.keywordScanners}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-['JetBrains_Mono',monospace] tabular-nums text-[11px] text-slate-500">
                        {metric.keywordScanners}%
                      </span>
                    </div>

                    {/* Traditional Job Portals Bar */}
                    <div className="flex items-center gap-3">
                      <span className="w-28 text-[11px] text-slate-500 shrink-0">
                        Standard Portals
                      </span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-300 rounded-full transition-all duration-300"
                          style={{ width: `${metric.jobPortals}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-['JetBrains_Mono',monospace] tabular-nums text-[11px] text-slate-500">
                        {metric.jobPortals}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Part B: Detailed Side-by-Side Comparison Matrix Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] text-base font-bold text-[#0b192c]">
                Feature-by-Feature Platform Comparison Table
              </h3>
              <span className="text-xs text-slate-500">
                CareerAI Engine vs. ResumeWorded / Zety / Jobscan / Standard Portals
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-6 w-[32%]">Evaluation Criterion</th>
                    <th className="py-3.5 px-4 bg-sky-50/70 text-[#0369a1] font-bold w-[17%]">
                      CareerAI Engine
                    </th>
                    <th className="py-3.5 px-4 w-[17%]">Resume Checkers</th>
                    <th className="py-3.5 px-4 w-[17%]">Keyword Scanners</th>
                    <th className="py-3.5 px-4 w-[17%]">Job Portals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.criterion} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 align-top">
                        <div className="font-semibold text-[#0b192c] text-xs sm:text-sm">
                          {row.criterion}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                          {row.detail}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top bg-sky-50/40">
                        {renderStatusCell(row.careerAi, true)}
                      </td>
                      <td className="py-4 px-4 align-top">
                        {renderStatusCell(row.checkers, false)}
                      </td>
                      <td className="py-4 px-4 align-top">
                        {renderStatusCell(row.scanners, false)}
                      </td>
                      <td className="py-4 px-4 align-top">
                        {renderStatusCell(row.portals, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 5. FINAL CONVERSION SECTION — Clean transition to Sign Up or Log In */}
        <section className="max-w-[1280px] mx-auto px-6 py-16">
          <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] text-2xl sm:text-3xl font-bold tracking-tight text-[#0b192c] mb-3">
                Ready to tailor your resume and view live local matches?
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Create a free account to upload your resume for the first time, or log into your existing profile to reload your saved resume analysis right away.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={() => onGetStarted('signup')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284c7]"
              >
                <span>Sign Up &amp; Upload Resume</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onGetStarted('signin')}
                className="px-5 py-3 bg-white hover:bg-slate-50 text-[#0b192c] border border-slate-300 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Log In to Saved Profile
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1">
            <div className="font-['Plus_Jakarta_Sans',sans-serif] font-bold text-sm text-[#0b192c]">
              CareerAI Engine
            </div>
            <p>
              No personal details or resume files are collected until you choose to sign up or log in.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#what-it-provides" className="hover:text-[#0b192c] transition-colors">
              What It Provides
            </a>
            <a href="#how-it-works" className="hover:text-[#0b192c] transition-colors">
              How It Works
            </a>
            <a href="#comparison" className="hover:text-[#0b192c] transition-colors">
              Platform Comparison
            </a>
            <button
              type="button"
              onClick={() => onGetStarted('signin')}
              className="hover:text-[#0b192c] font-semibold transition-colors cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
