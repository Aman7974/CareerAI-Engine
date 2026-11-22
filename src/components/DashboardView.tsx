import React, { useState, useMemo } from 'react';
import { ResumeData, BulletPoint, PreAiResumeBaseline } from '../types';

interface DashboardViewProps {
  resume: ResumeData;
  onUpdateResume: (updated: Partial<ResumeData>) => void;
  onNavigateToAnalyzer: () => void;
  onOpenUpload: () => void;
  onOpenTailorer: () => void;
  onNavigateToJobs: () => void;
  onOpenPrintPdf: () => void;
}

type ComparisonTab = 'comparison' | 'statements' | 'keywords';

export const DashboardView: React.FC<DashboardViewProps> = ({
  resume,
  onUpdateResume,
  onNavigateToAnalyzer,
  onOpenUpload,
  onOpenTailorer,
  onNavigateToJobs,
  onOpenPrintPdf,
}) => {
  const [activePanelTab, setActivePanelTab] = useState<ComparisonTab>('comparison');
  const [showChangedOnly, setShowChangedOnly] = useState<boolean>(false);
  const [isEditingHeadline, setIsEditingHeadline] = useState<boolean>(false);
  const [headlineDraft, setHeadlineDraft] = useState<string>(resume.headline);
  const [customKeywordInput, setCustomKeywordInput] = useState<string>('');

  const baseline = resume.preAiBaseline;
  const hasTailoredChanges = Boolean(baseline);

  // Extract current bullets & baseline bullets across both Experience & Projects
  const allBullets = useMemo(() => {
    const expBullets = resume.workExperience.flatMap((exp) =>
      exp.bullets.map((b) => ({
        ...b,
        expId: exp.id,
        expTitle: exp.title,
        expCompany: exp.company,
      }))
    );
    const projBullets = (resume.projects || []).flatMap((proj, pIdx) =>
      (proj.bullets || []).map((b) => ({
        ...b,
        expId: `proj-${pIdx}`,
        expTitle: proj.title,
        expCompany: proj.tech || 'Project',
      }))
    );
    return [...expBullets, ...projBullets];
  }, [resume.workExperience, resume.projects]);

  const baselineBullets = useMemo(
    () =>
      baseline
        ? [
            ...baseline.workExperience.flatMap((exp) => exp.bullets),
            ...(baseline.projects || []).flatMap((proj) => proj.bullets || []),
          ]
        : [],
    [baseline]
  );

  const quantifiedBulletsCount = allBullets.filter((b) => b.hasQuantification || /\d+%|\$\d+|\d+\+/.test(b.text)).length;
  const flaggedBullets = allBullets.filter(
    (b) => (b.isFlagged || !b.hasQuantification) && !b.isAiModified && !b.isManuallyEdited
  );

  // Keywords diff vs baseline
  const addedSkills = useMemo(() => {
    if (!baseline) return resume.aiAddedSkills || [];
    return resume.skills.filter(
      (sk) => !baseline.skills.some((b) => b.toLowerCase() === sk.toLowerCase())
    );
  }, [baseline, resume.skills, resume.aiAddedSkills]);

  const removedSkills = useMemo(() => {
    if (!baseline) return [];
    return baseline.skills.filter(
      (b) => !resume.skills.some((sk) => sk.toLowerCase() === b.toLowerCase())
    );
  }, [baseline, resume.skills]);

  const availableSuggestedSkills = useMemo(
    () =>
      resume.suggestedSkills.filter(
        (s) => !resume.skills.some((existing) => existing.toLowerCase() === s.name.toLowerCase())
      ),
    [resume.suggestedSkills, resume.skills]
  );

  // Modified / tailored statements count
  const modifiedStatements = useMemo(
    () =>
      allBullets.filter(
        (b) =>
          b.isAiModified ||
          b.isManuallyEdited ||
          (b.originalText && b.originalText.trim() !== b.text.trim())
      ),
    [allBullets]
  );

  // Build baseline snapshot helper if user initiates an improvement directly on Dashboard
  const createBaselineSnapshot = (): PreAiResumeBaseline => {
    if (resume.preAiBaseline) return resume.preAiBaseline;
    return {
      workExperience: JSON.parse(JSON.stringify(resume.workExperience)),
      projects: JSON.parse(JSON.stringify(resume.projects || [])),
      additionalInformation: [...(resume.additionalInformation || [])],
      skills: [...resume.skills],
      headline: resume.headline,
      executiveProfile: resume.executiveProfile,
      overallScore: resume.overallScore,
      strongVerbsCount: resume.strongVerbsCount,
      passiveVoiceCount: resume.passiveVoiceCount,
      metrics: { ...resume.metrics },
    };
  };

  // Interactive: Save edited target role headline
  const handleSaveHeadline = () => {
    const clean = headlineDraft.trim();
    if (!clean) return;
    onUpdateResume({
      headline: clean.toUpperCase(),
      targetMarket: clean,
    });
    setIsEditingHeadline(false);
  };

  // Interactive: Apply single quick bullet fix directly from Dashboard
  const handleQuickFixBullet = (bullet: BulletPoint) => {
    if (!bullet.rewriteText) return;
    const snap = createBaselineSnapshot();
    const updatedExperience = resume.workExperience.map((exp) => ({
      ...exp,
      bullets: exp.bullets.map((b) =>
        b.id === bullet.id
          ? {
              ...b,
              originalText: b.originalText || b.text,
              text: bullet.rewriteText!,
              isAiModified: true,
              isManuallyEdited: false,
              isFlagged: false,
              hasStrongVerb: true,
              hasQuantification: true,
            }
          : b
      ),
    }));

    const updatedProjects = (resume.projects || []).map((proj) => ({
      ...proj,
      bullets: (proj.bullets || []).map((b) =>
        b.id === bullet.id
          ? {
              ...b,
              originalText: b.originalText || b.text,
              text: bullet.rewriteText!,
              isAiModified: true,
              isManuallyEdited: false,
              isFlagged: false,
              hasStrongVerb: true,
              hasQuantification: true,
            }
          : b
      ),
    }));

    const nextScore = Math.min(99, resume.overallScore + 5);
    onUpdateResume({
      preAiBaseline: snap,
      workExperience: updatedExperience,
      projects: updatedProjects,
      overallScore: nextScore,
      tier: nextScore >= 90 ? 'Executive Tier' : resume.tier,
      strongVerbsCount: resume.strongVerbsCount + 2,
      passiveVoiceCount: Math.max(0, resume.passiveVoiceCount - 1),
      metrics: {
        ...resume.metrics,
        impact: Math.min(99, resume.metrics.impact + 8),
        executiveTone: Math.min(98, resume.metrics.executiveTone + 6),
      },
      lastScanned: 'Just now (Improved)',
    });
  };

  // Interactive: Add skill/keyword directly from Dashboard
  const handleAddSkill = (skillName: string) => {
    const clean = skillName.trim();
    if (!clean) return;
    if (resume.skills.some((s) => s.toLowerCase() === clean.toLowerCase())) return;

    const snap = createBaselineSnapshot();
    const nextSkills = [...resume.skills, clean];
    const nextDensity = Math.min(99, resume.metrics.keywordDensity + 4);
    const nextScore = Math.min(99, resume.overallScore + 2);

    onUpdateResume({
      preAiBaseline: snap,
      skills: nextSkills,
      aiAddedSkills: [...(resume.aiAddedSkills || []), clean],
      overallScore: nextScore,
      tier: nextScore >= 90 ? 'Executive Tier' : resume.tier,
      metrics: {
        ...resume.metrics,
        keywordDensity: nextDensity,
      },
      lastScanned: 'Just now (Keywords Updated)',
    });
    setCustomKeywordInput('');
  };

  // Interactive: Remove skill/keyword directly from Dashboard
  const handleRemoveSkill = (skillToRemove: string) => {
    const nextSkills = resume.skills.filter((s) => s !== skillToRemove);
    const nextAiSkills = (resume.aiAddedSkills || []).filter((s) => s !== skillToRemove);
    onUpdateResume({
      skills: nextSkills,
      aiAddedSkills: nextAiSkills,
      metrics: {
        ...resume.metrics,
        keywordDensity: Math.max(50, resume.metrics.keywordDensity - 2),
      },
    });
  };

  // Interactive: Revert all tailoring/AI changes back to previous baseline
  const handleRevertToBaseline = () => {
    if (!baseline) return;
    onUpdateResume({
      workExperience: JSON.parse(JSON.stringify(baseline.workExperience)),
      projects: JSON.parse(JSON.stringify(baseline.projects || resume.projects || [])),
      additionalInformation: [...(baseline.additionalInformation || [])],
      skills: [...baseline.skills],
      headline: baseline.headline,
      executiveProfile: baseline.executiveProfile,
      overallScore: baseline.overallScore,
      strongVerbsCount: baseline.strongVerbsCount,
      passiveVoiceCount: baseline.passiveVoiceCount,
      metrics: { ...baseline.metrics },
      tier: baseline.overallScore >= 90 ? 'Executive Tier' : 'Professional Tier',
      aiAddedSkills: [],
      preAiBaseline: undefined,
      lastScanned: 'Restored to Previous Baseline',
    });
    setHeadlineDraft(baseline.headline);
  };

  // Compute Metric Comparisons (Before vs Current)
  const metricComparisons = useMemo(() => {
    const baseScore = baseline?.overallScore ?? resume.overallScore;
    const baseImpact = baseline?.metrics.impact ?? resume.metrics.impact;
    const baseKeywords = baseline?.metrics.keywordDensity ?? resume.metrics.keywordDensity;
    const baseTone = baseline?.metrics.executiveTone ?? resume.metrics.executiveTone;
    const baseReadability = baseline?.metrics.readability ?? resume.metrics.readability;

    return [
      {
        label: 'Overall ATS Match Score',
        before: baseScore,
        current: resume.overallScore,
        unit: '/100',
        barColor: 'bg-primary',
      },
      {
        label: 'Quantified Impact Proof',
        before: baseImpact,
        current: resume.metrics.impact,
        unit: '%',
        barColor: 'bg-emerald-500',
      },
      {
        label: 'Target Keyword Density',
        before: baseKeywords,
        current: resume.metrics.keywordDensity,
        unit: '%',
        barColor: 'bg-sky-500',
      },
      {
        label: 'Executive Tone & Verbs',
        before: baseTone,
        current: resume.metrics.executiveTone,
        unit: '%',
        barColor: 'bg-violet-500',
      },
      {
        label: 'ATS Structure & Readability',
        before: baseReadability,
        current: resume.metrics.readability,
        unit: '%',
        barColor: 'bg-amber-500',
      },
    ];
  }, [baseline, resume]);

  // Health checklist items for current resume status
  const readinessChecks = useMemo(() => {
    const hasSummary =
      resume.hasSummaryInOriginal === false
        ? true
        : Boolean(resume.executiveProfile && resume.executiveProfile.trim().length > 20);
    const allQuantified = flaggedBullets.length === 0 && allBullets.length > 0;
    const zeroPassive = resume.passiveVoiceCount === 0;
    const goodKeywords =
      availableSuggestedSkills.length === 0 ||
      resume.metrics.keywordDensity >= 90 ||
      (resume.additionalInformation?.length || 0) > 0;
    const corePreserved = Boolean(
      (resume.education && resume.education.length > 0) ||
        (resume.projects && resume.projects.length > 0)
    );

    const passedCount = [hasSummary, allQuantified, zeroPassive, goodKeywords, corePreserved].filter(Boolean).length;

    return {
      passedCount,
      total: 5,
      items: [
        {
          id: 'quantified',
          title: 'Project & Experience Bullet Impact',
          passed: allQuantified,
          detail: allQuantified
            ? `All ${allBullets.length} parsed bullets show strong action framing.`
            : `${flaggedBullets.length} bullet${flaggedBullets.length > 1 ? 's' : ''} can be strengthened cleanly in Tailorer.`,
          actionLabel: allQuantified ? 'Review' : 'Optimize Bullets',
          onAction: onOpenTailorer,
        },
        {
          id: 'passive',
          title: 'Active Voice & Strong Verbs',
          passed: zeroPassive,
          detail: zeroPassive
            ? `${resume.strongVerbsCount} strong action verbs active • 0 passive phrases.`
            : `${resume.passiveVoiceCount} passive phrase${resume.passiveVoiceCount > 1 ? 's' : ''} detected (${resume.strongVerbsCount} strong verbs).`,
          actionLabel: zeroPassive ? 'Verified' : 'Upgrade Tone',
          onAction: onOpenTailorer,
        },
        {
          id: 'keywords',
          title: 'Target Role Keyword & Overflow Alignment',
          passed: goodKeywords,
          detail: `${resume.skills.length} skills • ${resume.additionalInformation?.length || 0} Additional Info alignment notes.`,
          actionLabel: availableSuggestedSkills.length > 0 ? '+ Manage' : 'Manage',
          onAction: () => setActivePanelTab('keywords'),
        },
        {
          id: 'summary',
          title: 'Original Summary Rule Integrity',
          passed: hasSummary,
          detail:
            resume.hasSummaryInOriginal === false
              ? 'No Summary in original input — preserved without fabrication.'
              : `Original Summary preserved intact for "${resume.headline}".`,
          actionLabel: 'Edit Role',
          onAction: () => {
            setHeadlineDraft(resume.headline);
            setIsEditingHeadline(true);
          },
        },
        {
          id: 'preserved',
          title: 'Education, Projects & Metadata Integrity',
          passed: corePreserved,
          detail: `${resume.education?.length || 0} Education • ${resume.projects?.length || 0} Projects preserved intact.`,
          actionLabel: 'Preview PDF',
          onAction: onOpenPrintPdf,
        },
      ],
    };
  }, [
    resume,
    flaggedBullets.length,
    allBullets.length,
    availableSuggestedSkills.length,
    onNavigateToAnalyzer,
    onOpenTailorer,
    onOpenPrintPdf,
  ]);

  const scoreDelta = baseline ? resume.overallScore - baseline.overallScore : 0;
  const impactDelta = baseline ? resume.metrics.impact - baseline.metrics.impact : 0;
  const keywordDelta = baseline ? resume.metrics.keywordDensity - baseline.metrics.keywordDensity : 0;
  const toneDelta = baseline ? resume.metrics.executiveTone - baseline.metrics.executiveTone : 0;

  const displayedStatements = showChangedOnly
    ? allBullets.filter(
        (b) => b.isAiModified || b.isManuallyEdited || (b.originalText && b.originalText !== b.text)
      )
    : allBullets;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-margin-lg py-4 lg:py-space-lg flex flex-col gap-space-lg animate-in fade-in duration-300">
      {/* Top Status & Quick Action Banner */}
      <div className="bg-surface-container-lowest dark:bg-[#1a2238] rounded-xl border border-outline-variant/60 dark:border-white/10 p-space-lg shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold font-['Plus_Jakarta_Sans'] text-on-surface dark:text-white">
              Resume Command Center — {resume.candidateName.split(' ')[0]}
            </h1>
            {hasTailoredChanges ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>
                  Tailored & Improved ({scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts vs Previous)
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                <span className="material-symbols-outlined text-[14px]">description</span>
                <span>Baseline Profile • Ready to Tailor</span>
              </span>
            )}
          </div>

          {/* Interactive Target Role / Headline Inline Editor */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-on-surface-variant dark:text-slate-400">
            <span>Active File: <code className="font-mono text-primary dark:text-sky-300 font-semibold">{resume.fileName}</code></span>
            <span>•</span>
            <span>Status: <strong className="text-on-surface dark:text-slate-200">{resume.lastScanned}</strong></span>
            <span>•</span>
            {isEditingHeadline ? (
              <div className="inline-flex items-center gap-1.5">
                <input
                  type="text"
                  value={headlineDraft}
                  onChange={(e) => setHeadlineDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveHeadline();
                    if (e.key === 'Escape') setIsEditingHeadline(false);
                  }}
                  className="px-2 py-0.5 rounded border border-primary bg-surface-container-low dark:bg-[#0d111d] text-on-surface dark:text-white text-xs font-semibold focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveHeadline}
                  className="px-2 py-0.5 rounded bg-primary text-white text-[11px] font-bold cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingHeadline(false)}
                  className="px-1.5 py-0.5 text-[11px] text-outline hover:text-on-surface dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span>Target Role:</span>
                <strong className="text-on-surface dark:text-white">{resume.headline}</strong>
                <button
                  onClick={() => {
                    setHeadlineDraft(resume.headline);
                    setIsEditingHeadline(true);
                  }}
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary dark:text-sky-400 hover:underline cursor-pointer"
                  title="Edit target role directly"
                >
                  <span className="material-symbols-outlined text-[13px]">edit</span>
                  <span>Edit</span>
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onOpenUpload}
            className="px-3 py-2 rounded-lg bg-surface-container-lowest dark:bg-white/5 hover:bg-surface-container border border-outline-variant dark:border-white/10 text-on-surface dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">upload_file</span>
            <span>Upload Resume</span>
          </button>
          <button
            onClick={onOpenPrintPdf}
            className="px-3 py-2 rounded-lg bg-surface-container-lowest dark:bg-white/5 hover:bg-surface-container border border-outline-variant dark:border-white/10 text-on-surface dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
            <span>Export PDF</span>
          </button>
          <button
            onClick={onNavigateToAnalyzer}
            className="px-3.5 py-2 rounded-lg bg-surface-container-high dark:bg-white/10 hover:bg-surface-container-highest text-on-surface dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">analytics</span>
            <span>Resume Analyzer</span>
          </button>
          <button
            onClick={onOpenTailorer}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">tune</span>
            <span>{hasTailoredChanges ? 'Refine Tailoring' : 'Tailor Resume'}</span>
          </button>
        </div>
      </div>

      {/* 4 Live Status Cards (Reflects Before vs After Improvements) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest dark:bg-[#1a2238] p-4 rounded-xl border border-outline-variant/60 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-on-surface-variant dark:text-slate-400 font-medium">Current ATS Score</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-extrabold text-on-surface dark:text-white font-['Plus_Jakarta_Sans']">
                {resume.overallScore}/100
              </span>
              {baseline && scoreDelta !== 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts
                </span>
              )}
            </div>
            <div className="text-[11px] text-secondary dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              <span>
                {baseline
                  ? `Up from ${baseline.overallScore}/100 • ${resume.tier}`
                  : resume.tier}
              </span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-secondary-fixed/40 dark:bg-emerald-950 flex items-center justify-center text-secondary dark:text-emerald-400">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest dark:bg-[#1a2238] p-4 rounded-xl border border-outline-variant/60 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-on-surface-variant dark:text-slate-400 font-medium">Quantified Proof</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-extrabold text-on-surface dark:text-white font-['Plus_Jakarta_Sans']">
                {resume.metrics.impact}%
              </span>
              {baseline && impactDelta !== 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {impactDelta > 0 ? `+${impactDelta}%` : `${impactDelta}%`}
                </span>
              )}
            </div>
            <div className="text-[11px] text-on-surface-variant dark:text-slate-400 font-semibold mt-1">
              {quantifiedBulletsCount}/{allBullets.length} bullets quantified
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary-fixed/40 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-[#818cf8]">
            <span className="material-symbols-outlined text-[24px]">trending_up</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest dark:bg-[#1a2238] p-4 rounded-xl border border-outline-variant/60 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-on-surface-variant dark:text-slate-400 font-medium">Keyword Coverage</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-extrabold text-on-surface dark:text-white font-['Plus_Jakarta_Sans']">
                {resume.metrics.keywordDensity}%
              </span>
              {baseline && keywordDelta !== 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {keywordDelta > 0 ? `+${keywordDelta}%` : `${keywordDelta}%`}
                </span>
              )}
            </div>
            <div className="text-[11px] text-primary dark:text-[#818cf8] font-semibold mt-1">
              {resume.skills.length} Active{addedSkills.length > 0 ? ` (+${addedSkills.length} added)` : ''}
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-surface-container dark:bg-white/5 flex items-center justify-center text-on-surface dark:text-white">
            <span className="material-symbols-outlined text-[24px]">key</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest dark:bg-[#1a2238] p-4 rounded-xl border border-outline-variant/60 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-on-surface-variant dark:text-slate-400 font-medium">Action Verbs & Tone</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-extrabold text-on-surface dark:text-white font-['Plus_Jakarta_Sans']">
                {resume.metrics.executiveTone}%
              </span>
              {baseline && toneDelta !== 0 && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {toneDelta > 0 ? `+${toneDelta}%` : `${toneDelta}%`}
                </span>
              )}
            </div>
            <div className="text-[11px] text-on-surface-variant dark:text-slate-400 font-medium mt-1">
              {resume.strongVerbsCount} Strong Verbs • {resume.passiveVoiceCount} Passive
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-tertiary-fixed/40 dark:bg-amber-950 flex items-center justify-center text-tertiary dark:text-amber-400">
            <span className="material-symbols-outlined text-[24px]">psychology</span>
          </div>
        </div>
      </div>

      {/* Main Dual Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* LEFT (7 Cols): Tailoring Impact Comparison, Statement Diffs & Interactive Keywords */}
        <div className="lg:col-span-7 bg-surface-container-lowest dark:bg-[#1a2238] rounded-xl border border-outline-variant/60 dark:border-white/10 p-space-lg shadow-xs flex flex-col gap-4">
          {/* Interactive Tab Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-outline-variant/40 dark:border-white/10">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActivePanelTab('comparison')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePanelTab === 'comparison'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-low dark:bg-white/5 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">compare_arrows</span>
                <span>Before vs. After Tailoring</span>
              </button>

              <button
                onClick={() => setActivePanelTab('statements')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePanelTab === 'statements'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-low dark:bg-white/5 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">fact_check</span>
                <span>Statement Changes ({modifiedStatements.length})</span>
              </button>

              <button
                onClick={() => setActivePanelTab('keywords')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activePanelTab === 'keywords'
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-low dark:bg-white/5 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">label</span>
                <span>Interactive Keywords ({resume.skills.length})</span>
              </button>
            </div>

            {hasTailoredChanges && (
              <button
                onClick={handleRevertToBaseline}
                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                title="Undo all tailoring and AI changes back to your previous baseline"
              >
                <span className="material-symbols-outlined text-[14px]">undo</span>
                <span>Revert to Previous</span>
              </button>
            )}
          </div>

          {/* TAB 1: BEFORE VS AFTER TAILORING PROOF */}
          {activePanelTab === 'comparison' && (
            <div className="space-y-4">
              {hasTailoredChanges && baseline ? (
                <>
                  {/* Hero Proof Summary */}
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                        <span>Tailored Resume Outperforms Previous Version</span>
                      </div>
                      <p className="text-xs text-on-surface-variant dark:text-slate-300">
                        Previous Score: <strong>{baseline.overallScore}/100</strong> → Current Tailored Score:{' '}
                        <strong className="text-emerald-700 dark:text-emerald-300">{resume.overallScore}/100</strong>
                        {scoreDelta > 0 && ` (+${scoreDelta} points gained)`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-[#0d111d] text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        {modifiedStatements.length} Statements Upgraded
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-[#0d111d] text-[11px] font-bold text-sky-700 dark:text-sky-300 border border-sky-500/20">
                        +{addedSkills.length} Keywords Added
                      </span>
                    </div>
                  </div>

                  {/* Role / Headline Diff if changed */}
                  {baseline.headline !== resume.headline && (
                    <div className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-outline dark:text-slate-400 block">
                          Target Role Repositioned
                        </span>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="line-through text-on-surface-variant dark:text-slate-400">
                            {baseline.headline}
                          </span>
                          <span className="material-symbols-outlined text-[14px] text-emerald-500">arrow_forward</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            {resume.headline}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 self-start sm:self-center">
                        Aligned
                      </span>
                    </div>
                  )}

                  {/* Metric-by-Metric Visual Comparison Bars */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant dark:text-slate-400 font-semibold">
                      <span>Metric-by-Metric Improvement</span>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-600 inline-block" />
                          Previous
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                          After Tailoring
                        </span>
                      </div>
                    </div>

                    {metricComparisons.map((m) => {
                      const delta = m.current - m.before;
                      return (
                        <div
                          key={m.label}
                          className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-on-surface dark:text-white">{m.label}</span>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-on-surface-variant dark:text-slate-400 text-[11px]">
                                {m.before}{m.unit}
                              </span>
                              <span className="material-symbols-outlined text-[13px] text-emerald-500">
                                arrow_forward
                              </span>
                              <span className="font-bold text-on-surface dark:text-white">
                                {m.current}{m.unit}
                              </span>
                              {delta > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                  +{delta}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dual Visual Progress Track */}
                          <div className="space-y-1">
                            <div className="w-full h-1.5 rounded-full bg-surface-container dark:bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-slate-400/70 dark:bg-slate-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, m.before)}%` }}
                              />
                            </div>
                            <div className="w-full h-2 rounded-full bg-surface-container dark:bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${m.barColor} transition-all duration-500`}
                                style={{ width: `${Math.min(100, m.current)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Additional Quantifiable Improvements Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="p-2.5 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 text-xs">
                      <div className="text-[10px] text-on-surface-variant dark:text-slate-400">Strong Verbs</div>
                      <div className="font-bold text-on-surface dark:text-white mt-0.5">
                        {baseline.strongVerbsCount} →{' '}
                        <span className="text-emerald-600 dark:text-emerald-400">{resume.strongVerbsCount}</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 text-xs">
                      <div className="text-[10px] text-on-surface-variant dark:text-slate-400">Passive Phrasing</div>
                      <div className="font-bold text-on-surface dark:text-white mt-0.5">
                        {baseline.passiveVoiceCount} →{' '}
                        <span className="text-emerald-600 dark:text-emerald-400">{resume.passiveVoiceCount}</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 text-xs col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-on-surface-variant dark:text-slate-400">Original Bullets Snapshot</div>
                      <div className="font-bold text-on-surface dark:text-white mt-0.5">
                        {baselineBullets.length} Saved Safely
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* NO TAILORING YET: Interactive Baseline Preview + 1-Click Quick Fix Boosters */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                        <span>Current Baseline vs. Projected Tailored Potential</span>
                      </div>
                      <p className="text-xs text-on-surface-variant dark:text-slate-300 mt-1">
                        Your resume currently scores <strong>{resume.overallScore}/100</strong>. Tailoring or fixing
                        flagged statements below can elevate your ATS score to{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">96–99/100</strong>.
                      </p>
                    </div>
                    <button
                      onClick={onOpenTailorer}
                      className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold shrink-0 cursor-pointer transition-colors"
                    >
                      Launch Tailor Studio →
                    </button>
                  </div>

                  {/* Interactive 1-Click Bullet Upgrades directly on Dashboard */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-on-surface dark:text-white uppercase tracking-wider">
                        1-Click Quick Resume Improvements ({flaggedBullets.filter((b) => b.rewriteText).length} Ready)
                      </h3>
                      <button
                        onClick={onNavigateToAnalyzer}
                        className="text-[11px] font-semibold text-primary dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        Open Full Editor →
                      </button>
                    </div>

                    {flaggedBullets.filter((b) => b.rewriteText).length > 0 ? (
                      flaggedBullets
                        .filter((b) => b.rewriteText)
                        .slice(0, 3)
                        .map((b) => (
                          <div
                            key={b.id}
                            className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/50 dark:border-white/10 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                {b.expTitle} • Weak / Unquantified
                              </span>
                              <button
                                onClick={() => handleQuickFixBullet(b)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <span className="material-symbols-outlined text-[14px]">bolt</span>
                                <span>Apply Upgrade (+5 pts)</span>
                              </button>
                            </div>
                            <div className="text-[11px] text-on-surface-variant dark:text-slate-400 line-through">
                              {b.text}
                            </div>
                            <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/20">
                              → {b.rewriteText}
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="p-4 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 text-xs text-on-surface-variant dark:text-slate-300 flex items-center justify-between gap-3">
                        <span>
                          Your bullets look solid! Open <strong>Tailor Studio</strong> to customize 3–4 prominent
                          statements & keywords for a specific job role and unlock a Before vs. After comparison.
                        </span>
                        <button
                          onClick={onOpenTailorer}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shrink-0 cursor-pointer"
                        >
                          Tailor Now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STATEMENT CHANGES / DIFF LOG */}
          {activePanelTab === 'statements' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-on-surface-variant dark:text-slate-400">
                  Compare previous phrasing against your tailored & manually edited statements.
                </p>
                <div className="inline-flex rounded-lg border border-outline-variant/50 dark:border-white/10 p-0.5 bg-surface-container-low dark:bg-[#131b2e]">
                  <button
                    onClick={() => setShowChangedOnly(false)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition ${
                      !showChangedOnly
                        ? 'bg-primary text-white'
                        : 'text-on-surface-variant dark:text-slate-400'
                    }`}
                  >
                    All ({allBullets.length})
                  </button>
                  <button
                    onClick={() => setShowChangedOnly(true)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition ${
                      showChangedOnly
                        ? 'bg-primary text-white'
                        : 'text-on-surface-variant dark:text-slate-400'
                    }`}
                  >
                    Changed ({modifiedStatements.length})
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {displayedStatements.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-outline-variant dark:border-white/15 text-center space-y-2">
                    <p className="text-xs text-on-surface-variant dark:text-slate-400">
                      No statements have been tailored or edited yet.
                    </p>
                    <button
                      onClick={onOpenTailorer}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold cursor-pointer"
                    >
                      Tailor Statements in Tailor Studio
                    </button>
                  </div>
                ) : (
                  displayedStatements.map((b, idx) => {
                    const hasDiff = b.originalText && b.originalText.trim() !== b.text.trim();
                    return (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container dark:bg-white/10 text-on-surface dark:text-slate-200">
                              #{idx + 1} • {b.expTitle}
                            </span>
                            {b.isAiModified && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                Improved by Tailoring
                              </span>
                            )}
                            {b.isManuallyEdited && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300">
                                Manually Edited
                              </span>
                            )}
                            {!b.isAiModified && !b.isManuallyEdited && b.isFlagged && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                Needs Metric
                              </span>
                            )}
                          </div>
                          {b.isFlagged && b.rewriteText && !b.isAiModified && (
                            <button
                              onClick={() => handleQuickFixBullet(b)}
                              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              + Apply AI Upgrade
                            </button>
                          )}
                        </div>

                        {hasDiff && (
                          <div className="text-[11px] text-on-surface-variant dark:text-slate-400 pl-2.5 border-l-2 border-rose-400/60">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 block">
                              Previous Version:
                            </span>
                            <span className="line-through">{b.originalText}</span>
                          </div>
                        )}

                        <div
                          className={`text-xs leading-relaxed ${
                            hasDiff
                              ? 'text-emerald-800 dark:text-emerald-200 font-medium pl-2.5 border-l-2 border-emerald-500'
                              : 'text-on-surface dark:text-slate-200'
                          }`}
                        >
                          {hasDiff && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                              Current Improved Version:
                            </span>
                          )}
                          {b.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE KEYWORDS & SKILLS MANAGER */}
          {activePanelTab === 'keywords' && (
            <div className="space-y-4">
              {/* Quick Add Custom Skill */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customKeywordInput}
                  onChange={(e) => setCustomKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(customKeywordInput);
                    }
                  }}
                  placeholder="Add a technical skill or keyword (e.g., GraphQL, AWS, TypeScript)..."
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white placeholder-outline focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => handleAddSkill(customKeywordInput)}
                  disabled={!customKeywordInput.trim()}
                  className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-container disabled:opacity-40 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  + Add Keyword
                </button>
              </div>

              {/* Newly Added After Tailoring */}
              {(addedSkills.length > 0 || removedSkills.length > 0) && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    Keyword Diff Since Previous Version:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {addedSkills.map((sk) => (
                      <span
                        key={`added-${sk}`}
                        className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold border border-emerald-500/30"
                      >
                        + {sk}
                      </span>
                    ))}
                    {removedSkills.map((sk) => (
                      <span
                        key={`removed-${sk}`}
                        className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[11px] font-semibold line-through border border-rose-500/30"
                      >
                        - {sk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Missing Keywords (1-Click Add) */}
              {availableSuggestedSkills.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-on-surface dark:text-white">
                    Recommended Missing Keywords (Click to Add to Resume):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableSuggestedSkills.map((s) => (
                      <button
                        key={s.name}
                        onClick={() => handleAddSkill(s.name)}
                        className="p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-left transition cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-bold text-sky-800 dark:text-sky-200">+ {s.name}</div>
                          <div className="text-[10px] text-on-surface-variant dark:text-slate-400">{s.frequency}</div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-600 text-white shrink-0">
                          Add
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Skills Tags (Removable) */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-on-surface dark:text-white">
                  Active Resume Skills ({resume.skills.length})
                </div>
                <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 max-h-48 overflow-y-auto">
                  {resume.skills.map((skill) => {
                    const isNew = addedSkills.some((a) => a.toLowerCase() === skill.toLowerCase());
                    return (
                      <span
                        key={skill}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          isNew
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 font-semibold'
                            : 'bg-surface-container-lowest dark:bg-white/5 border-outline-variant/50 dark:border-white/10 text-on-surface dark:text-slate-200'
                        }`}
                      >
                        <span>{skill}</span>
                        <button
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-outline hover:text-rose-500 ml-0.5 cursor-pointer"
                          title={`Remove ${skill}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">close</span>
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT (5 Cols): Current Resume Health Checklist & Interactive Next Steps */}
        <div className="lg:col-span-5 bg-surface-container-lowest dark:bg-[#1a2238] rounded-xl border border-outline-variant/60 dark:border-white/10 p-space-lg shadow-xs flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-on-surface dark:text-white font-['Plus_Jakarta_Sans']">
                  Current Resume Status & Health
                </h2>
                <p className="text-xs text-on-surface-variant dark:text-slate-400">
                  Parse Hash: <span className="font-mono text-primary font-bold">{resume.parseHash}</span>
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary dark:text-sky-300 text-xs font-extrabold">
                {readinessChecks.passedCount}/{readinessChecks.total} Ready
              </span>
            </div>

            {/* Readiness Progress Bar */}
            <div className="w-full h-2 rounded-full bg-surface-container dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(readinessChecks.passedCount / readinessChecks.total) * 100}%` }}
              />
            </div>

            {/* Interactive Checklist Rows */}
            <div className="space-y-2.5">
              {readinessChecks.items.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${
                        item.passed ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      {item.passed ? 'check_circle' : 'pending'}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-on-surface dark:text-white">{item.title}</div>
                      <div className="text-[11px] text-on-surface-variant dark:text-slate-400 leading-snug">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={item.onAction}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer transition-colors ${
                      item.passed
                        ? 'bg-surface-container dark:bg-white/5 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high'
                        : 'bg-primary text-white hover:bg-primary-container'
                    }`}
                  >
                    {item.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Quick Actions Grid */}
          <div className="pt-3 border-t border-outline-variant/40 dark:border-white/10 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-slate-400">
              Quick Workspace Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenTailorer}
                className="p-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary dark:text-sky-300">
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                  <span>Tailor Studio</span>
                </div>
                <div className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                  Customize 3–4 key bullets
                </div>
              </button>

              <button
                onClick={onNavigateToAnalyzer}
                className="p-2.5 rounded-xl bg-surface-container-low dark:bg-white/5 hover:bg-surface-container border border-outline-variant/40 dark:border-white/10 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface dark:text-white">
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>Resume Analyzer</span>
                </div>
                <div className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                  Audit & edit statements
                </div>
              </button>

              <button
                onClick={onNavigateToJobs}
                className="p-2.5 rounded-xl bg-surface-container-low dark:bg-white/5 hover:bg-surface-container border border-outline-variant/40 dark:border-white/10 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface dark:text-white">
                  <span className="material-symbols-outlined text-[16px]">work</span>
                  <span>Job Matches</span>
                </div>
                <div className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                  Explore tailored roles
                </div>
              </button>

              <button
                onClick={onOpenPrintPdf}
                className="p-2.5 rounded-xl bg-surface-container-low dark:bg-white/5 hover:bg-surface-container border border-outline-variant/40 dark:border-white/10 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface dark:text-white">
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Export ATS PDF</span>
                </div>
                <div className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                  Print or save current version
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
