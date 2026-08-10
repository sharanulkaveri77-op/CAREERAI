import { describe, expect, it } from '@jest/globals';
import { buildResumeReportPdf, buildRoadmapPdf } from '../export.service';
import type { IUser } from '../../models/User';
import type { IResumeAnalysis } from '../../models/ResumeAnalysis';

// pdf-parse v2's runtime shape (class PDFParse) differs from its @types (v1 callable API).
// The app's parser.service.ts uses the same `new PDFParse({ data })` pattern.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFParse: new (opts: { data: Buffer }) => { getText(): Promise<{ text: string }> } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('pdf-parse').PDFParse;

const textOf = async (buffer: Buffer): Promise<string> => {
  const result = await new PDFParse({ data: buffer }).getText();
  // Collapse wrapped line breaks so layout-dependent assertions stay stable
  return result.text.replace(/\s+/g, ' ').trim();
};

const fakeUser = {
  name: 'Priya Sharma',
  targetJobRole: 'QA Engineer',
  experienceLevel: 'Mid',
} as IUser;

const fakeAnalysis = {
  overallScore: 87,
  detectedSkills: ['Java', 'Selenium', 'Test Automation'],
  sectionFeedback: [
    { section: 'Professional Summary', feedback: 'Add measurable impact metrics.' },
    { section: 'Experience', feedback: 'Start bullets with strong action verbs.' },
  ],
  bulletRewrites: [
    {
      original: 'Handled testing for multiple projects.',
      suggestion: 'Led end-to-end test automation for 3 projects, cutting release defects by 30%.',
      reason: 'Quantify impact and lead with an action verb.',
    },
  ],
  resumeText:
    'Priya Sharma\npriya@example.com\nQA Engineer with 5 years of experience.\nSKILLS\nJava Selenium SQL\nEXPERIENCE\nSenior QA Engineer, TechCorp\n- Automated regression suites in Selenium.',
  createdAt: new Date('2026-01-15'),
} as unknown as IResumeAnalysis;

const fakeRoadmap = {
  targetRole: 'QA Engineer',
  overallProgress: 25,
  months: [
    {
      monthNumber: 1,
      focusArea: 'Test Automation Foundations',
      estimatedHours: 40,
      topics: ['Selenium WebDriver', 'Test Frameworks'],
      resources: ['Automation Guild docs'],
      projects: ['Resume parser test suite'],
      tasks: [
        { description: 'Learn Selenium basics', isCompleted: true },
        { description: 'Build a test harness', isCompleted: false },
        { description: 'Write 5 test cases', isCompleted: false },
      ],
    },
    {
      monthNumber: 2,
      focusArea: 'CI/CD and API Testing',
      estimatedHours: 35,
      topics: ['REST Assured', 'GitHub Actions'],
      resources: ['Postman API course'],
      projects: ['API smoke suite'],
      tasks: [
        { description: 'Automate API checks', isCompleted: false },
        { description: 'Wire tests into CI', isCompleted: false },
      ],
    },
  ],
} as unknown as Parameters<typeof buildRoadmapPdf>[1];

describe('PDF export builders', () => {
  it('produces a valid resume report PDF with all key sections', async () => {
    const buffer = await buildResumeReportPdf(fakeUser, fakeAnalysis);

    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.subarray(-6).toString()).toContain('%%EOF');

    const text = await textOf(buffer);
    expect(text).toContain('Resume Report');
    expect(text).toContain('Overall Score 87%');
    expect(text).toContain('ATS Structure Score');
    expect(text).toContain('Priya Sharma');
    expect(text).toContain('Led end-to-end test automation for 3 projects');
    expect(text).toContain('Quantify impact and lead with an action verb');
  });

  it('produces a valid multi-month roadmap PDF', async () => {
    const buffer = await buildRoadmapPdf(fakeUser, fakeRoadmap);

    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');

    const text = await textOf(buffer);
    expect(text).toContain('Career Roadmap');
    expect(text).toContain('target: QA Engineer');
    expect(text).toContain('Month 1 — Test Automation Foundations');
    expect(text).toContain('Month 2 — CI/CD and API Testing');
    expect(text).toContain('1/3 tasks completed');
    expect(text).toContain('Learn Selenium basics');
    expect(text).toContain('Wire tests into CI');
    expect(text).toContain('REST Assured');
  });
});