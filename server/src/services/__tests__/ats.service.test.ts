import { describe, expect, it } from '@jest/globals';
import {
  buildAtsReport,
  buildKeywordRegex,
  calculateKeywordMatch,
  checkContactInformation,
  checkLength,
  checkStandardSections,
  checkTableLayout,
  countWords,
  extractKeywordsRuleBased,
  normalizeKeyword,
  MIN_RESUME_WORDS_LIMIT,
} from '../ats.service';

const SAMPLE_GOOD_RESUME = `
John Doe
john.doe@example.com
+1 (555) 123-4567
linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Full-stack software engineer with 6+ years of experience designing, building and scaling web
applications. Passionate about clean architecture, developer experience and measurable business
impact. Comfortable owning features end-to-end from database schema design to production rollout.

EXPERIENCE
Senior Software Engineer, Acme Corp (2021 - Present)
- Built scalable React/Node.js services handling 2M requests/day.
- Led migration from monolithic to microservices architecture on AWS.
- Introduced CI/CD pipelines with GitHub Actions, cutting release time from days to hours.
- Mentored four junior engineers and ran the team's technical interview loop.
Software Engineer, Widgets Inc (2018 - 2021)
- Developed user-facing features in React and TypeScript with a focus on accessibility.
- Built REST APIs in Node.js and Express backed by MongoDB and Redis caching.
- Reduced page load times by 45% through code-splitting and bundler tuning.
- Participated in on-call rotation, owning incident response and post-mortems.

EDUCATION
B.Sc. Computer Science, State University (2014 - 2018)
- Graduated with honors, GPA 8.9/10.
- Led the university hackathon team to a national final.

SKILLS
JavaScript, TypeScript, React, Node.js, Express, MongoDB, PostgreSQL, Redis, AWS, Docker,
Kubernetes, GraphQL, CI/CD, Jest, Git, Agile, Scrum

CERTIFICATIONS
- AWS Certified Solutions Architect - Associate (2022)
- MongoDB Developer Certification (2021)
`;

describe('ATS Service — rule-based checks', () => {
  describe('checkStandardSections', () => {
    it('detects all three standard section headers', () => {
      const checks = checkStandardSections(SAMPLE_GOOD_RESUME);
      expect(checks.every((c) => c.passed)).toBe(true);
    });

    it('fails when headers are missing', () => {
      const checks = checkStandardSections('Just a summary with no clear structure.');
      expect(checks.every((c) => !c.passed)).toBe(true);
    });
  });

  describe('checkContactInformation', () => {
    it('passes email, phone and social links when present', () => {
      const checks = checkContactInformation(SAMPLE_GOOD_RESUME);
      expect(checks.every((c) => c.passed)).toBe(true);
    });

    it('flags missing contact info', () => {
      const checks = checkContactInformation('No contact details whatsoever in this body text.');
      expect(checks.every((c) => !c.passed)).toBe(true);
    });
  });

  describe('checkTableLayout', () => {
    it('flags tab-separated table rows', () => {
      const report = checkTableLayout('Skills:\tJava\tSpring\tSQL\nTools:\tIntelliJ\tJenkins\tJira\nDBs:\tPostgres\tMongo\tRedis');
      expect(report.passed).toBe(false);
    });

    it('passes plain single-column prose', () => {
      const lines = Array.from({ length: 10 }, (_, i) => `Wrote clean, single-column content for line ${i}.`).join('\n');
      expect(checkTableLayout(lines).passed).toBe(true);
    });
  });

  describe('checkLength', () => {
    it('passes substantial resumes and fails tiny ones', () => {
      expect(checkLength(SAMPLE_GOOD_RESUME).passed).toBe(true);
      expect(checkLength('Tiny resume.').passed).toBe(false);
      expect(MIN_RESUME_WORDS_LIMIT).toBe(150);
    });
  });

  describe('countWords', () => {
    it('counts whitespace-separated words', () => {
      expect(countWords('one two  three\nfour')).toBe(4);
    });
  });
});

describe('ATS Service — keyword matching', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeKeyword(' Node.js ')).toBe('node.js');
    expect(normalizeKeyword('React   Native')).toBe('react native');
  });

  it('uses word boundaries so "excel" does not match "excellent"', () => {
    expect(buildKeywordRegex('excel').test('Proficient in Excel')).toBe(true);
    expect(buildKeywordRegex('excel').test('Excellent communication skills')).toBe(false);
  });

  it('falls back to substring matching for special-char keywords', () => {
    expect(buildKeywordRegex('c++').test('C++ and STL')).toBe(true);
    expect(buildKeywordRegex('.net').test('ASP.NET Core')).toBe(true);
  });

  it('computes match rate, matched and missing lists', () => {
    const result = calculateKeywordMatch(SAMPLE_GOOD_RESUME, ['React', 'AWS', 'Kafka', 'Excel']);
    expect(result.rate).toBeCloseTo(0.5, 5);
    expect(result.matched).toContain('React');
    expect(result.missing).toEqual(['Kafka', 'Excel']);
  });

  it('extracts a bounded, deduplicated keyword list in rule-based mode', () => {
    const keywords = extractKeywordsRuleBased('Skills: Java, Spring, SQL, Java, Docker, Kafka, React Native');
    expect(keywords).toContain('java');
    expect(new Set(keywords).size).toBe(keywords.length);
    expect(keywords.length).toBeLessThanOrEqual(6);
  });
});

describe('ATS Service — full report scoring', () => {
  it('scores a strong structural resume near 100 without a JD', () => {
    const report = buildAtsReport(SAMPLE_GOOD_RESUME, []);
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.keywordMatchRate).toBeNull();
    expect(report.comparedAgainstJd).toBe(false);
  });

  it('scores an empty-ish resume very low', () => {
    const report = buildAtsReport('just a couple of words', []);
    expect(report.score).toBeLessThan(40);
  });

  it('incorporates keyword coverage when a JD keyword set is provided', () => {
    const report = buildAtsReport(SAMPLE_GOOD_RESUME, ['React', 'Node.js', 'MongoDB', 'Python']);
    expect(report.comparedAgainstJd).toBe(true);
    expect(report.keywordMatchRate).toBeCloseTo(0.75, 5);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.checks.find((c) => c.key === 'keywords')).toBeDefined();
  });

  it('keeps every score within 0-100 bounds', () => {
    const a = buildAtsReport(SAMPLE_GOOD_RESUME, []);
    const b = buildAtsReport('x', []);
    const c = buildAtsReport(SAMPLE_GOOD_RESUME, ['foo', 'bar']);
    for (const report of [a, b, c]) {
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
    }
  });
});