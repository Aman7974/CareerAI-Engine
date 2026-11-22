/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResumeData } from '../types';

/**
 * Downloads the resume as a formatted ATS Plain-Text file (.txt)
 * Upholding complete structure, project metadata + bullet points, and Additional Information at the bottom.
 */
export function downloadResumeAsTxt(resume: ResumeData): void {
  let content = `${resume.candidateName.toUpperCase()}\n`;
  content += `${'='.repeat(resume.candidateName.length)}\n`;
  if (resume.contactInfo) content += `${resume.contactInfo}\n`;
  if (resume.headline) content += `${resume.headline}\n`;
  content += `\n`;

  if (resume.executiveProfile && resume.executiveProfile.trim()) {
    content += `SUMMARY\n`;
    content += `${'-'.repeat(7)}\n`;
    content += `${resume.executiveProfile.trim()}\n\n`;
  }

  if (resume.skills && resume.skills.length > 0) {
    content += `TECHNICAL SKILLS & CORE COMPETENCIES\n`;
    content += `${'-'.repeat(36)}\n`;
    content += `${resume.skills.join(' • ')}\n\n`;
  }

  if (resume.workExperience && resume.workExperience.length > 0) {
    content += `EXPERIENCE\n`;
    content += `${'-'.repeat(10)}\n`;
    for (const exp of resume.workExperience) {
      content += `${exp.title} | ${exp.company} | ${exp.period}\n`;
      for (const b of exp.bullets) {
        const text = (b.text || '').trim();
        if (text) content += `  • ${text}\n`;
      }
      content += `\n`;
    }
  }

  if (resume.projects && resume.projects.length > 0) {
    content += `PROJECTS\n`;
    content += `${'-'.repeat(8)}\n`;
    for (const proj of resume.projects) {
      const metaParts = [proj.title];
      if (proj.date) metaParts.push(proj.date);
      if (proj.link) metaParts.push(proj.link);
      content += `${metaParts.join(' | ')}\n`;
      if (proj.tech) content += `Technologies: ${proj.tech}\n`;
      if (proj.description && proj.description.trim()) {
        content += `${proj.description.trim()}\n`;
      }
      if (proj.bullets && proj.bullets.length > 0) {
        for (const pb of proj.bullets) {
          if (pb.text.trim()) content += `  • ${pb.text.trim()}\n`;
        }
      }
      content += `\n`;
    }
  }

  if (resume.education && resume.education.length > 0) {
    content += `EDUCATION & QUALIFICATIONS\n`;
    content += `${'-'.repeat(26)}\n`;
    for (const edu of resume.education) {
      content += `  • ${edu.trim()}\n`;
    }
    content += `\n`;
  }

  if (resume.certifications && resume.certifications.length > 0) {
    content += `CERTIFICATIONS & CREDENTIALS\n`;
    content += `${'-'.repeat(27)}\n`;
    for (const cert of resume.certifications) {
      content += `  • ${cert.trim()}\n`;
    }
    content += `\n`;
  }

  if (resume.additionalInformation && resume.additionalInformation.length > 0) {
    content += `ADDITIONAL INFORMATION\n`;
    content += `${'-'.repeat(22)}\n`;
    for (const info of resume.additionalInformation) {
      content += `  • ${info.trim()}\n`;
    }
    content += `\n`;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${resume.candidateName.trim().replace(/\s+/g, '_')}_Tailored_Resume.txt`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads the resume as an ATS-formatted Microsoft Word Document (.doc)
 */
export function downloadResumeAsDoc(resume: ResumeData): void {
  const educationHtml =
    resume.education && resume.education.length > 0
      ? `
      <div class="section-title">EDUCATION & QUALIFICATIONS</div>
      <ul>
        ${resume.education.map((edu) => `<li>${edu}</li>`).join('')}
      </ul>`
      : '';

  const certificationsHtml =
    resume.certifications && resume.certifications.length > 0
      ? `
      <div class="section-title">CERTIFICATIONS</div>
      <ul>
        ${resume.certifications.map((c) => `<li>${c}</li>`).join('')}
      </ul>`
      : '';

  const additionalInfoHtml =
    resume.additionalInformation && resume.additionalInformation.length > 0
      ? `
      <div class="section-title">ADDITIONAL INFORMATION</div>
      <ul>
        ${resume.additionalInformation.map((info) => `<li>${info}</li>`).join('')}
      </ul>`
      : '';

  const projectsHtml =
    resume.projects && resume.projects.length > 0
      ? `
      <div class="section-title">PROJECTS</div>
      ${resume.projects
        .map(
          (p) => `
        <div style="margin-bottom: 8pt;">
          <strong>${p.title}</strong> ${p.date ? `<span style="color:#555;">(${p.date})</span>` : ''} ${p.link ? `<span style="color:#0284c7;">• ${p.link}</span>` : ''} ${p.tech ? `<span style="color:#555;">[${p.tech}]</span>` : ''}
          ${p.description ? `<p style="margin: 2pt 0 3pt 0;">${p.description}</p>` : ''}
          ${
            p.bullets && p.bullets.length > 0
              ? `<ul>${p.bullets.map((pb) => `<li>${pb.text}</li>`).join('')}</ul>`
              : ''
          }
        </div>`
        )
        .join('')}`
      : '';

  const experienceHtml =
    resume.workExperience && resume.workExperience.length > 0
      ? `
      <div class="section-title">EXPERIENCE</div>
      ${resume.workExperience
        .map(
          (exp) => `
      <div style="margin-bottom: 10pt;">
        <table style="width: 100%; border: none; margin-bottom: 2pt;">
          <tr>
            <td style="font-weight: bold; font-size: 11pt;">${exp.title} | ${exp.company}</td>
            <td style="text-align: right; color: #555; font-size: 10pt;">${exp.period}</td>
          </tr>
        </table>
        <ul>
          ${exp.bullets.map((b) => `<li>${b.text || b.rewriteText || ''}</li>`).join('')}
        </ul>
      </div>`
        )
        .join('')}`
      : '';

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${resume.candidateName} - Resume</title>
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 10.5pt; line-height: 1.35; color: #111; margin: 20mm; }
        h1 { font-size: 18pt; text-align: center; text-transform: uppercase; margin: 0 0 4pt 0; letter-spacing: 0.5pt; }
        .contact { text-align: center; font-size: 9.5pt; color: #333; margin-bottom: 3pt; }
        .headline { text-align: center; font-size: 10.5pt; font-weight: bold; color: #0284c7; text-transform: uppercase; margin-bottom: 12pt; }
        .section-title { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; border-bottom: 1.5pt solid #111; padding-bottom: 2pt; margin: 12pt 0 6pt 0; color: #111; }
        ul { margin: 2pt 0 6pt 16pt; padding: 0; }
        li { margin-bottom: 2.5pt; }
      </style>
    </head>
    <body>
      <h1>${resume.candidateName}</h1>
      <div class="contact">${resume.contactInfo || ''}</div>
      <div class="headline">${resume.headline || 'Software Engineer'}</div>

      ${
        resume.executiveProfile && resume.executiveProfile.trim()
          ? `<div class="section-title">SUMMARY</div><p>${resume.executiveProfile}</p>`
          : ''
      }

      <div class="section-title">TECHNICAL SKILLS</div>
      <p>${resume.skills.join(' • ')}</p>

      ${experienceHtml}
      ${projectsHtml}
      ${educationHtml}
      ${certificationsHtml}
      ${additionalInfoHtml}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${resume.candidateName.trim().replace(/\s+/g, '_')}_Tailored_Resume.doc`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers clean, direct Print-to-PDF in the system
 */
export function downloadResumeAsPdf(resume: ResumeData): void {
  if (typeof window !== 'undefined') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const educationHtml =
      resume.education && resume.education.length > 0
        ? `
        <div class="section-title">EDUCATION & QUALIFICATIONS</div>
        <div class="education-list">
          ${resume.education.map((edu) => `<div class="bullet-item">• ${edu}</div>`).join('')}
        </div>`
        : '';

    const certificationsHtml =
      resume.certifications && resume.certifications.length > 0
        ? `
        <div class="section-title">CERTIFICATIONS</div>
        <div class="education-list">
          ${resume.certifications.map((c) => `<div class="bullet-item">• ${c}</div>`).join('')}
        </div>`
        : '';

    const additionalInfoHtml =
      resume.additionalInformation && resume.additionalInformation.length > 0
        ? `
        <div class="section-title">ADDITIONAL INFORMATION</div>
        <div class="education-list">
          ${resume.additionalInformation.map((info) => `<div class="bullet-item">• ${info}</div>`).join('')}
        </div>`
        : '';

    const projectsHtml =
      resume.projects && resume.projects.length > 0
        ? `
        <div class="section-title">PROJECTS</div>
        ${resume.projects
          .map(
            (p) => `
          <div class="project-item">
            <div class="project-header">
              <span>
                <span class="project-title">${p.title}</span>
                ${p.tech ? `<span class="project-tech">[${p.tech}]</span>` : ''}
              </span>
              <span class="exp-period">${[p.date, p.link].filter(Boolean).join(' • ')}</span>
            </div>
            ${p.description ? `<p class="project-desc">${p.description}</p>` : ''}
            ${
              p.bullets && p.bullets.length > 0
                ? `<div class="bullet-list">${p.bullets
                    .map((pb) => `<div class="bullet-item">• ${pb.text}</div>`)
                    .join('')}</div>`
                : ''
            }
          </div>`
          )
          .join('')}`
        : '';

    const experienceHtml =
      resume.workExperience && resume.workExperience.length > 0
        ? `
        <div class="section-title">EXPERIENCE</div>
        ${resume.workExperience
          .map(
            (exp) => `
          <div class="experience-item">
            <div class="exp-header">
              <span class="exp-role">${exp.title} | ${exp.company}</span>
              <span class="exp-period">${exp.period}</span>
            </div>
            <div class="bullet-list">
              ${exp.bullets
                .map((b) => `<div class="bullet-item">• ${b.text || b.rewriteText || ''}</div>`)
                .join('')}
            </div>
          </div>`
          )
          .join('')}`
        : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${resume.candidateName} - Tailored Resume</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a; background: #fff; margin: 0; padding: 0; line-height: 1.4; font-size: 10pt;
          }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
          .name { font-size: 20pt; font-weight: 800; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
          .contact { font-size: 9.5pt; color: #475569; margin-top: 3px; font-weight: 500; }
          .role { font-size: 11pt; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-top: 3px; }
          .section-title {
            font-size: 10.5pt; font-weight: 700; text-transform: uppercase;
            border-bottom: 1px solid #94a3b8; padding-bottom: 2px; margin: 10px 0 6px 0; letter-spacing: 0.5px;
          }
          .skills-cloud { font-size: 9.5pt; line-height: 1.5; color: #1e293b; }
          .experience-item, .project-item { margin-bottom: 8px; page-break-inside: avoid; }
          .exp-header, .project-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 10pt; gap: 8px; }
          .exp-period { color: #64748b; font-family: monospace; font-size: 8.5pt; }
          .project-tech { color: #0284c7; font-size: 9pt; font-weight: 600; margin-left: 6px; }
          .project-desc { font-size: 9pt; margin: 2px 0 4px 0; color: #334155; }
          .bullet-list { margin-top: 2px; }
          .bullet-item { font-size: 9pt; color: #1e293b; margin-bottom: 2px; text-align: justify; line-height: 1.35; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="name">${resume.candidateName}</div>
          <div class="contact">${resume.contactInfo || ''}</div>
          <div class="role">${resume.headline || 'Software Engineer'}</div>
        </div>

        ${
          resume.executiveProfile && resume.executiveProfile.trim()
            ? `<div class="section-title">SUMMARY</div>
               <div style="font-size: 9.5pt; text-align: justify; color: #1e293b;">${resume.executiveProfile}</div>`
            : ''
        }

        <div class="section-title">TECHNICAL SKILLS</div>
        <div class="skills-cloud">
          ${resume.skills.map((s) => `<strong>•</strong> ${s}`).join('&nbsp;&nbsp;&nbsp;')}
        </div>

        ${experienceHtml}
        ${projectsHtml}
        ${educationHtml}
        ${certificationsHtml}
        ${additionalInfoHtml}

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
