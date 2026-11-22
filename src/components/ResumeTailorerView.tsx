/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ResumeData,
  JobMatch,
  BulletPoint,
  WorkExperience,
  PreAiResumeBaseline,
  ProjectItem,
} from '../types';
import { calculateJobMatchesForResume } from '../utils/jobMatching';
import {
  downloadResumeAsPdf,
  downloadResumeAsDoc,
  downloadResumeAsTxt,
} from '../utils/resumeExporter';
import {
  buildStrictAtsOptimizationPlan,
  generateCompleteStrictOptimizedResumeText,
} from '../utils/tailoringEngine';

interface ResumeTailorerViewProps {
  resume: ResumeData;
  initialJob?: JobMatch;
  onApplyTailored: (updated: Partial<ResumeData>) => void;
  onNavigateToAnalyzer: () => void;
}

type ToolbarTab = 'ai-suggestions' | 'manual-elements' | 'changes-log';

const STRONG_VERBS = [
  'architected',
  'engineered',
  'spearheaded',
  'optimized',
  'built',
  'developed',
  'designed',
  'implemented',
  'accelerated',
  'reduced',
  'streamlined',
  'delivered',
  'launched',
  'led',
  'automated',
  'scaled',
  'utilized',
  'integrated',
];

function recalculateResumeMetrics(
  next: ResumeData,
  baseline?: PreAiResumeBaseline
): Partial<ResumeData> {
  const expBullets = next.workExperience.flatMap((e) => e.bullets);
  const projBullets = (next.projects || []).flatMap((p) => p.bullets || []);
  const bullets = [...expBullets, ...projBullets];

  const quantifiedCount = bullets.filter((b) => /\d+%|\$\d+|\d+\+|ms|x\b/i.test(b.text)).length;
  const strongVerbMatches = bullets.filter((b) =>
    STRONG_VERBS.some((v) => b.text.toLowerCase().includes(v))
  ).length;
  const passiveCount = bullets.filter((b) =>
    /(responsible for|assisted with|worked on|helped with)/i.test(b.text)
  ).length;

  const totalBullets = Math.max(1, bullets.length);
  const modifiedProjectCount = projBullets.filter(
    (b) => b.isAiModified || b.isManuallyEdited || (b.originalText && b.originalText !== b.text)
  ).length;
  const additionalInfoBonus = Math.min(12, (next.additionalInformation?.length || 0) * 4);

  const impactScore = Math.min(
    99,
    Math.max(70, Math.round(70 + (quantifiedCount / totalBullets) * 20 + modifiedProjectCount * 2))
  );
  const keywordScore = Math.min(
    99,
    Math.max(72, Math.round(68 + next.skills.length * 2 + additionalInfoBonus))
  );
  const toneScore = Math.min(
    98,
    Math.max(72, Math.round(74 + (strongVerbMatches / totalBullets) * 24 - passiveCount * 6))
  );
  const readabilityScore = Math.max(92, next.metrics.readability || 95);
  const overall = Math.min(
    99,
    Math.round((impactScore + keywordScore + toneScore + readabilityScore) / 4)
  );

  return {
    strongVerbsCount: Math.max(strongVerbMatches * 2, baseline?.strongVerbsCount || 8),
    passiveVoiceCount: passiveCount,
    overallScore: overall,
    tier: overall >= 90 ? 'Executive Tier' : 'Professional Tier',
    metrics: {
      impact: impactScore,
      keywordDensity: keywordScore,
      readability: readabilityScore,
      executiveTone: toneScore,
    },
    lastScanned: 'Just now (Strict ATS Tailorer)',
  };
}

export const ResumeTailorerView: React.FC<ResumeTailorerViewProps> = ({
  resume,
  initialJob,
  onApplyTailored,
  onNavigateToAnalyzer,
}) => {
  const dynamicJobs = useMemo(() => calculateJobMatchesForResume(resume), [resume]);

  // Target job & Job Description power right-side Suggestions only (never auto-edit the resume)
  const [selectedJob, setSelectedJob] = useState<JobMatch | undefined>(initialJob);
  const [customTargetRole, setCustomTargetRole] = useState<string>(initialJob?.title || resume.headline || '');
  const [jobDescriptionText, setJobDescriptionText] = useState<string>(initialJob?.description || '');
  const [toolbarTab, setToolbarTab] = useState<ToolbarTab>('ai-suggestions');
  const [canvasZoom, setCanvasZoom] = useState<90 | 100>(100);
  const [showChangeIndicators, setShowChangeIndicators] = useState<boolean>(true);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);
  const [copiedCompleteText, setCopiedCompleteText] = useState<boolean>(false);
  const [showCompleteOutputModal, setShowCompleteOutputModal] = useState<boolean>(false);

  // Inline Editing States on Left Resume Canvas
  const [editingHeaderField, setEditingHeaderField] = useState<'name' | 'contact' | 'headline' | null>(null);
  const [headerFieldDraft, setHeaderFieldDraft] = useState<string>('');

  const [editingWorkBullet, setEditingWorkBullet] = useState<{ expId: string; bulletId: string } | null>(null);
  const [workBulletDraft, setWorkBulletDraft] = useState<string>('');

  const [editingProjectBullet, setEditingProjectBullet] = useState<{
    projectIdx: number;
    bulletId: string;
  } | null>(null);
  const [projectBulletDraft, setProjectBulletDraft] = useState<string>('');

  const [editingAdditionalIdx, setEditingAdditionalIdx] = useState<number | null>(null);
  const [additionalDraft, setAdditionalDraft] = useState<string>('');
  const [newAdditionalInline, setNewAdditionalInline] = useState<string>('');
  const [isAddingAdditionalInline, setIsAddingAdditionalInline] = useState<boolean>(false);

  const [inlineSkillInput, setInlineSkillInput] = useState<string>('');
  const [isAddingSkillInline, setIsAddingSkillInline] = useState<boolean>(false);

  // Right Toolbar: Editable AI Project Bullet & Overflow Suggestion states
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [suggestionDraft, setSuggestionDraft] = useState<string>('');
  const [editingOverflowIdx, setEditingOverflowIdx] = useState<number | null>(null);
  const [overflowDraft, setOverflowDraft] = useState<string>('');

  // Right Toolbar: Manual Element creation drafts
  const [toolbarSkillDraft, setToolbarSkillDraft] = useState<string>('');
  const [toolbarAdditionalDraft, setToolbarAdditionalDraft] = useState<string>('');
  const [newExpDraft, setNewExpDraft] = useState<{
    title: string;
    company: string;
    period: string;
    bullet: string;
  }>({ title: '', company: '', period: '', bullet: '' });
  const [newProjectDraft, setNewProjectDraft] = useState<{
    title: string;
    date: string;
    link: string;
    tech: string;
    description: string;
    bullet: string;
  }>({ title: '', date: '', link: '', tech: '', description: '', bullet: '' });
  const [newEduDraft, setNewEduDraft] = useState<string>('');
  const [newCertDraft, setNewCertDraft] = useState<string>('');

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setDismissedSuggestionIds([]);
  }, [selectedJob?.id, customTargetRole, jobDescriptionText]);

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Capture pre-change baseline once so all changes remain tracked, inspectable, and completely removable
  const ensureBaseline = (): PreAiResumeBaseline => {
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

  const commitChanges = (partial: Partial<ResumeData>, message?: string) => {
    const isFullReset = partial.preAiBaseline === undefined && 'preAiBaseline' in partial;
    const baselineSnap = isFullReset ? undefined : ensureBaseline();

    const merged: ResumeData = {
      ...resume,
      ...partial,
      ...(isFullReset ? { preAiBaseline: undefined } : { preAiBaseline: baselineSnap }),
    };

    const recalculated = isFullReset ? {} : recalculateResumeMetrics(merged, baselineSnap);

    onApplyTailored({
      ...partial,
      ...recalculated,
      ...(isFullReset ? { preAiBaseline: undefined } : { preAiBaseline: baselineSnap }),
    });

    if (message) showNotice(message);
  };

  // STRICT IMMUTABILITY ATS OPTIMIZATION PLAN (Suggest-Only — Never auto-applied!)
  const activeTargetRole = customTargetRole.trim() || selectedJob?.title || resume.headline;

  const optimizationPlan = useMemo(
    () => buildStrictAtsOptimizationPlan(resume, activeTargetRole, jobDescriptionText, selectedJob),
    [resume, activeTargetRole, jobDescriptionText, selectedJob]
  );

  const visibleProjectSuggestions = useMemo(
    () =>
      optimizationPlan.projectBulletSuggestions.filter(
        (s) => !dismissedSuggestionIds.includes(s.id)
      ),
    [optimizationPlan.projectBulletSuggestions, dismissedSuggestionIds]
  );

  const pendingOverflowEntries = useMemo(() => {
    const currentAddl = resume.additionalInformation || [];
    return optimizationPlan.additionalInfoOverflow.overflowEntries.filter(
      (entry) => !currentAddl.some((existing) => existing.trim().toLowerCase() === entry.trim().toLowerCase())
    );
  }, [optimizationPlan.additionalInfoOverflow.overflowEntries, resume.additionalInformation]);

  // Complete plain-text rule-compliant resume output (zero conversational filler)
  const completeResumeOutputText = useMemo(
    () => generateCompleteStrictOptimizedResumeText(resume),
    [resume]
  );

  // Diff vs baseline for Changes Log & indicators
  const baseline = resume.preAiBaseline;

  const addedSkillsDiff = useMemo(() => {
    if (!baseline) return resume.aiAddedSkills || [];
    return resume.skills.filter(
      (sk) => !baseline.skills.some((b) => b.toLowerCase() === sk.toLowerCase())
    );
  }, [baseline, resume.skills, resume.aiAddedSkills]);

  const modifiedProjectBulletsList = useMemo(
    () =>
      (resume.projects || []).flatMap((proj, projectIdx) =>
        (proj.bullets || [])
          .filter(
            (b) =>
              b.isAiModified ||
              b.isManuallyEdited ||
              (b.originalText && b.originalText.trim() !== b.text.trim())
          )
          .map((b) => ({ ...b, projectIdx, projectTitle: proj.title }))
      ),
    [resume.projects]
  );

  const modifiedWorkBulletsList = useMemo(
    () =>
      resume.workExperience.flatMap((exp) =>
        exp.bullets
          .filter(
            (b) =>
              b.isAiModified ||
              b.isManuallyEdited ||
              (b.originalText && b.originalText.trim() !== b.text.trim())
          )
          .map((b) => ({ ...b, expId: exp.id, expTitle: exp.title }))
      ),
    [resume.workExperience]
  );

  const addedAdditionalInfoDiff = useMemo(() => {
    const current = resume.additionalInformation || [];
    const baseItems = baseline?.additionalInformation || [];
    return current.filter(
      (item) => !baseItems.some((b) => b.trim().toLowerCase() === item.trim().toLowerCase())
    );
  }, [baseline, resume.additionalInformation]);

  // --- PROJECT BULLET HANDLERS (Rules 2 & 4: Metadata untouched, ONLY bullet points updated) ---

  const handleApplyProjectBulletSuggestion = (
    projectIdx: number,
    bulletId: string,
    newText: string,
    isCustomEdited: boolean
  ) => {
    const clean = newText.trim();
    if (!clean || !resume.projects) return;

    const updatedProjects: ProjectItem[] = resume.projects.map((proj, idx) =>
      idx === projectIdx
        ? {
            ...proj,
            bullets: (proj.bullets || []).map((b) =>
              b.id === bulletId
                ? {
                    ...b,
                    originalText: b.originalText || b.text,
                    text: clean,
                    isAiModified: !isCustomEdited,
                    isManuallyEdited: isCustomEdited,
                    hasStrongVerb: STRONG_VERBS.some((v) => clean.toLowerCase().includes(v)),
                    hasQuantification: /\d+%|\$\d+|\d+\+|ms|x\b/i.test(clean),
                  }
                : b
            ),
          }
        : proj
    );

    commitChanges(
      { projects: updatedProjects },
      isCustomEdited
        ? 'Applied your customized project bullet point (project metadata untouched).'
        : 'Applied faithful ATS optimization to project bullet point.'
    );
    setEditingSuggestionId(null);
  };

  const handleApplyAllProjectBulletSuggestions = () => {
    if (visibleProjectSuggestions.length === 0 || !resume.projects) return;
    const sugMap = new Map<string, string>();
    visibleProjectSuggestions.forEach((s) => {
      sugMap.set(`${s.projectIndex}:${s.bulletId}`, s.suggestedText);
    });

    const updatedProjects: ProjectItem[] = resume.projects.map((proj, idx) => ({
      ...proj,
      bullets: (proj.bullets || []).map((b) => {
        const nextText = sugMap.get(`${idx}:${b.id}`);
        if (!nextText || nextText.trim() === b.text.trim()) return b;
        return {
          ...b,
          originalText: b.originalText || b.text,
          text: nextText.trim(),
          isAiModified: true,
          isManuallyEdited: false,
          hasStrongVerb: true,
        };
      }),
    }));

    commitChanges(
      { projects: updatedProjects },
      `Applied ${visibleProjectSuggestions.length} project bullet optimizations (all project metadata preserved).`
    );
  };

  const handleSaveManualProjectBullet = (projectIdx: number, bulletId: string) => {
    const clean = projectBulletDraft.trim();
    if (!clean || !resume.projects) return;

    const updatedProjects: ProjectItem[] = resume.projects.map((proj, idx) =>
      idx === projectIdx
        ? {
            ...proj,
            bullets: (proj.bullets || []).map((b) =>
              b.id === bulletId
                ? {
                    ...b,
                    originalText: b.originalText || b.text,
                    text: clean,
                    isManuallyEdited: true,
                    isAiModified: false,
                    hasStrongVerb: STRONG_VERBS.some((v) => clean.toLowerCase().includes(v)),
                    hasQuantification: /\d+%|\$\d+|\d+\+|ms|x\b/i.test(clean),
                  }
                : b
            ),
          }
        : proj
    );

    commitChanges({ projects: updatedProjects }, 'Updated project bullet manually.');
    setEditingProjectBullet(null);
  };

  const handleRevertProjectBullet = (projectIdx: number, bulletId: string) => {
    if (!resume.projects) return;
    const updatedProjects: ProjectItem[] = resume.projects.map((proj, idx) =>
      idx === projectIdx
        ? {
            ...proj,
            bullets: (proj.bullets || []).map((b) =>
              b.id === bulletId && b.originalText
                ? {
                    ...b,
                    text: b.originalText,
                    isAiModified: false,
                    isManuallyEdited: false,
                  }
                : b
            ),
          }
        : proj
    );

    commitChanges({ projects: updatedProjects }, 'Reverted project bullet to original wording.');
    setEditingProjectBullet(null);
  };

  // --- ADDITIONAL INFORMATION OVERFLOW HANDLERS (Rule 5: Append without deleting existing) ---

  const handleAppendAdditionalInfo = (entryText: string) => {
    const clean = entryText.trim();
    if (!clean) return;
    const current = resume.additionalInformation || [];
    if (current.some((c) => c.trim().toLowerCase() === clean.toLowerCase())) {
      showNotice('That note is already in Additional Information.');
      return;
    }
    commitChanges(
      { additionalInformation: [...current, clean] },
      'Appended JD alignment note to Additional Information at bottom of resume.'
    );
    setEditingOverflowIdx(null);
    setToolbarAdditionalDraft('');
    setNewAdditionalInline('');
    setIsAddingAdditionalInline(false);
  };

  const handleSaveAdditionalEdit = (idx: number) => {
    const clean = additionalDraft.trim();
    if (!clean || !resume.additionalInformation) return;
    const next = resume.additionalInformation.map((item, i) => (i === idx ? clean : item));
    commitChanges({ additionalInformation: next }, 'Updated Additional Information entry.');
    setEditingAdditionalIdx(null);
  };

  const handleRemoveAdditionalEntry = (idx: number) => {
    const next = (resume.additionalInformation || []).filter((_, i) => i !== idx);
    commitChanges({ additionalInformation: next }, 'Removed Additional Information entry.');
  };

  // --- HEADER & MANUAL WORK EXPERIENCE / SKILLS / EDUCATION HANDLERS ---

  const handleSaveHeaderField = () => {
    const val = headerFieldDraft.trim();
    if (!val || !editingHeaderField) return;
    if (editingHeaderField === 'name') {
      commitChanges({ candidateName: val.toUpperCase() }, 'Updated candidate name manually.');
    } else if (editingHeaderField === 'contact') {
      commitChanges({ contactInfo: val }, 'Updated contact information manually.');
    } else if (editingHeaderField === 'headline') {
      commitChanges({ headline: val.toUpperCase(), targetMarket: val }, 'Updated target role headline.');
    }
    setEditingHeaderField(null);
  };

  const handleSaveWorkBulletEdit = (expId: string, bulletId: string) => {
    const clean = workBulletDraft.trim();
    if (!clean) return;
    const updatedExp = resume.workExperience.map((exp) =>
      exp.id === expId
        ? {
            ...exp,
            bullets: exp.bullets.map((b) =>
              b.id === bulletId
                ? {
                    ...b,
                    originalText: b.originalText || b.text,
                    text: clean,
                    isManuallyEdited: true,
                    isAiModified: false,
                  }
                : b
            ),
          }
        : exp
    );
    commitChanges({ workExperience: updatedExp }, 'Experience bullet edited manually.');
    setEditingWorkBullet(null);
  };

  const handleRevertWorkBullet = (expId: string, bulletId: string) => {
    const updatedExp = resume.workExperience.map((exp) =>
      exp.id === expId
        ? {
            ...exp,
            bullets: exp.bullets.map((b) =>
              b.id === bulletId && b.originalText
                ? { ...b, text: b.originalText, isAiModified: false, isManuallyEdited: false }
                : b
            ),
          }
        : exp
    );
    commitChanges({ workExperience: updatedExp }, 'Reverted experience bullet to original.');
    setEditingWorkBullet(null);
  };

  const handleAddSkill = (skill: string) => {
    const clean = skill.trim();
    if (!clean) return;
    if (resume.skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      showNotice(`"${clean}" is already on your resume.`);
      return;
    }
    commitChanges({ skills: [...resume.skills, clean] }, `Added skill "${clean}" manually.`);
    setInlineSkillInput('');
    setToolbarSkillDraft('');
    setIsAddingSkillInline(false);
  };

  const handleRemoveSkill = (skill: string) => {
    commitChanges(
      {
        skills: resume.skills.filter((s) => s !== skill),
        aiAddedSkills: (resume.aiAddedSkills || []).filter((s) => s !== skill),
      },
      `Removed skill "${skill}" from resume.`
    );
  };

  const handleAddExperienceBlock = () => {
    if (!newExpDraft.title.trim()) return;
    const newExp: WorkExperience = {
      id: `exp-manual-${Date.now()}`,
      title: newExpDraft.title.trim(),
      company: newExpDraft.company.trim() || 'Company',
      period: newExpDraft.period.trim() || 'Present',
      bullets: newExpDraft.bullet.trim()
        ? [
            {
              id: `b-manual-${Date.now()}`,
              text: newExpDraft.bullet.trim(),
              isManuallyEdited: true,
              hasStrongVerb: STRONG_VERBS.some((v) => newExpDraft.bullet.toLowerCase().includes(v)),
              hasQuantification: /\d+%|\$\d+|\d+\+|ms|x\b/i.test(newExpDraft.bullet),
            },
          ]
        : [],
    };
    commitChanges(
      { workExperience: [...resume.workExperience, newExp] },
      'Added new experience block manually.'
    );
    setNewExpDraft({ title: '', company: '', period: '', bullet: '' });
  };

  const handleAddManualProject = () => {
    if (!newProjectDraft.title.trim()) return;
    const nextProject: ProjectItem = {
      id: `proj-manual-${Date.now()}`,
      title: newProjectDraft.title.trim(),
      date: newProjectDraft.date.trim() || undefined,
      link: newProjectDraft.link.trim() || undefined,
      tech: newProjectDraft.tech.trim() || undefined,
      description: newProjectDraft.description.trim(),
      bullets: newProjectDraft.bullet.trim()
        ? [
            {
              id: `pb-manual-${Date.now()}`,
              text: newProjectDraft.bullet.trim(),
              isManuallyEdited: true,
            },
          ]
        : [],
    };
    commitChanges(
      { projects: [...(resume.projects || []), nextProject] },
      'Added new project manually.'
    );
    setNewProjectDraft({ title: '', date: '', link: '', tech: '', description: '', bullet: '' });
  };

  const handleAddManualEducation = () => {
    if (!newEduDraft.trim()) return;
    commitChanges(
      { education: [...(resume.education || []), newEduDraft.trim()] },
      'Added education entry manually.'
    );
    setNewEduDraft('');
  };

  const handleAddManualCert = () => {
    if (!newCertDraft.trim()) return;
    commitChanges(
      { certifications: [...(resume.certifications || []), newCertDraft.trim()] },
      'Added certification manually.'
    );
    setNewCertDraft('');
  };

  // Completely revert all ATS & tailoring changes back to pre-change baseline
  const handleRevertAllChanges = () => {
    if (baseline) {
      onApplyTailored({
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
        lastScanned: 'Restored to Original Baseline',
      });
      showNotice('All tailoring changes reverted. Original resume structure and bullets restored.');
    } else {
      const cleanedExp = resume.workExperience.map((exp) => ({
        ...exp,
        bullets: exp.bullets.map((b) =>
          b.originalText
            ? { ...b, text: b.originalText, isAiModified: false, isManuallyEdited: false }
            : { ...b, isAiModified: false }
        ),
      }));
      const cleanedProjects = (resume.projects || []).map((proj) => ({
        ...proj,
        bullets: (proj.bullets || []).map((b) =>
          b.originalText
            ? { ...b, text: b.originalText, isAiModified: false, isManuallyEdited: false }
            : { ...b, isAiModified: false }
        ),
      }));
      const aiSkills = resume.aiAddedSkills || [];
      commitChanges(
        {
          workExperience: cleanedExp,
          projects: cleanedProjects,
          skills: resume.skills.filter((s) => !aiSkills.includes(s)),
          aiAddedSkills: [],
          preAiBaseline: undefined,
        },
        'Removed tailoring modifications from resume.'
      );
    }
    setDismissedSuggestionIds([]);
  };

  const handleCopyCompleteOutput = async () => {
    try {
      await navigator.clipboard.writeText(completeResumeOutputText);
      setCopiedCompleteText(true);
      showNotice('Copied complete rule-compliant resume text to clipboard.');
      setTimeout(() => setCopiedCompleteText(false), 2500);
    } catch {
      setShowCompleteOutputModal(true);
    }
  };

  const totalChangesCount =
    modifiedProjectBulletsList.length +
    modifiedWorkBulletsList.length +
    addedSkillsDiff.length +
    addedAdditionalInfoDiff.length;

  const hasAnyEdits = Boolean(baseline) || totalChangesCount > 0;

  return (
    <div className="max-w-[1620px] mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-3">
          <span className="material-symbols-outlined text-[17px]">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Complete Plain-Text Resume Modal */}
      {showCompleteOutputModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-[#1a2238] w-full max-w-3xl rounded-2xl border border-outline-variant dark:border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-outline-variant/50 dark:border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-on-surface dark:text-white">
                  Complete Rule-Compliant Resume Output
                </h2>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                  Only project bullet points &amp; Additional Information updated — zero commentary or structural changes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCompleteOutput}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">content_copy</span>
                  <span>{copiedCompleteText ? 'Copied!' : 'Copy All'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCompleteOutputModal(false)}
                  className="p-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-white/10 text-on-surface-variant dark:text-slate-300 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>
            <pre className="p-5 text-xs font-mono text-on-surface dark:text-slate-200 whitespace-pre-wrap overflow-y-auto leading-relaxed bg-surface-container-low dark:bg-[#0d111d]">
              {completeResumeOutputText}
            </pre>
          </div>
        </div>
      )}

      {/* Canva-Style Top Studio Header Bar */}
      <div className="bg-surface-container-lowest dark:bg-[#1a2238] rounded-2xl border border-outline-variant/60 dark:border-white/10 px-5 py-3.5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary dark:text-sky-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">design_services</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold font-['Plus_Jakarta_Sans'] text-on-surface dark:text-white">
                ATS Optimization Studio
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                Strict Immutability Active • Project Bullets &amp; Additional Info Only
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                ATS Score: {resume.overallScore}/100
              </span>
            </div>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">
              Preserves entire structure, Summary, Education, Experience &amp; Project metadata. Optimizes ONLY Project bullet points faithfully and routes overflow JD terms to Additional Information.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low dark:bg-white/5 border border-outline-variant/40 dark:border-white/10 text-xs font-semibold text-on-surface dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={showChangeIndicators}
              onChange={(e) => setShowChangeIndicators(e.target.checked)}
              className="accent-primary rounded cursor-pointer"
            />
            <span>Highlight Edits</span>
          </label>

          <div className="inline-flex rounded-xl border border-outline-variant/40 dark:border-white/10 bg-surface-container-low dark:bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => setCanvasZoom(90)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                canvasZoom === 90
                  ? 'bg-primary text-white'
                  : 'text-on-surface-variant dark:text-slate-300'
              }`}
            >
              90%
            </button>
            <button
              type="button"
              onClick={() => setCanvasZoom(100)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                canvasZoom === 100
                  ? 'bg-primary text-white'
                  : 'text-on-surface-variant dark:text-slate-300'
              }`}
            >
              100%
            </button>
          </div>

          {hasAnyEdits && (
            <button
              type="button"
              onClick={handleRevertAllChanges}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
            >
              <span className="material-symbols-outlined text-[15px]">undo</span>
              <span>Revert All Changes</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCompleteOutputModal(true)}
            className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
          >
            <span className="material-symbols-outlined text-[15px]">article</span>
            <span>Complete Output</span>
          </button>

          <button
            type="button"
            onClick={() => {
              downloadResumeAsPdf(resume);
              showNotice('Opening print dialog to save your optimized resume as PDF.');
            }}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              downloadResumeAsDoc(resume);
              showNotice('Downloading optimized resume as .DOC file.');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-surface-container-high dark:bg-white/10 hover:bg-surface-container-highest text-on-surface dark:text-white text-xs font-semibold cursor-pointer transition"
          >
            .DOC
          </button>

          <button
            type="button"
            onClick={() => {
              downloadResumeAsTxt(resume);
              showNotice('Downloading complete rule-compliant resume as .TXT file.');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-surface-container-high dark:bg-white/10 hover:bg-surface-container-highest text-on-surface dark:text-white text-xs font-semibold cursor-pointer transition"
          >
            .TXT
          </button>

          <button
            type="button"
            onClick={onNavigateToAnalyzer}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition"
          >
            <span className="material-symbols-outlined text-[15px]">analytics</span>
            <span>Analyzer</span>
          </button>
        </div>
      </div>

      {/* CANVA-STYLE SPLIT WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT SECTION: LIVE INTERACTIVE RESUME PAGE (STRICT STRUCTURE PRESERVED) */}
        <div className="lg:col-span-7 bg-slate-200/75 dark:bg-[#0b1020] rounded-2xl border border-outline-variant/60 dark:border-white/10 p-4 sm:p-6 shadow-inner">
          <div className="flex items-center justify-between mb-3 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-primary">description</span>
              <span>Live Resume Sheet — {resume.fileName} (Exact Original Structure Preserved)</span>
            </span>
            <span className="font-mono">{resume.parseHash}</span>
          </div>

          <div
            className={`bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300/80 mx-auto transition-transform origin-top ${
              canvasZoom === 90 ? 'scale-[0.94]' : 'scale-100'
            } p-6 sm:p-9 space-y-5`}
          >
            {/* 1. CANDIDATE HEADER BLOCK */}
            <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1.5">
              {editingHeaderField === 'name' ? (
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="text"
                    value={headerFieldDraft}
                    onChange={(e) => setHeaderFieldDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveHeaderField();
                      if (e.key === 'Escape') setEditingHeaderField(null);
                    }}
                    className="px-2.5 py-1 text-center text-xl font-extrabold uppercase border border-sky-500 rounded bg-sky-50 text-slate-900 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveHeaderField}
                    className="px-2.5 py-1 bg-sky-600 text-white text-xs font-bold rounded cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingHeaderField(null)}
                    className="text-xs text-slate-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="group relative inline-flex items-center gap-2">
                  <h2
                    onClick={() => {
                      setEditingHeaderField('name');
                      setHeaderFieldDraft(resume.candidateName);
                    }}
                    className="text-2xl font-extrabold uppercase tracking-tight text-slate-950 cursor-pointer hover:bg-sky-50 px-2 py-0.5 rounded transition"
                    title="Click to edit candidate name manually"
                  >
                    {resume.candidateName}
                  </h2>
                </div>
              )}

              <div>
                {editingHeaderField === 'contact' ? (
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="text"
                      value={headerFieldDraft}
                      onChange={(e) => setHeaderFieldDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveHeaderField();
                        if (e.key === 'Escape') setEditingHeaderField(null);
                      }}
                      className="w-full max-w-md px-2.5 py-1 text-center text-xs border border-sky-500 rounded bg-sky-50 text-slate-800 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveHeaderField}
                      className="px-2.5 py-1 bg-sky-600 text-white text-xs font-bold rounded cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <p
                    onClick={() => {
                      setEditingHeaderField('contact');
                      setHeaderFieldDraft(resume.contactInfo);
                    }}
                    className="text-xs text-slate-600 font-medium cursor-pointer hover:bg-sky-50 inline-block px-2 py-0.5 rounded transition"
                    title="Click to edit contact details manually"
                  >
                    {resume.contactInfo}
                  </p>
                )}
              </div>

              {resume.headline && (
                <div>
                  {editingHeaderField === 'headline' ? (
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="text"
                        value={headerFieldDraft}
                        onChange={(e) => setHeaderFieldDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveHeaderField();
                          if (e.key === 'Escape') setEditingHeaderField(null);
                        }}
                        className="w-full max-w-md px-2.5 py-1 text-center text-xs font-bold uppercase border border-sky-500 rounded bg-sky-50 text-sky-900 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveHeaderField}
                        className="px-2.5 py-1 bg-sky-600 text-white text-xs font-bold rounded cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setEditingHeaderField('headline');
                        setHeaderFieldDraft(resume.headline);
                      }}
                      className="text-xs font-bold uppercase tracking-wider text-sky-700 cursor-pointer hover:bg-sky-50 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded transition"
                      title="Click to edit target role headline manually"
                    >
                      <span>{resume.headline}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. SUMMARY (Rule 3: Rendered ONLY if already present in original input; AI never modifies or adds it) */}
            {resume.executiveProfile && resume.executiveProfile.trim().length > 0 && (
              <div className="space-y-1.5 p-2 -mx-2 rounded-lg bg-slate-50/70 border border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Summary
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <span className="material-symbols-outlined text-[13px]">lock</span>
                    <span>Immutable Original Summary (Rule 3)</span>
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{resume.executiveProfile}</p>
              </div>
            )}

            {/* 3. EXPERIENCE (Rendered if present; structure & entries preserved intact) */}
            {resume.workExperience && resume.workExperience.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Experience
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
                    <span className="material-symbols-outlined text-[13px]">lock</span>
                    <span>Structure &amp; Dates Preserved (Rule 1)</span>
                  </span>
                </div>

                {resume.workExperience.map((exp) => (
                  <div key={exp.id} className="space-y-2 pb-2 border-b border-slate-100 last:border-b-0">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-950">{exp.title}</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-xs font-semibold text-slate-700">{exp.company}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-500">{exp.period}</span>
                    </div>

                    <ul className="space-y-1.5 pl-4 list-disc">
                      {exp.bullets.map((b) => {
                        const isEditingThis =
                          editingWorkBullet?.expId === exp.id && editingWorkBullet?.bulletId === b.id;
                        const canRevert =
                          Boolean(b.originalText) && b.originalText!.trim() !== b.text.trim();

                        return (
                          <li
                            key={b.id}
                            className={`group rounded-lg px-2 py-1 -mx-2 transition ${
                              showChangeIndicators && b.isManuallyEdited
                                ? 'bg-sky-50/80 border border-sky-200'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {isEditingThis ? (
                              <div className="space-y-1.5 py-1">
                                <textarea
                                  rows={2}
                                  value={workBulletDraft}
                                  onChange={(e) => setWorkBulletDraft(e.target.value)}
                                  className="w-full p-2 text-xs text-slate-900 border border-sky-500 rounded-lg bg-white focus:outline-none"
                                  autoFocus
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveWorkBulletEdit(exp.id, b.id)}
                                    className="px-2.5 py-1 bg-sky-600 text-white text-[11px] font-bold rounded cursor-pointer"
                                  >
                                    Save Manual Edit
                                  </button>
                                  {canRevert && (
                                    <button
                                      type="button"
                                      onClick={() => handleRevertWorkBullet(exp.id, b.id)}
                                      className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-semibold rounded cursor-pointer"
                                    >
                                      Use Original
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setEditingWorkBullet(null)}
                                    className="text-[11px] text-slate-500 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <div
                                  onClick={() => {
                                    setEditingWorkBullet({ expId: exp.id, bulletId: b.id });
                                    setWorkBulletDraft(b.text);
                                  }}
                                  className="text-xs text-slate-800 leading-relaxed cursor-pointer flex-1"
                                  title="Click to edit manually"
                                >
                                  <span>{b.text}</span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingWorkBullet({ expId: exp.id, bulletId: b.id });
                                      setWorkBulletDraft(b.text);
                                    }}
                                    className="p-1 rounded hover:bg-sky-100 text-sky-700 cursor-pointer"
                                    title="Edit statement manually"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">edit</span>
                                  </button>
                                  {canRevert && (
                                    <button
                                      type="button"
                                      onClick={() => handleRevertWorkBullet(exp.id, b.id)}
                                      className="p-1 rounded hover:bg-amber-100 text-amber-700 cursor-pointer"
                                      title="Revert to original"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">undo</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* 4. PROJECTS (Rules 2 & 4: Metadata Untouched • ONLY Project Bullet Points Editable/Optimized) */}
            {resume.projects && resume.projects.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1 flex-wrap gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Projects
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <span className="material-symbols-outlined text-[13px]">verified_user</span>
                    <span>Metadata Protected • Edit Project Bullets Only (Rules 2 &amp; 4)</span>
                  </span>
                </div>

                <div className="space-y-4">
                  {resume.projects.map((proj, pIdx) => (
                    <div
                      key={`${proj.title}-${pIdx}`}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2"
                    >
                      {/* Protected Project Metadata Row */}
                      <div className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-950">{proj.title}</span>
                            {proj.link && (
                              <span className="text-[11px] font-mono text-sky-700 underline decoration-sky-300">
                                {proj.link}
                              </span>
                            )}
                          </div>
                          {proj.date && (
                            <span className="text-xs font-mono text-slate-500">{proj.date}</span>
                          )}
                        </div>
                        {proj.tech && (
                          <div className="text-[11px] font-mono text-sky-800 bg-sky-50 inline-block px-2 py-0.5 rounded border border-sky-200">
                            Tech Stack: {proj.tech}
                          </div>
                        )}
                        {proj.description && proj.description.trim() && (
                          <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
                            {proj.description}
                          </p>
                        )}
                      </div>

                      {/* Project Bullet Points (ONLY bullets eligible for ATS optimization) */}
                      {proj.bullets && proj.bullets.length > 0 ? (
                        <ul className="space-y-1.5 pl-4 list-disc">
                          {proj.bullets.map((b) => {
                            const isEditingThis =
                              editingProjectBullet?.projectIdx === pIdx &&
                              editingProjectBullet?.bulletId === b.id;
                            const canRevert =
                              Boolean(b.originalText) && b.originalText!.trim() !== b.text.trim();

                            return (
                              <li
                                key={b.id}
                                className={`group rounded-lg px-2 py-1 -mx-2 transition ${
                                  showChangeIndicators && b.isAiModified
                                    ? 'bg-emerald-50/90 border border-emerald-300'
                                    : showChangeIndicators && b.isManuallyEdited
                                    ? 'bg-sky-50/90 border border-sky-300'
                                    : 'hover:bg-white'
                                }`}
                              >
                                {isEditingThis ? (
                                  <div className="space-y-1.5 py-1">
                                    <textarea
                                      rows={2}
                                      value={projectBulletDraft}
                                      onChange={(e) => setProjectBulletDraft(e.target.value)}
                                      className="w-full p-2 text-xs text-slate-900 border border-sky-500 rounded-lg bg-white focus:outline-none leading-relaxed"
                                      autoFocus
                                    />
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveManualProjectBullet(pIdx, b.id)}
                                        className="px-2.5 py-1 bg-sky-600 text-white text-[11px] font-bold rounded cursor-pointer"
                                      >
                                        Save Bullet
                                      </button>
                                      {canRevert && (
                                        <button
                                          type="button"
                                          onClick={() => handleRevertProjectBullet(pIdx, b.id)}
                                          className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-semibold rounded cursor-pointer"
                                        >
                                          Use Original
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setEditingProjectBullet(null)}
                                        className="px-2 py-1 text-[11px] text-slate-500 cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between gap-2">
                                    <div
                                      onClick={() => {
                                        setEditingProjectBullet({ projectIdx: pIdx, bulletId: b.id });
                                        setProjectBulletDraft(b.text);
                                      }}
                                      className="text-xs text-slate-800 leading-relaxed cursor-pointer flex-1"
                                      title="Click to edit this project bullet point manually"
                                    >
                                      <span>{b.text}</span>
                                      {showChangeIndicators && b.isAiModified && (
                                        <span className="ml-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 align-middle">
                                          ATS Optimized
                                        </span>
                                      )}
                                      {showChangeIndicators && b.isManuallyEdited && (
                                        <span className="ml-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 align-middle">
                                          Manual Edit
                                        </span>
                                      )}
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingProjectBullet({ projectIdx: pIdx, bulletId: b.id });
                                          setProjectBulletDraft(b.text);
                                        }}
                                        className="p-1 rounded hover:bg-sky-100 text-sky-700 cursor-pointer"
                                        title="Edit project bullet manually"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                      </button>
                                      {canRevert && (
                                        <button
                                          type="button"
                                          onClick={() => handleRevertProjectBullet(pIdx, b.id)}
                                          className="p-1 rounded hover:bg-amber-100 text-amber-700 cursor-pointer"
                                          title="Revert to original bullet wording"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">undo</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="text-[11px] italic text-slate-400">
                          No bullet points parsed for this project.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. TECHNICAL SKILLS (Original Skills Preserved) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Skills ({resume.skills.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingSkillInline((prev) => !prev)}
                  className="text-[11px] font-bold text-sky-600 hover:underline cursor-pointer"
                >
                  + Add Manual Skill
                </button>
              </div>

              {isAddingSkillInline && (
                <div className="flex items-center gap-2 pb-1">
                  <input
                    type="text"
                    value={inlineSkillInput}
                    onChange={(e) => setInlineSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill(inlineSkillInput);
                      }
                      if (e.key === 'Escape') setIsAddingSkillInline(false);
                    }}
                    placeholder="Type skill & press Enter..."
                    className="flex-1 px-2.5 py-1 text-xs border border-sky-500 rounded-lg bg-white text-slate-900 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill(inlineSkillInput)}
                    className="px-3 py-1 bg-sky-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {resume.skills.map((skill) => {
                  const isAddedAfter =
                    showChangeIndicators &&
                    addedSkillsDiff.some((a) => a.toLowerCase() === skill.toLowerCase());
                  return (
                    <span
                      key={skill}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                        isAddedAfter
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                          : 'bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                        title={`Remove ${skill}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* 6. EDUCATION & ACADEMIC QUALIFICATIONS (Preserved Intact) */}
            {resume.education && resume.education.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                  Education
                </h3>
                <ul className="space-y-1">
                  {resume.education.map((edu, idx) => (
                    <li key={`${edu}-${idx}`} className="text-xs text-slate-800 flex items-start gap-1.5">
                      <span className="font-bold text-slate-500">•</span>
                      <span>{edu}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 7. CERTIFICATIONS (Preserved Intact) */}
            {resume.certifications && resume.certifications.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                  Certifications
                </h3>
                <ul className="space-y-1">
                  {resume.certifications.map((cert, idx) => (
                    <li key={`${cert}-${idx}`} className="text-xs text-slate-800">
                      • {cert}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 8. ADDITIONAL INFORMATION AT THE VERY BOTTOM (Rule 5: Overflow Goes Here) */}
            <div className="space-y-2 pt-2 border-t-2 border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Additional Information
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                    JD Overflow &amp; Preserved Entries (Rule 5)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingAdditionalInline((v) => !v)}
                    className="text-[11px] font-bold text-sky-600 hover:underline cursor-pointer"
                  >
                    + Append Entry
                  </button>
                </div>
              </div>

              {isAddingAdditionalInline && (
                <div className="flex items-center gap-2 pb-1">
                  <input
                    type="text"
                    value={newAdditionalInline}
                    onChange={(e) => setNewAdditionalInline(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAppendAdditionalInfo(newAdditionalInline);
                      }
                      if (e.key === 'Escape') setIsAddingAdditionalInline(false);
                    }}
                    placeholder="Append alignment note, methodology, or language..."
                    className="flex-1 px-2.5 py-1 text-xs border border-sky-500 rounded-lg bg-white text-slate-900 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleAppendAdditionalInfo(newAdditionalInline)}
                    className="px-3 py-1 bg-sky-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Append
                  </button>
                </div>
              )}

              {resume.additionalInformation && resume.additionalInformation.length > 0 ? (
                <ul className="space-y-1.5 pl-4 list-disc">
                  {resume.additionalInformation.map((item, idx) => {
                    const isAppendedOverflow =
                      showChangeIndicators &&
                      addedAdditionalInfoDiff.some(
                        (a) => a.trim().toLowerCase() === item.trim().toLowerCase()
                      );
                    const isEditingThis = editingAdditionalIdx === idx;

                    return (
                      <li
                        key={`${idx}-${item.slice(0, 18)}`}
                        className={`group rounded-lg px-2 py-1 -mx-2 transition ${
                          isAppendedOverflow
                            ? 'bg-violet-50/90 border border-violet-200'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {isEditingThis ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={additionalDraft}
                              onChange={(e) => setAdditionalDraft(e.target.value)}
                              className="flex-1 px-2 py-1 text-xs border border-sky-500 rounded bg-white text-slate-900"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveAdditionalEdit(idx)}
                              className="px-2.5 py-1 bg-sky-600 text-white text-[11px] font-bold rounded cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAdditionalIdx(null)}
                              className="text-[11px] text-slate-500 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-xs text-slate-800 leading-relaxed flex-1">
                              <span>{item}</span>
                              {isAppendedOverflow && (
                                <span className="ml-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 align-middle">
                                  Overflow Added
                                </span>
                              )}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAdditionalIdx(idx);
                                  setAdditionalDraft(item);
                                }}
                                className="p-1 rounded hover:bg-sky-100 text-sky-700 cursor-pointer"
                                title="Edit entry manually"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAdditionalEntry(idx)}
                                className="p-1 rounded hover:bg-rose-100 text-rose-600 cursor-pointer"
                                title="Remove entry"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-[11px] italic text-slate-400">
                  No entries yet. Overflow JD keywords/notes from the right toolbar append here automatically when approved without altering prior sections.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SECTION: STRICT ATS OPTIMIZATION ENGINE TOOLBAR */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 bg-surface-container-lowest dark:bg-[#1a2238] rounded-2xl border border-outline-variant/60 dark:border-white/10 shadow-xs overflow-hidden flex flex-col">
          {/* Toolbar Tab Switcher */}
          <div className="grid grid-cols-3 border-b border-outline-variant/40 dark:border-white/10 bg-surface-container-low dark:bg-[#131b2e]">
            <button
              type="button"
              onClick={() => setToolbarTab('ai-suggestions')}
              className={`py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                toolbarTab === 'ai-suggestions'
                  ? 'border-primary text-primary dark:text-sky-300 bg-surface-container-lowest dark:bg-[#1a2238]'
                  : 'border-transparent text-on-surface-variant dark:text-slate-400 hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              <span>ATS Optimizer</span>
            </button>

            <button
              type="button"
              onClick={() => setToolbarTab('manual-elements')}
              className={`py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                toolbarTab === 'manual-elements'
                  ? 'border-primary text-primary dark:text-sky-300 bg-surface-container-lowest dark:bg-[#1a2238]'
                  : 'border-transparent text-on-surface-variant dark:text-slate-400 hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">add_box</span>
              <span>Manual Tools</span>
            </button>

            <button
              type="button"
              onClick={() => setToolbarTab('changes-log')}
              className={`py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                toolbarTab === 'changes-log'
                  ? 'border-primary text-primary dark:text-sky-300 bg-surface-container-lowest dark:bg-[#1a2238]'
                  : 'border-transparent text-on-surface-variant dark:text-slate-400 hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">history</span>
              <span>Changes ({totalChangesCount})</span>
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
            {/* TOOLBAR TAB 1: STRICT IMMUTABILITY ATS OPTIMIZATION ENGINE */}
            {toolbarTab === 'ai-suggestions' && (
              <div className="space-y-4">
                {/* Target Role & Job Description */}
                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-slate-400">
                    Target Job Description (Drives Project Bullet &amp; Overflow Suggestions)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dynamicJobs.slice(0, 4).map((job) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => {
                          setSelectedJob(job);
                          setCustomTargetRole(job.title);
                          setJobDescriptionText(job.description || '');
                        }}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                          selectedJob?.id === job.id
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface-container-lowest dark:bg-white/5 text-on-surface dark:text-slate-300 border-outline-variant/50 dark:border-white/10 hover:bg-surface-container'
                        }`}
                      >
                        {job.company} • {job.title.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={customTargetRole}
                    onChange={(e) => {
                      setSelectedJob(undefined);
                      setCustomTargetRole(e.target.value);
                    }}
                    placeholder="Target Role (e.g., Full Stack Developer)..."
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary"
                  />
                  <textarea
                    rows={3}
                    value={jobDescriptionText}
                    onChange={(e) => setJobDescriptionText(e.target.value)}
                    placeholder="Paste the Job Description here to match ATS keywords strictly inside Project bullets & Additional Information..."
                    className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary leading-relaxed"
                  />
                </div>

                {/* Strict Immutability Rules Enforcement Banner */}
                <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/25 space-y-1.5">
                  <div className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">shield</span>
                    <span>Strict Immutability Rules Active</span>
                  </div>
                  <ul className="text-[11px] text-on-surface-variant dark:text-slate-300 space-y-0.5 pl-4 list-disc">
                    <li>Structure, headings, dates, Education, Experience &amp; Project metadata locked.</li>
                    <li>No Summary/Objective added or altered ({resume.executiveProfile ? 'existing Summary preserved' : 'omitted'}).</li>
                    <li>ONLY faithful rephrasing of existing Project bullet points (exact count &amp; zero invented metrics).</li>
                    <li>Unintegrated JD overflow terms go ONLY to Additional Information at the end.</li>
                  </ul>
                </div>

                {/* 1. PROJECT BULLET POINT OPTIMIZATIONS */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-on-surface dark:text-white flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-emerald-500">build</span>
                      <span>Project Bullet Optimizations ({visibleProjectSuggestions.length})</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      {dismissedSuggestionIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setDismissedSuggestionIds([])}
                          className="text-[11px] text-primary hover:underline cursor-pointer"
                        >
                          Show dismissed
                        </button>
                      )}
                      {visibleProjectSuggestions.length > 1 && (
                        <button
                          type="button"
                          onClick={handleApplyAllProjectBulletSuggestions}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Apply All Bullets
                        </button>
                      )}
                    </div>
                  </div>

                  {visibleProjectSuggestions.length === 0 ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-300">
                      ✓ All project bullet points are either optimized or already faithfully aligned with the target JD! You can click any project bullet on the left sheet to edit it manually.
                    </div>
                  ) : (
                    visibleProjectSuggestions.map((s) => {
                      const isEditingThis = editingSuggestionId === s.id;
                      return (
                        <div
                          key={s.id}
                          className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/50 dark:border-white/10 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary dark:text-sky-300">
                              Project Bullet • {s.projectTitle}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDismissedSuggestionIds((prev) => [...prev, s.id])}
                              className="text-[11px] text-outline hover:text-rose-500 cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>

                          <div className="text-[11px] text-on-surface-variant dark:text-slate-400 line-through pl-2 border-l-2 border-slate-400/50">
                            {s.currentText}
                          </div>

                          {isEditingThis ? (
                            <div className="space-y-2">
                              <textarea
                                rows={3}
                                value={suggestionDraft}
                                onChange={(e) => setSuggestionDraft(e.target.value)}
                                className="w-full p-2 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-primary text-xs text-on-surface dark:text-white focus:outline-none"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleApplyProjectBulletSuggestion(
                                      s.projectIndex,
                                      s.bulletId,
                                      suggestionDraft,
                                      true
                                    )
                                  }
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                                >
                                  Apply Edited Bullet
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSuggestionId(null)}
                                  className="text-xs text-outline cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-on-surface dark:text-slate-200 leading-relaxed font-medium">
                                &quot;{s.suggestedText}&quot;
                              </p>
                              <div className="text-[10px] text-on-surface-variant dark:text-slate-400">
                                {s.reason}
                              </div>
                              {s.integratedKeywords.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {s.integratedKeywords.map((kw) => (
                                    <span
                                      key={kw}
                                      className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px] font-semibold"
                                    >
                                      +{kw}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleApplyProjectBulletSuggestion(
                                      s.projectIndex,
                                      s.bulletId,
                                      s.suggestedText,
                                      false
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                                >
                                  <span className="material-symbols-outlined text-[13px]">add_task</span>
                                  <span>Apply to Bullet</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSuggestionId(s.id);
                                    setSuggestionDraft(s.suggestedText);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-surface-container-high dark:bg-white/10 hover:bg-surface-container-highest text-on-surface dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                                >
                                  <span className="material-symbols-outlined text-[13px]">edit</span>
                                  <span>Edit &amp; Apply</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2. ADDITIONAL INFORMATION OVERFLOW (Rule 5) */}
                <div className="p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/25 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">playlist_add</span>
                      <span>Additional Information Overflow (Rule 5)</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300">
                      {optimizationPlan.additionalInfoOverflow.overflowKeywords.length} Overflow Terms
                    </span>
                  </div>

                  {/* Covered vs Overflow Keyword Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {optimizationPlan.additionalInfoOverflow.alreadyCoveredKeywords.map((kw) => (
                      <span
                        key={`cov-${kw}`}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      >
                        ✓ {kw}
                      </span>
                    ))}
                    {optimizationPlan.additionalInfoOverflow.overflowKeywords.map((kw) => (
                      <span
                        key={`ov-${kw}`}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                      >
                        Overflow: {kw}
                      </span>
                    ))}
                  </div>

                  {pendingOverflowEntries.length > 0 ? (
                    pendingOverflowEntries.map((entry, idx) => {
                      const isEditingOverflow = editingOverflowIdx === idx;
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant/50 dark:border-white/10 space-y-2"
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                            Suggested Append to Additional Information
                          </div>
                          {isEditingOverflow ? (
                            <div className="space-y-2">
                              <textarea
                                rows={3}
                                value={overflowDraft}
                                onChange={(e) => setOverflowDraft(e.target.value)}
                                className="w-full p-2 rounded border border-primary text-xs bg-surface-container-low dark:bg-[#131b2e] text-on-surface dark:text-white"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAppendAdditionalInfo(overflowDraft)}
                                  className="px-2.5 py-1 rounded bg-violet-600 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Append Note
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingOverflowIdx(null)}
                                  className="text-[11px] text-outline cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-on-surface dark:text-slate-200 leading-relaxed">
                                {entry}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAppendAdditionalInfo(entry)}
                                  className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Append to Additional Information
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingOverflowIdx(idx);
                                    setOverflowDraft(entry);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-surface-container-high dark:bg-white/10 text-on-surface dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                                >
                                  Edit &amp; Append
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[11px] text-on-surface-variant dark:text-slate-400">
                      {optimizationPlan.additionalInfoOverflow.overflowKeywords.length === 0
                        ? 'All JD keywords are already covered inside your resume!'
                        : 'Overflow alignment note is already appended in Additional Information on your resume.'}
                    </div>
                  )}
                </div>

                {/* 3. COMPLETE PLAIN-TEXT RESUME OUTPUT PREVIEW & COPY */}
                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-on-surface dark:text-white">
                      Complete Optimized Resume Output
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyCompleteOutput}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[13px]">content_copy</span>
                        <span>{copiedCompleteText ? 'Copied!' : 'Copy Complete'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCompleteOutputModal(true)}
                        className="px-2 py-1 rounded-lg bg-surface-container-high dark:bg-white/10 text-on-surface dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                      >
                        Expand
                      </button>
                    </div>
                  </div>
                  <pre className="p-2.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant/40 dark:border-white/10 text-[11px] font-mono text-on-surface-variant dark:text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {completeResumeOutputText}
                  </pre>
                </div>
              </div>
            )}

            {/* TOOLBAR TAB 2: MANUAL ELEMENTS */}
            {toolbarTab === 'manual-elements' && (
              <div className="space-y-4">
                <p className="text-xs text-on-surface-variant dark:text-slate-400">
                  Manually edit or append entries onto your resume canvas. (Rule 3 enforced: no AI Summary section is added.)
                </p>

                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-on-surface dark:text-white">
                    Append to Additional Information
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={toolbarAdditionalDraft}
                      onChange={(e) => setToolbarAdditionalDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAppendAdditionalInfo(toolbarAdditionalDraft);
                        }
                      }}
                      placeholder="e.g., Agile/Scrum collaboration, Docker familiarity..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleAppendAdditionalInfo(toolbarAdditionalDraft)}
                      disabled={!toolbarAdditionalDraft.trim()}
                      className="px-3 py-1.5 rounded-lg bg-violet-600 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                    >
                      Append
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-on-surface dark:text-white">Add Custom Skill Manually</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={toolbarSkillDraft}
                      onChange={(e) => setToolbarSkillDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill(toolbarSkillDraft);
                        }
                      }}
                      placeholder="e.g., GraphQL, Docker, AWS"
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSkill(toolbarSkillDraft)}
                      disabled={!toolbarSkillDraft.trim()}
                      className="px-3 py-1.5 rounded-lg bg-primary disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-on-surface dark:text-white">Add Project Manually</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newProjectDraft.title}
                      onChange={(e) => setNewProjectDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Project Title"
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                    />
                    <input
                      type="text"
                      value={newProjectDraft.date}
                      onChange={(e) => setNewProjectDraft((p) => ({ ...p, date: e.target.value }))}
                      placeholder="Date (e.g., Jan 2025)"
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newProjectDraft.tech}
                      onChange={(e) => setNewProjectDraft((p) => ({ ...p, tech: e.target.value }))}
                      placeholder="Tech Stack"
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                    />
                    <input
                      type="text"
                      value={newProjectDraft.link}
                      onChange={(e) => setNewProjectDraft((p) => ({ ...p, link: e.target.value }))}
                      placeholder="GitHub / Live Link"
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                    />
                  </div>
                  <input
                    type="text"
                    value={newProjectDraft.description}
                    onChange={(e) => setNewProjectDraft((p) => ({ ...p, description: e.target.value }))}
                    placeholder="High-level project overview (optional)..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                  />
                  <textarea
                    rows={2}
                    value={newProjectDraft.bullet}
                    onChange={(e) => setNewProjectDraft((p) => ({ ...p, bullet: e.target.value }))}
                    placeholder="First project bullet point..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualProject}
                    disabled={!newProjectDraft.title.trim()}
                    className="w-full py-1.5 rounded-lg bg-primary disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                  >
                    + Insert Project
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-on-surface dark:text-white">Add Experience Block Manually</div>
                  <input
                    type="text"
                    value={newExpDraft.title}
                    onChange={(e) => setNewExpDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Role Title"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={newExpDraft.company}
                      onChange={(e) => setNewExpDraft((d) => ({ ...d, company: e.target.value }))}
                      placeholder="Company Name"
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                    />
                    <input
                      type="text"
                      value={newExpDraft.period}
                      onChange={(e) => setNewExpDraft((d) => ({ ...d, period: e.target.value }))}
                      placeholder="Period"
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={newExpDraft.bullet}
                    onChange={(e) => setNewExpDraft((d) => ({ ...d, bullet: e.target.value }))}
                    placeholder="Achievement bullet..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddExperienceBlock}
                    disabled={!newExpDraft.title.trim()}
                    className="w-full py-1.5 rounded-lg bg-primary disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                  >
                    + Insert Experience Block
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-on-surface dark:text-white">Add Education</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newEduDraft}
                      onChange={(e) => setNewEduDraft(e.target.value)}
                      placeholder="Degree, University, GPA / Year"
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualEducation}
                      disabled={!newEduDraft.trim()}
                      className="px-3 py-1.5 rounded-lg bg-primary disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-on-surface dark:text-white">Add Certification</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCertDraft}
                      onChange={(e) => setNewCertDraft(e.target.value)}
                      placeholder="e.g., AWS Certified Developer"
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-[#0d111d] border border-outline-variant dark:border-white/10 text-xs text-on-surface dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualCert}
                      disabled={!newCertDraft.trim()}
                      className="px-3 py-1.5 rounded-lg bg-primary disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TOOLBAR TAB 3: CHANGES LOG */}
            {toolbarTab === 'changes-log' && (
              <div className="space-y-4">
                {baseline && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-emerald-700 dark:text-emerald-300">
                        Score Progress: {baseline.overallScore}/100 → {resume.overallScore}/100
                      </div>
                      <div className="text-[11px] text-on-surface-variant dark:text-slate-400">
                        {modifiedProjectBulletsList.length} project bullets • {addedAdditionalInfoDiff.length} Additional Info notes
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRevertAllChanges}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Revert All
                    </button>
                  </div>
                )}

                {addedAdditionalInfoDiff.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-on-surface dark:text-white">
                      Appended Additional Information ({addedAdditionalInfoDiff.length})
                    </div>
                    {addedAdditionalInfoDiff.map((entry, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-xs flex items-start justify-between gap-2"
                      >
                        <span className="text-on-surface dark:text-slate-200">{entry}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const fullIdx = (resume.additionalInformation || []).indexOf(entry);
                            if (fullIdx >= 0) handleRemoveAdditionalEntry(fullIdx);
                          }}
                          className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline shrink-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-xs font-bold text-on-surface dark:text-white">
                    Modified Project Bullet Points ({modifiedProjectBulletsList.length})
                  </div>

                  {modifiedProjectBulletsList.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-outline-variant dark:border-white/15 text-center text-xs text-on-surface-variant dark:text-slate-400">
                      No project bullets modified yet. Apply a suggestion in ATS Optimizer or click any bullet on the left sheet.
                    </div>
                  ) : (
                    modifiedProjectBulletsList.map((b) => (
                      <div
                        key={`${b.projectIdx}-${b.id}`}
                        className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              b.isAiModified
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                            }`}
                          >
                            {b.isAiModified ? 'ATS Optimized' : 'Manual Edit'} • {b.projectTitle}
                          </span>
                          {b.originalText && (
                            <button
                              type="button"
                              onClick={() => handleRevertProjectBullet(b.projectIdx, b.id)}
                              className="text-[11px] font-semibold text-amber-600 dark:text-amber-300 hover:underline cursor-pointer"
                            >
                              Use Original
                            </button>
                          )}
                        </div>
                        {b.originalText && b.originalText !== b.text && (
                          <div className="text-[11px] text-on-surface-variant dark:text-slate-400 line-through">
                            {b.originalText}
                          </div>
                        )}
                        <div className="text-on-surface dark:text-slate-200 font-medium">{b.text}</div>
                      </div>
                    ))
                  )}
                </div>

                {modifiedWorkBulletsList.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-on-surface dark:text-white">
                      Manual Experience Edits ({modifiedWorkBulletsList.length})
                    </div>
                    {modifiedWorkBulletsList.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300">
                            {b.expTitle}
                          </span>
                          {b.originalText && (
                            <button
                              type="button"
                              onClick={() => handleRevertWorkBullet(b.expId, b.id)}
                              className="text-[11px] font-semibold text-amber-600 dark:text-amber-300 hover:underline cursor-pointer"
                            >
                              Use Original
                            </button>
                          )}
                        </div>
                        <div className="text-on-surface dark:text-slate-200 font-medium">{b.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
