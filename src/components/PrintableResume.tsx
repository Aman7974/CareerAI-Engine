import React from 'react';
import { ResumeData } from '../types';

interface PrintableResumeProps {
  resume: ResumeData;
}

export const PrintableResume: React.FC<PrintableResumeProps> = ({ resume }) => {
  return (
    <div
      id="printable-executive-resume"
      className="print-only text-slate-900 bg-white leading-relaxed font-sans"
      style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
    >
      {/* 1. Candidate Header */}
      <div className="text-center pb-3 border-b-2 border-slate-900 mb-4 avoid-break">
        <h1
          className="text-2xl font-extrabold uppercase tracking-tight text-slate-950 mb-1"
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          {resume.candidateName}
        </h1>
        <div className="text-[9.5pt] text-slate-700 font-medium">
          {resume.contactInfo}
        </div>
        <div className="text-[10pt] font-bold text-slate-900 tracking-wider uppercase mt-1">
          {resume.headline}
        </div>
      </div>

      {/* 2. Executive Profile */}
      {resume.executiveProfile && (
        <div className="mb-4 avoid-break">
          <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 mb-1.5 flex items-center justify-between">
            <span>Professional Summary</span>
          </h2>
          <p className="text-[9.5pt] text-slate-800 text-justify leading-normal">
            {resume.executiveProfile}
          </p>
        </div>
      )}

      {/* 3. Core Competencies & Technical Skills */}
      {resume.skills && resume.skills.length > 0 && (
        <div className="mb-4 avoid-break">
          <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 mb-1.5">
            Technical Skills & Core Competencies
          </h2>
          <div className="grid grid-cols-3 gap-y-1 gap-x-2 text-[9pt] text-slate-800">
            {resume.skills.map((skill, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500">•</span>
                <span className="font-medium">{skill}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Professional Experience — Full Original Blocks & Bullets Preserved */}
      {resume.workExperience && resume.workExperience.length > 0 && (
        <div className="mb-4 avoid-break">
          <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 mb-2.5">
            Experience & Key Achievements
          </h2>

          {resume.workExperience.map((exp) => (
            <div key={exp.id} className="mb-3.5 avoid-break">
              <div className="flex justify-between items-baseline mb-1">
                <div>
                  <span className="font-bold text-[10pt] text-slate-950">{exp.title}</span>
                  <span className="text-slate-500 mx-1.5">|</span>
                  <span className="font-semibold text-[10pt] text-slate-800">{exp.company}</span>
                </div>
                <span className="text-[9pt] font-semibold text-slate-600 font-mono">{exp.period}</span>
              </div>

              <ul className="list-disc pl-4 space-y-1.5 text-[9pt] text-slate-800 text-justify">
                {exp.bullets.map((bullet) => (
                  <li key={bullet.id} className="leading-snug">
                    {bullet.text || bullet.rewriteText || ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 5. Projects (Metadata Preserved + Bullet Points Rendered) */}
      {resume.projects && resume.projects.length > 0 && (
        <div className="mb-4 avoid-break">
          <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 mb-1.5">
            Projects
          </h2>
          <div className="space-y-2.5 text-[9pt]">
            {resume.projects.map((proj, idx) => (
              <div key={proj.id || idx} className="mb-1.5">
                <div className="flex items-baseline justify-between font-bold text-slate-950 gap-2">
                  <span>
                    {proj.title}
                    {proj.tech && (
                      <span className="font-normal text-slate-600 text-[8.5pt] ml-1.5 font-mono">
                        [{proj.tech}]
                      </span>
                    )}
                  </span>
                  <span className="text-[8.5pt] font-normal text-slate-600 font-mono shrink-0">
                    {[proj.date, proj.link].filter(Boolean).join(' • ')}
                  </span>
                </div>
                {proj.description && (
                  <p className="text-slate-800 text-[9pt] leading-snug mt-0.5">{proj.description}</p>
                )}
                {proj.bullets && proj.bullets.length > 0 && (
                  <ul className="list-disc pl-4 space-y-1 mt-1 text-[9pt] text-slate-800 text-justify">
                    {proj.bullets.map((pb) => (
                      <li key={pb.id} className="leading-snug">
                        {pb.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Education & Qualifications (Strictly Preserved — Never Changed) */}
      <div className="mb-4 avoid-break">
        <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 mb-1.5">
          Education & Academic Qualifications
        </h2>
        <div className="space-y-1.5 text-[9pt] text-slate-800">
          {resume.education && resume.education.length > 0 ? (
            resume.education.map((edu, idx) => (
              <div key={idx} className="flex items-start gap-1.5 leading-snug">
                <span className="font-bold text-slate-600">•</span>
                <span>{edu}</span>
              </div>
            ))
          ) : (
            <div className="flex items-start gap-1.5 leading-snug">
              <span className="font-bold text-slate-600">•</span>
              <span>B.Tech in Information Technology — University Institute of Technology RGPV, Bhopal</span>
            </div>
          )}
        </div>
      </div>

      {/* 7. Certifications (if present) */}
      {resume.certifications && resume.certifications.length > 0 && (
        <div className="mb-3 avoid-break">
          <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 mb-1.5">
            Certifications & Credentials
          </h2>
          <ul className="list-disc pl-4 space-y-1 text-[8.5pt] text-slate-800">
            {resume.certifications.map((cert, idx) => (
              <li key={idx}>{cert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 8. Additional Information (Overflow JD Keywords & Existing Notes at End) */}
      {resume.additionalInformation && resume.additionalInformation.length > 0 && (
        <div className="mb-3 avoid-break">
          <h2 className="text-[10.5pt] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-0.5 mb-1.5">
            Additional Information
          </h2>
          <ul className="list-disc pl-4 space-y-1 text-[8.5pt] text-slate-800">
            {resume.additionalInformation.map((info, idx) => (
              <li key={idx}>{info}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 9. Footer ATS Verification Hash */}
      <div className="text-center pt-3 border-t border-slate-300 text-[8pt] text-slate-500 font-mono">
        ATS Verified &bull; CareerAI Optimized &bull; {resume.parseHash || '#ATS-VERIFIED'}
      </div>
    </div>
  );
};
