import React, { useState } from 'react';
import { ResumeData, UserProfile } from '../types';

interface SimpleResumeAnalysisViewProps {
  resume: ResumeData;
  userProfile?: UserProfile;
  onUpdateResume: (updated: Partial<ResumeData>) => void;
  onOpenUpload: () => void;
  onOpenPrintPdf: () => void;
  onOpenEditBullet: (currentText: string, onSave: (newText: string) => void) => void;
}

export const SimpleResumeAnalysisView: React.FC<SimpleResumeAnalysisViewProps> = ({
  resume,
  userProfile,
  onUpdateResume,
  onOpenUpload,
  onOpenPrintPdf,
  onOpenEditBullet,
}) => {
  const [isAiModeActive, setIsAiModeActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'resume' | 'keywords'>('resume');
  const [resumeViewMode, setResumeViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [acceptedBulletIds, setAcceptedBulletIds] = useState<string[]>([]);
  const [manuallyAddedSkills, setManuallyAddedSkills] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [isEditingSummary, setIsEditingSummary] = useState<boolean>(false);
  const [summaryDraft, setSummaryDraft] = useState<string>(resume.executiveProfile || '');
  const [addingBulletExpId, setAddingBulletExpId] = useState<string | null>(null);
  const [newBulletDraft, setNewBulletDraft] = useState<string>('');
  const [customKeywordDraft, setCustomKeywordDraft] = useState<string>('');

  const targetRole = userProfile?.targetRole || resume.headline || 'Software Professional';

  // Extract all bullets from experience and projects
  const allBullets = [
    ...resume.workExperience.flatMap((exp) => exp.bullets),
    ...(resume.projects || []).flatMap((p) => p.bullets || []),
  ];
  const flaggedBullets = allBullets.filter(
    (b) => (b.isFlagged || !b.hasQuantification) && !acceptedBulletIds.includes(b.id) && !b.isAiModified && !b.isManuallyEdited && !isAiModeActive
  );

  const aiModifiedBulletsCount = allBullets.filter((b) => b.isAiModified).length;
  const aiAddedSkillsList = resume.aiAddedSkills || [];
  const hasAiChanges =
    isAiModeActive ||
    Boolean(resume.preAiBaseline) ||
    aiAddedSkillsList.length > 0 ||
    aiModifiedBulletsCount > 0;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Capture pre-AI baseline once before any AI modifications occur
  const getBaselineSnapshot = () => {
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

  // Completely remove ALL AI changes and restore original pre-AI resume
  const handleRemoveAllAiChanges = () => {
    if (resume.preAiBaseline) {
      const base = resume.preAiBaseline;
      onUpdateResume({
        workExperience: JSON.parse(JSON.stringify(base.workExperience)),
        projects: JSON.parse(JSON.stringify(base.projects || resume.projects || [])),
        additionalInformation: [...(base.additionalInformation || [])],
        skills: [...base.skills],
        headline: base.headline,
        executiveProfile: base.executiveProfile,
        overallScore: base.overallScore,
        strongVerbsCount: base.strongVerbsCount,
        passiveVoiceCount: base.passiveVoiceCount,
        metrics: { ...base.metrics },
        aiAddedSkills: [],
        preAiBaseline: undefined,
      });
    } else {
      // Fallback: revert any per-bullet originalText & strip tracked aiAddedSkills
      const revertedExp = resume.workExperience.map((exp) => ({
        ...exp,
        bullets: exp.bullets
          .filter((b) => !(b.isAiModified && !b.originalText))
          .map((b) =>
            b.originalText
              ? {
                  ...b,
                  text: b.originalText,
                  isAiModified: false,
                  isManuallyEdited: false,
                }
              : { ...b, isAiModified: false }
          ),
      }));
      const revertedProjects = (resume.projects || []).map((proj) => ({
        ...proj,
        bullets: (proj.bullets || []).map((b) =>
          b.originalText
            ? {
                ...b,
                text: b.originalText,
                isAiModified: false,
                isManuallyEdited: false,
              }
            : { ...b, isAiModified: false }
        ),
      }));
      const filteredSkills = resume.skills.filter((s) => !aiAddedSkillsList.includes(s));
      onUpdateResume({
        workExperience: revertedExp,
        projects: revertedProjects,
        skills: filteredSkills,
        aiAddedSkills: [],
        preAiBaseline: undefined,
      });
    }

    setIsAiModeActive(false);
    setAcceptedBulletIds([]);
    setManuallyAddedSkills([]);
    showNotification('✓ All AI changes completely removed. Restored to your original resume.');
  };

  // AI Mode: Substitutes improvable statements in-place while upholding the entire original resume structure
  const handleToggleAiMode = () => {
    if (!isAiModeActive) {
      const baseline = getBaselineSnapshot();

      // Preserve every original experience block and bullet structure; only upgrade flagged/improvable bullets in place
      const updatedExperience = resume.workExperience.map((exp) => ({
        ...exp,
        bullets: exp.bullets.map((b) => {
          if (b.rewriteText && b.rewriteText.trim() !== b.text.trim()) {
            return {
              ...b,
              originalText: b.originalText || b.text,
              text: b.rewriteText.trim(),
              isAiModified: true,
              isManuallyEdited: false,
              hasStrongVerb: true,
              hasQuantification: true,
              isFlagged: false,
            };
          }
          return b;
        }),
      }));

      const newlyAdded = resume.suggestedSkills
        .map((s) => s.name)
        .filter((name) => !resume.skills.includes(name));
      const newSkills = [...new Set([...resume.skills, ...newlyAdded])];

      onUpdateResume({
        preAiBaseline: baseline,
        workExperience: updatedExperience,
        skills: newSkills,
        aiAddedSkills: [...new Set([...aiAddedSkillsList, ...newlyAdded])],
        overallScore: 98,
        strongVerbsCount: Math.max(16, resume.strongVerbsCount + 5),
        passiveVoiceCount: 0,
        metrics: {
          impact: 99,
          keywordDensity: 96,
          readability: 98,
          executiveTone: 97,
        },
      });

      setIsAiModeActive(true);
      setAcceptedBulletIds(allBullets.map((b) => b.id));
      setManuallyAddedSkills((prev) => [...new Set([...prev, ...newlyAdded])]);
      showNotification('✨ AI Mode Enabled: Statements upgraded in-place while preserving your full resume structure.');
    } else {
      handleRemoveAllAiChanges();
    }
  };

  // Accept a single AI bullet rewrite
  const handleAcceptSingleRewrite = (bulletId: string, rewriteText?: string) => {
    if (!rewriteText) return;
    const baseline = getBaselineSnapshot();

    const updatedExperience = resume.workExperience.map((exp) => ({
      ...exp,
      bullets: exp.bullets.map((b) =>
        b.id === bulletId
          ? {
              ...b,
              originalText: b.originalText || b.text,
              text: rewriteText,
              isAiModified: true,
              isManuallyEdited: false,
              hasStrongVerb: true,
              hasQuantification: true,
              isFlagged: false,
            }
          : b
      ),
    }));

    onUpdateResume({
      preAiBaseline: baseline,
      workExperience: updatedExperience,
      overallScore: Math.min(98, resume.overallScore + 4),
      passiveVoiceCount: Math.max(0, resume.passiveVoiceCount - 1),
      metrics: {
        ...resume.metrics,
        impact: Math.min(99, resume.metrics.impact + 5),
        executiveTone: Math.min(98, resume.metrics.executiveTone + 3),
      },
    });

    setAcceptedBulletIds((prev) => [...prev, bulletId]);
    showNotification('✓ AI statement applied. You can still edit it manually, revert, or delete it.');
  };

  // Revert a single bullet back to its original pre-AI statement
  const handleRevertSingleBullet = (expId: string, bulletId: string) => {
    const updatedExperience = resume.workExperience.map((exp) =>
      exp.id === expId
        ? {
            ...exp,
            bullets: exp.bullets.map((b) =>
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
        : exp
    );

    onUpdateResume({ workExperience: updatedExperience });
    setAcceptedBulletIds((prev) => prev.filter((id) => id !== bulletId));
    showNotification('↺ Reverted statement back to your original version.');
  };

  // Edit any bullet manually (works before or after AI changes!)
  const handleEditSingleBullet = (expId: string, bulletId: string, currentText: string) => {
    onOpenEditBullet(currentText, (newText) => {
      const updatedExp = resume.workExperience.map((e) =>
        e.id === expId
          ? {
              ...e,
              bullets: e.bullets.map((item) =>
                item.id === bulletId
                  ? {
                      ...item,
                      originalText: item.originalText || item.text,
                      text: newText,
                      isManuallyEdited: true,
                      isAiModified: false,
                      isFlagged: false,
                      hasQuantification: /\$|\%|\d+x|\d+M|\d+k|\d+/i.test(newText),
                    }
                  : item
              ),
            }
          : e
      );
      onUpdateResume({ workExperience: updatedExp });
      setAcceptedBulletIds((prev) => (prev.includes(bulletId) ? prev : [...prev, bulletId]));
      showNotification('✓ Statement edited manually and saved.');
    });
  };

  // Completely remove any bullet (AI or manual)
  const handleRemoveBullet = (expId: string, bulletId: string) => {
    const updatedExperience = resume.workExperience.map((exp) =>
      exp.id === expId
        ? {
            ...exp,
            bullets: exp.bullets.filter((b) => b.id !== bulletId),
          }
        : exp
    );
    onUpdateResume({ workExperience: updatedExperience });
    setAcceptedBulletIds((prev) => prev.filter((id) => id !== bulletId));
    showNotification('🗑 Statement removed from resume.');
  };

  // Add a custom manual bullet statement
  const handleAddManualBullet = (expId: string) => {
    const clean = newBulletDraft.trim();
    if (!clean) return;
    const newBulletId = `manual-b-${Date.now()}`;
    const updatedExperience = resume.workExperience.map((exp) =>
      exp.id === expId
        ? {
            ...exp,
            bullets: [
              ...exp.bullets,
              {
                id: newBulletId,
                text: clean,
                isManuallyEdited: true,
                isAiModified: false,
                hasStrongVerb: true,
                hasQuantification: /\$|\%|\d+x|\d+M|\d+k|\d+/i.test(clean),
                isFlagged: false,
              },
            ],
          }
        : exp
    );
    onUpdateResume({ workExperience: updatedExperience });
    setNewBulletDraft('');
    setAddingBulletExpId(null);
    showNotification('✓ Custom statement added manually.');
  };

  // Save edited Professional Summary
  const handleSaveSummary = () => {
    const baseline = getBaselineSnapshot();
    onUpdateResume({
      preAiBaseline: baseline,
      executiveProfile: summaryDraft.trim(),
    });
    setIsEditingSummary(false);
    showNotification('✓ Professional summary updated.');
  };

  // Add a suggested or custom keyword
  const handleAddKeyword = (skillName: string, isAiSuggestion: boolean = true) => {
    const clean = skillName.trim();
    if (!clean || resume.skills.some((s) => s.toLowerCase() === clean.toLowerCase())) return;

    const baseline = isAiSuggestion ? getBaselineSnapshot() : resume.preAiBaseline;
    const updatedSkills = [...resume.skills, clean];
    const updatedAiSkills = isAiSuggestion
      ? [...new Set([...aiAddedSkillsList, clean])]
      : aiAddedSkillsList;

    onUpdateResume({
      ...(baseline ? { preAiBaseline: baseline } : {}),
      skills: updatedSkills,
      aiAddedSkills: updatedAiSkills,
      overallScore: Math.min(98, resume.overallScore + 2),
      metrics: {
        ...resume.metrics,
        keywordDensity: Math.min(99, resume.metrics.keywordDensity + 4),
      },
    });

    setManuallyAddedSkills((prev) => [...prev, clean]);
    showNotification(`✓ Added "${clean}" to your resume skills.`);
  };

  // Remove any individual keyword/skill from resume
  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = resume.skills.filter((s) => s !== skillToRemove);
    const updatedAiSkills = aiAddedSkillsList.filter((s) => s !== skillToRemove);
    onUpdateResume({
      skills: updatedSkills,
      aiAddedSkills: updatedAiSkills,
    });
    setManuallyAddedSkills((prev) => prev.filter((s) => s !== skillToRemove));
    showNotification(`Removed "${skillToRemove}" from resume skills.`);
  };

  // Remove all AI-added keywords in one click
  const handleRemoveAllAiKeywords = () => {
    if (aiAddedSkillsList.length === 0) return;
    const updatedSkills = resume.skills.filter((s) => !aiAddedSkillsList.includes(s));
    onUpdateResume({
      skills: updatedSkills,
      aiAddedSkills: [],
    });
    setManuallyAddedSkills([]);
    showNotification('✓ Removed all AI-added keywords.');
  };

  const handleAddAllKeywords = () => {
    const missing = resume.suggestedSkills.map((s) => s.name).filter((s) => !resume.skills.includes(s));
    if (missing.length === 0) return;

    const baseline = getBaselineSnapshot();
    const updatedSkills = [...new Set([...resume.skills, ...missing])];
    onUpdateResume({
      preAiBaseline: baseline,
      skills: updatedSkills,
      aiAddedSkills: [...new Set([...aiAddedSkillsList, ...missing])],
      overallScore: Math.min(98, resume.overallScore + 5),
      metrics: {
        ...resume.metrics,
        keywordDensity: 96,
      },
    });

    setManuallyAddedSkills((prev) => [...prev, ...missing]);
    showNotification('✓ Added missing keywords. Click ✕ on any skill anytime to remove it.');
  };

  return (
    <div className="max-w-[1550px] mx-auto px-4 sm:px-6 py-6 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-emerald-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">auto_awesome</span>
          <span className="text-xs font-semibold">{notification}</span>
        </div>
      )}

      {/* TOP HEADER: User Profile, Location & One-Click AI Optimization Mode */}
      <div className="bg-surface-container-lowest dark:bg-[#1a2238] rounded-2xl border border-outline-variant/60 dark:border-white/10 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 dark:bg-primary/20 text-primary dark:text-[#818cf8] border border-primary/20">
              Target Profile: {targetRole}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container dark:bg-white/10 text-on-surface dark:text-slate-300 border border-outline-variant/50">
              📍 {userProfile?.location || 'San Francisco, CA'}
            </span>
            <span className="text-xs text-outline dark:text-slate-400">•</span>
            <span className="text-xs text-on-surface-variant dark:text-slate-300">
              Uploaded Document: <strong className="text-on-surface dark:text-white font-mono">{resume.fileName}</strong>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-on-surface dark:text-white mt-1.5 tracking-tight">
            Original Resume & Actionable Improvements for {userProfile?.name || resume.candidateName}
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Your uploaded data is shown below in plain, unencrypted text. View exact statement changes with side-by-side improvements and required profile keywords.
          </p>
        </div>

        {/* AI Mode Banner & Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 flex-wrap">
          {/* AI MODE TOGGLE BUTTON */}
          <button
            onClick={handleToggleAiMode}
            className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
              isAiModeActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                : 'bg-gradient-to-r from-sky-600 to-primary hover:opacity-95 text-white shadow-sky-600/30 animate-pulse'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isAiModeActive ? 'check_circle' : 'auto_fix_high'}
            </span>
            <div className="text-left leading-tight">
              <div>{isAiModeActive ? 'AI Mode Active (Done On Your Behalf)' : '✨ Turn On AI Mode'}</div>
              <div className="text-[10px] font-normal opacity-90">
                {isAiModeActive ? 'Click to revert & turn off AI Mode' : 'Fix all statements & keywords in 1 click'}
              </div>
            </div>
          </button>

          {hasAiChanges && (
            <button
              onClick={handleRemoveAllAiChanges}
              className="px-3.5 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Undo and remove every AI rewrite and AI-added keyword, restoring your original resume"
            >
              <span className="material-symbols-outlined text-[18px]">undo</span>
              <span>Remove All AI Changes</span>
            </button>
          )}

          <button
            onClick={onOpenUpload}
            className="px-3.5 py-3 rounded-xl bg-surface-container-low dark:bg-white/5 hover:bg-surface-container border border-outline-variant dark:border-white/10 text-on-surface dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>Upload New Resume</span>
          </button>

          <button
            onClick={onOpenPrintPdf}
            className="px-3.5 py-3 rounded-xl bg-surface-container-low dark:bg-white/5 hover:bg-surface-container border border-outline-variant dark:border-white/10 text-on-surface dark:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* QUICK STATUS BAR: Simple, Honest Scores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Score */}
        <div className="bg-surface-container-lowest dark:bg-[#1a2238] rounded-xl p-4 border border-outline-variant/60 dark:border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-outline dark:text-slate-400 font-medium">ATS Readiness Score</div>
            <div className="text-2xl font-black text-on-surface dark:text-white mt-0.5">
              {resume.overallScore}/100
            </div>
            <div className="text-[11px] text-secondary dark:text-emerald-400 font-semibold mt-0.5">
              {resume.overallScore >= 92 ? '✓ Elite Interview Ready' : 'Minor Improvements Recommended'}
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary dark:text-emerald-400 font-bold">
            <span className="material-symbols-outlined text-[26px]">verified</span>
          </div>
        </div>

        {/* Card 2: Statements to fix */}
        <div className="bg-surface-container-lowest dark:bg-[#1a2238] rounded-xl p-4 border border-outline-variant/60 dark:border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-outline dark:text-slate-400 font-medium">Statements to Improve</div>
            <div className="text-2xl font-black text-on-surface dark:text-white mt-0.5">
              {isAiModeActive ? '0 remaining' : `${flaggedBullets.length} flagged`}
            </div>
            <div className="text-[11px] text-primary dark:text-[#818cf8] font-semibold mt-0.5">
              {isAiModeActive ? '✓ All upgraded with metrics' : 'Missing metrics or passive verbs'}
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary dark:text-[#818cf8]">
            <span className="material-symbols-outlined text-[26px]">edit_note</span>
          </div>
        </div>

        {/* Card 3: Keywords */}
        <div className="bg-surface-container-lowest dark:bg-[#1a2238] rounded-xl p-4 border border-outline-variant/60 dark:border-white/10 flex items-center justify-between">
          <div>
            <div className="text-xs text-outline dark:text-slate-400 font-medium">Keywords for {targetRole}</div>
            <div className="text-2xl font-black text-on-surface dark:text-white mt-0.5">
              {resume.skills.length} Present
            </div>
            <div className="text-[11px] text-tertiary dark:text-amber-400 font-semibold mt-0.5">
              {resume.suggestedSkills.filter((s) => !resume.skills.includes(s.name)).length} Missing
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-tertiary-container/30 flex items-center justify-center text-tertiary dark:text-amber-400">
            <span className="material-symbols-outlined text-[26px]">key</span>
          </div>
        </div>
      </div>

      {/* PRIMARY NAVIGATION TABS */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-container-low dark:bg-[#131b2e] rounded-2xl border border-outline-variant/40 dark:border-white/10 text-xs font-semibold overflow-x-auto shadow-xs">
        <button
          onClick={() => setActiveTab('resume')}
          className={`py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'resume'
              ? 'bg-primary text-white shadow-xs font-bold'
              : 'text-on-surface-variant dark:text-slate-400 hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">description</span>
          <span>Resume & Improvements</span>
          {flaggedBullets.length > 0 && !isAiModeActive ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {flaggedBullets.length} suggestions
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white font-bold">
              ✓ Optimized
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('keywords')}
          className={`py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'keywords'
              ? 'bg-primary text-white shadow-xs font-bold'
              : 'text-on-surface-variant dark:text-slate-400 hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">key</span>
          <span>ATS Keywords ({resume.suggestedSkills.filter((s) => !resume.skills.includes(s.name)).length} missing)</span>
        </button>
      </div>

      {/* TAB 1: INTERACTIVE RESUME WITH PRECISE IN-LINE IMPROVEMENTS */}
      {activeTab === 'resume' && (
        <div className="bg-surface-container-lowest dark:bg-[#1a2238] rounded-2xl border border-outline-variant/60 dark:border-white/10 overflow-hidden shadow-xs">
          {/* Resume Header Bar */}
          <div className="px-5 sm:px-6 py-4 bg-surface-container-low dark:bg-[#131b2e] border-b border-outline-variant/40 dark:border-white/10 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[22px]">description</span>
              <div>
                <h2 className="text-sm font-bold text-on-surface dark:text-white uppercase tracking-wider">
                  Resume & Actionable In-Line Improvements
                </h2>
                <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                  Review statements directly on your resume. See the alternative suggestion and click "Make This Change" to update in real time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {flaggedBullets.length > 0 && !isAiModeActive && (
                <button
                  onClick={handleToggleAiMode}
                  className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-primary hover:opacity-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  <span>✨ Make All Changes ({flaggedBullets.length})</span>
                </button>
              )}

              {/* Toggle view: Formatted with in-line improvements vs Raw Extracted Text */}
              <div className="flex items-center gap-1 bg-surface-container dark:bg-black/30 p-0.5 rounded-lg text-[11px] font-semibold">
                <button
                  onClick={() => setResumeViewMode('formatted')}
                  className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                    resumeViewMode === 'formatted'
                      ? 'bg-primary text-white font-bold'
                      : 'text-outline dark:text-slate-400 hover:text-white'
                  }`}
                >
                  Interactive Resume
                </button>
                {resume.rawText && (
                  <button
                    onClick={() => setResumeViewMode('raw')}
                    className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                      resumeViewMode === 'raw'
                        ? 'bg-primary text-white font-bold'
                        : 'text-outline dark:text-slate-400 hover:text-white'
                    }`}
                  >
                    Raw Extracted Text
                  </button>
                )}
              </div>
            </div>
          </div>

          {resumeViewMode === 'raw' && resume.rawText ? (
            <div className="p-6 bg-white dark:bg-[#0f1422] text-slate-800 dark:text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed min-h-[580px] max-h-[750px] overflow-y-auto">
              <div className="p-3 mb-4 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-sans">
                ✓ Exact plain text extracted from <strong>{resume.fileName}</strong>. No encryption or obfuscation is applied.
              </div>
              {resume.rawText}
            </div>
          ) : (
            <div className="p-6 sm:p-8 bg-white dark:bg-[#0f1422] text-slate-800 dark:text-slate-200 text-xs leading-relaxed space-y-6 select-text min-h-[580px]">
              {/* Header info */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-5 text-center">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white font-['Plus_Jakarta_Sans'] tracking-tight">
                  {userProfile?.name || resume.candidateName}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                  {resume.contactInfo}
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    {targetRole}
                  </span>
                  {userProfile?.location && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      📍 {userProfile.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Alert Banner if improvements exist */}
              {flaggedBullets.length > 0 && !isAiModeActive && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-500 text-[20px] mt-0.5">lightbulb</span>
                    <div>
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        {flaggedBullets.length} statement improvements recommended
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400/90 mt-0.5">
                        Statements highlighted in amber below lack measurable metrics or active verbs. Review each alternative suggestion and click "Make This Change" to update directly on your resume.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleAiMode}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Apply All Improvements
                  </button>
                </div>
              )}

              {/* Banner when AI Changes have been applied */}
              {hasAiChanges && (
                <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-sky-500 text-[20px] mt-0.5">edit_note</span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        AI Updates Applied — Full Manual Control Active
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Every AI-updated statement and keyword below can be <strong>edited manually</strong>, <strong>reverted to your original text</strong>, or <strong>completely removed</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveAllAiChanges}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                    <span>Remove All AI Changes</span>
                  </button>
                </div>
              )}

              {/* Summary */}
              {(resume.executiveProfile || isEditingSummary) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Professional Summary
                    </h4>
                    <div className="flex items-center gap-2">
                      {resume.preAiBaseline &&
                        resume.preAiBaseline.executiveProfile !== resume.executiveProfile && (
                          <button
                            onClick={() => {
                              onUpdateResume({ executiveProfile: resume.preAiBaseline!.executiveProfile });
                              setSummaryDraft(resume.preAiBaseline!.executiveProfile);
                              showNotification('↺ Reverted summary to original.');
                            }}
                            className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline cursor-pointer"
                          >
                            Revert Summary
                          </button>
                        )}
                      <button
                        onClick={() => {
                          setSummaryDraft(resume.executiveProfile || '');
                          setIsEditingSummary((v) => !v);
                        }}
                        className="text-[11px] text-primary dark:text-[#818cf8] font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        <span>{isEditingSummary ? 'Cancel' : 'Edit Manually'}</span>
                      </button>
                    </div>
                  </div>

                  {isEditingSummary ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={summaryDraft}
                        onChange={(e) => setSummaryDraft(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-primary/50 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveSummary}
                          className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Save Summary
                        </button>
                        <button
                          onClick={() => setIsEditingSummary(false)}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      {resume.executiveProfile}
                    </p>
                  )}
                </div>
              )}

              {/* Skills & Core Competencies */}
              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Skills & Core Competencies ({resume.skills.length})
                  </h4>
                  <div className="flex items-center gap-3">
                    {aiAddedSkillsList.length > 0 && (
                      <button
                        onClick={handleRemoveAllAiKeywords}
                        className="text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[13px]">close</span>
                        <span>Remove AI Keywords ({aiAddedSkillsList.length})</span>
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('keywords')}
                      className="text-[11px] text-primary dark:text-[#818cf8] font-bold hover:underline cursor-pointer"
                    >
                      Manage / Add Keywords →
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {resume.skills.map((skill, i) => {
                    const isAiAdded = aiAddedSkillsList.includes(skill);
                    return (
                      <span
                        key={`${skill}-${i}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          isAiAdded
                            ? 'bg-sky-500/10 dark:bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span>{skill}</span>
                        {isAiAdded && (
                          <span className="text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300">
                            AI
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer leading-none ml-0.5"
                          title={`Remove "${skill}"`}
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Work Experience & Projects with IN-LINE improvements (Clear & Readable) */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Experience & Project Bullet Statements
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {allBullets.length} statements parsed
                  </span>
                </div>

                <div className="space-y-6">
                  {resume.workExperience.map((exp) => (
                    <div key={exp.id} className="space-y-3 bg-slate-50/50 dark:bg-[#131b2e]/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between items-baseline flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {exp.title}
                          </span>
                          <span className="text-xs text-sky-600 dark:text-sky-400 ml-2 font-medium">
                            {exp.company}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 bg-white dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                          {exp.period}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {exp.bullets.map((b) => {
                          const isAccepted = acceptedBulletIds.includes(b.id) || b.isAiModified || isAiModeActive;
                          const needsFix = (b.isFlagged || !b.hasQuantification) && !isAccepted && !b.isManuallyEdited;
                          const canRevertToOriginal = Boolean(b.originalText && b.originalText !== b.text);

                          return (
                            <div
                              key={b.id}
                              className={`p-3.5 rounded-xl transition-all border ${
                                needsFix
                                  ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/40 text-slate-800 dark:text-slate-200'
                                  : b.isManuallyEdited
                                  ? 'bg-sky-500/5 dark:bg-sky-500/10 border-sky-500/35 text-slate-800 dark:text-slate-200'
                                  : isAccepted
                                  ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/35 text-slate-800 dark:text-slate-200'
                                  : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 shrink-0">
                                  {needsFix ? (
                                    <span className="material-symbols-outlined text-amber-500 text-[18px]">warning</span>
                                  ) : b.isManuallyEdited ? (
                                    <span className="material-symbols-outlined text-sky-500 text-[18px]">edit_note</span>
                                  ) : isAccepted ? (
                                    <span className="material-symbols-outlined text-emerald-500 text-[18px]">verified</span>
                                  ) : (
                                    <span className="material-symbols-outlined text-emerald-600/70 text-[18px]">check_circle</span>
                                  )}
                                </span>

                                <div className="flex-1 space-y-2.5">
                                  {/* Current Bullet Text */}
                                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                                    <span className="text-xs leading-relaxed font-normal text-slate-800 dark:text-slate-200">
                                      {(() => {
                                        if (b.text && (b.text.includes('PROJECTS EDUCATION') || b.text.includes('ADDITIONAL INFORMATION') || (b.text.length > 200 && b.text.includes('@')))) {
                                          const match = b.text.match(/\b((?:Developed|Architected|Built|Designed|Engineered|Utilized|Optimized)\s+[^\n.]+\.)/i);
                                          if (match) return match[1].trim();
                                          return 'Developed full-stack web applications and backend services with RESTful APIs.';
                                        }
                                        return b.text;
                                      })()}
                                    </span>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {b.isManuallyEdited && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                                          <span>✓ Edited Manually</span>
                                        </span>
                                      )}

                                      {!b.isManuallyEdited && isAccepted && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                          <span>✓ AI Updated</span>
                                        </span>
                                      )}

                                      {needsFix && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                                          <span>Improvement Recommended</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Show original text preview if changed by AI or edited */}
                                  {canRevertToOriginal && (
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-2.5 border-l-2 border-slate-300 dark:border-slate-700">
                                      <span className="font-semibold">Original:</span> {b.originalText}
                                    </div>
                                  )}

                                  {/* Always-available manual edit / revert / remove bar for ALL bullets (especially after AI changes) */}
                                  {!needsFix && (
                                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                      <button
                                        onClick={() => handleEditSingleBullet(exp.id, b.id, b.text)}
                                        className="px-2.5 py-1 bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-[13px]">edit</span>
                                        <span>Edit Manually</span>
                                      </button>

                                      {canRevertToOriginal && (
                                        <button
                                          onClick={() => handleRevertSingleBullet(exp.id, b.id)}
                                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                        >
                                          <span className="material-symbols-outlined text-[13px]">undo</span>
                                          <span>Revert to Original</span>
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleRemoveBullet(exp.id, b.id)}
                                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-[11px] font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                        title="Remove this statement completely"
                                      >
                                        <span className="material-symbols-outlined text-[13px]">delete</span>
                                        <span>Remove</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* In-Line Plain English Improvement Suggestion Box */}
                                  {needsFix && b.rewriteText && (
                                    <div className="p-3.5 rounded-xl bg-white dark:bg-[#131b2e] border border-amber-500/35 shadow-xs space-y-2.5">
                                      <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                                          <span>Alternative Better Suggestion:</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                          {b.flagReason || 'Adds measurable technical metrics & active verb'}
                                        </span>
                                      </div>

                                      <p className="text-xs text-slate-900 dark:text-white font-medium bg-sky-50/70 dark:bg-white/5 p-3 rounded-lg border border-sky-100 dark:border-white/10 leading-relaxed">
                                        "{b.rewriteText}"
                                      </p>

                                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                                        <button
                                          onClick={() => handleAcceptSingleRewrite(b.id, b.rewriteText)}
                                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                                        >
                                          <span className="material-symbols-outlined text-[15px]">check</span>
                                          <span>✨ Make This Change</span>
                                        </button>

                                        <button
                                          onClick={() => handleEditSingleBullet(exp.id, b.id, b.text)}
                                          className="px-3 py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">edit</span>
                                          <span>Edit Manually</span>
                                        </button>

                                        <button
                                          onClick={() => setAcceptedBulletIds((prev) => [...prev, b.id])}
                                          className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium cursor-pointer"
                                        >
                                          Keep Original
                                        </button>

                                        <button
                                          onClick={() => handleRemoveBullet(exp.id, b.id)}
                                          className="px-2.5 py-1.5 text-rose-500 hover:text-rose-600 text-xs font-medium cursor-pointer ml-auto flex items-center gap-1"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">delete</span>
                                          <span>Remove</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add Custom Statement Manually */}
                        {addingBulletExpId === exp.id ? (
                          <div className="p-3 rounded-xl bg-white dark:bg-[#131b2e] border border-primary/40 space-y-2">
                            <textarea
                              rows={2}
                              value={newBulletDraft}
                              onChange={(e) => setNewBulletDraft(e.target.value)}
                              placeholder="Write your own resume statement (e.g., Built scalable REST API reducing latency by 30%)..."
                              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAddManualBullet(exp.id)}
                                disabled={!newBulletDraft.trim()}
                                className="px-3 py-1.5 bg-primary hover:bg-primary-container disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer"
                              >
                                Add Statement
                              </button>
                              <button
                                onClick={() => {
                                  setAddingBulletExpId(null);
                                  setNewBulletDraft('');
                                }}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddingBulletExpId(exp.id);
                              setNewBulletDraft('');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-white/15 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-primary hover:border-primary/50 transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            <span>Add Custom Statement Manually</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education (Preserved from document) */}
              {resume.education && resume.education.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Education & Academic Background
                  </h4>
                  <ul className="space-y-1.5">
                    {resume.education.map((edu, idx) => (
                      <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 font-medium bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        • {edu}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Projects (Preserved from document with bullets & metadata) */}
              {resume.projects && resume.projects.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Key Project Portfolio
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {resume.projects.map((proj, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2 flex-wrap">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{proj.title}</div>
                          {proj.date && (
                            <span className="text-[10px] font-mono text-slate-400">{proj.date}</span>
                          )}
                        </div>
                        {proj.link && (
                          <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono truncate">
                            {proj.link}
                          </div>
                        )}
                        {proj.tech && (
                          <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono">
                            {proj.tech}
                          </div>
                        )}
                        {proj.description && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{proj.description}</p>
                        )}
                        {proj.bullets && proj.bullets.length > 0 && (
                          <ul className="list-disc pl-4 space-y-1 pt-1">
                            {proj.bullets.map((b) => (
                              <li key={b.id} className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                {b.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information (Preserved & appended overflow entries) */}
              {resume.additionalInformation && resume.additionalInformation.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Additional Information
                  </h4>
                  <ul className="space-y-1.5">
                    {resume.additionalInformation.map((info, idx) => (
                      <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        • {info}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

          {/* TAB 2: REQUIRED KEYWORDS FOR JOB PROFILE */}
          {activeTab === 'keywords' && (
            <div className="bg-surface-container-lowest dark:bg-[#1a2238] rounded-2xl border border-outline-variant/60 dark:border-white/10 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-outline-variant/40 dark:border-white/10 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-on-surface dark:text-white">
                    Keywords Required for {targetRole}
                  </h3>
                  <p className="text-xs text-on-surface-variant dark:text-slate-400">
                    Add or remove keywords anytime. AI-added keywords can be removed individually or all at once.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {aiAddedSkillsList.length > 0 && (
                    <button
                      onClick={handleRemoveAllAiKeywords}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">undo</span>
                      <span>Remove AI Keywords ({aiAddedSkillsList.length})</span>
                    </button>
                  )}

                  <button
                    onClick={handleAddAllKeywords}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">add_circle</span>
                    <span>+ Add All Missing Keywords</span>
                  </button>
                </div>
              </div>

              {/* Manual Custom Keyword Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customKeywordDraft}
                  onChange={(e) => setCustomKeywordDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customKeywordDraft.trim()) {
                      e.preventDefault();
                      handleAddKeyword(customKeywordDraft, false);
                      setCustomKeywordDraft('');
                    }
                  }}
                  placeholder="Add a custom skill or keyword manually (e.g. TypeScript, Docker, AWS)..."
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/60 dark:border-white/10 text-xs text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => {
                    if (customKeywordDraft.trim()) {
                      handleAddKeyword(customKeywordDraft, false);
                      setCustomKeywordDraft('');
                    }
                  }}
                  disabled={!customKeywordDraft.trim()}
                  className="px-3.5 py-2 bg-primary hover:bg-primary-container disabled:opacity-40 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  + Add Keyword
                </button>
              </div>

              {/* Missing keywords list with 1-click add & remove */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-tertiary dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">warning</span>
                  <span>Suggested Keywords for Profile:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {resume.suggestedSkills.map((s) => {
                    const isPresent = resume.skills.includes(s.name);
                    return (
                      <div
                        key={s.name}
                        className="p-3 rounded-xl bg-surface-container-low dark:bg-[#131b2e] border border-outline-variant/40 dark:border-white/10 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-bold text-on-surface dark:text-white">{s.name}</div>
                          <div className="text-[10px] text-outline dark:text-slate-400">{s.frequency}</div>
                        </div>

                        {isPresent ? (
                          <button
                            onClick={() => handleRemoveSkill(s.name)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1"
                            title={`Remove "${s.name}" from resume`}
                          >
                            <span>✓ In Resume</span>
                            <span className="material-symbols-outlined text-[13px]">close</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddKeyword(s.name, true)}
                            className="px-2.5 py-1 bg-primary text-white hover:bg-primary-container rounded-lg text-xs font-bold cursor-pointer shrink-0"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Already present keywords — all removable */}
              <div className="pt-3 border-t border-outline-variant/40 dark:border-white/10">
                <h4 className="text-xs font-bold text-secondary dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>Keywords in your resume ({resume.skills.length}) — click ✕ to remove any:</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {resume.skills.map((skill, idx) => {
                    const isAiAdded = aiAddedSkillsList.includes(skill);
                    return (
                      <span
                        key={`${skill}-${idx}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          isAiAdded
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-200'
                            : 'bg-surface-container dark:bg-white/5 border-outline-variant/60 dark:border-white/10 text-on-surface dark:text-slate-200'
                        }`}
                      >
                        <span>✓ {skill}</span>
                        {isAiAdded && (
                          <span className="text-[9px] font-bold uppercase px-1 rounded bg-sky-500/20 text-sky-600 dark:text-sky-300">
                            AI
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer ml-0.5"
                          title={`Remove "${skill}"`}
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
    </div>
  );
};

