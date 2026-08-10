import Groq from 'groq-sdk';

/**
 * AI Service Layer — Groq (OpenAI-compatible SDK)
 * -----------------------------------------------
 * All LLM work is server-side only: GROQ_API_KEY lives in server/.env and is
 * never exposed to the frontend. The key is read once at module load; if it is
 * missing we fall back to deterministic mock data so the app stays demoable.
 *
 * Model strategy (keeps us inside Groq's free-tier limits):
 *  - REASONING_MODEL: heavy tasks (roadmap, interview feedback, resume rewrite)
 *  - FAST_MODEL: lightweight tasks (opening interview question) — lower cost,
 *    lower latency, frees the reasoning model quota for demo moments.
 *
 * Resilience:
 *  - 429 rate-limit and transient 5xx responses are retried with exponential
 *    backoff (Groq free tier is ~30 req/min, so bursts WILL hit 429s).
 *  - Structured JSON responses are parsed defensively: code fences are
 *    stripped, and a single regeneration is attempted on malformed output.
 */

let groq: Groq | null = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

const REASONING_MODEL = 'llama-3.3-70b-versatile';
const FAST_MODEL = 'llama-3.1-8b-instant';

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;

/** 429 = rate limited; 5xx = transient server-side failures worth retrying. */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface GroqChatParams {
  model: string;
  max_tokens: number;
  temperature: number;
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[];
}

/**
 * Wrapper around groq.chat.completions.create that retries rate-limit (429)
 * and transient server errors using capped exponential backoff. Because the
 * free tier throttles at ~30 req/min, concurrent demo requests will hit 429 —
 * this makes those self-healing instead of surfacing 500s to the UI.
 */
const createChatCompletion = async (params: GroqChatParams): Promise<string> => {
  if (!groq) {
    throw new Error('Groq client not initialized (missing GROQ_API_KEY)');
  }

  for (let attempt = 0; ; attempt++) {
    try {
      const response = await groq.chat.completions.create(params);
      return response.choices?.[0]?.message?.content || '';
    } catch (error: any) {
      const status = error?.status;
      // Undefined status = network error; also retry those (they're transient)
      const isRateLimited = (error?.error?.type ?? '').includes('rate_limit');
      const isRetryable = status === undefined || RETRYABLE_STATUS_CODES.has(status) || isRateLimited;

      if (!isRetryable || attempt >= MAX_RETRIES) {
        throw error;
      }

      const backoffMs = Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** attempt);
      console.warn(
        `Groq call failed (attempt ${attempt + 1}/${MAX_RETRIES}, status=${status ?? 'network'}). Retrying in ${backoffMs}ms.`
      );
      await delay(backoffMs);
    }
  }
};

/** Strips markdown code fences in case the model wraps its JSON answer. */
const extractJson = (rawText: string): string => {
  const match = rawText.trim().match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return match?.[1]?.trim() || rawText.trim();
};

/**
 * LLMs occasionally emit a truncated or verbosely-prefixed JSON blob. We parse
 * strictly; on failure we regenerate the response ONCE (models rarely fail
 * twice) before surfacing a clean error to the caller.
 */
const parseStructuredJson = async <T>(rawText: string, regenerate: () => Promise<string>): Promise<T> => {
  try {
    return JSON.parse(extractJson(rawText)) as T;
  } catch {
    console.warn('Groq returned malformed JSON; regenerating once.');
    const retryText = await regenerate();
    return JSON.parse(extractJson(retryText)) as T;
  }
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export interface GroqAnalysis {
  overallScore: number;
  detectedSkills: string[];
  sectionFeedback: Array<{
    section: string;
    feedback: string;
  }>;
  bulletRewrites: Array<{
    original: string;
    suggestion: string;
    reason: string;
  }>;
}

export const analyzeResumeWithGroq = async (resumeText: string): Promise<GroqAnalysis> => {
  if (!groq) {
    console.log('No GROQ_API_KEY found. Returning mock analysis.');
    return generateMockGroqAnalysis();
  }

  const prompt = `
    You are an elite technical recruiter and resume expert. Analyze the following resume text.
    You MUST respond with ONLY a valid JSON object. Do not include markdown formatting or any conversational text.
    
    The JSON object must perfectly match this schema:
    {
      "overallScore": <number between 0-100 based on resume strength>,
      "detectedSkills": [<array of extracted technical and soft skill strings>],
      "sectionFeedback": [
        {
          "section": "<e.g., Summary, Experience, Education>",
          "feedback": "<your critique and advice for this specific section>"
        }
      ],
      "bulletRewrites": [
        {
          "original": "<a weak bullet point found in the resume>",
          "suggestion": "<your rewritten, action-oriented version>",
          "reason": "<why the suggestion is better>"
        }
      ]
    }
    
    Resume Text:
    ${resumeText.substring(0, 10000)}
  `;

  const buildCall = () =>
    createChatCompletion({
      model: REASONING_MODEL,
      max_tokens: 1500,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

  const analysis = await parseStructuredJson<unknown>(await buildCall(), buildCall);

  // Light structural validation — protects the DB and client from malformed output
  if (
    !isObject(analysis) ||
    typeof analysis.overallScore !== 'number' ||
    !Array.isArray(analysis.detectedSkills)
  ) {
    throw new Error('AI returned an unexpected response shape for resume analysis');
  }

  return analysis as unknown as GroqAnalysis;
};

const generateMockGroqAnalysis = (): GroqAnalysis => {
  return {
    overallScore: 78,
    detectedSkills: ['JavaScript', 'React.js', 'Node.js', 'MongoDB', 'REST APIs', 'Agile Methodology'],
    sectionFeedback: [
      {
        section: 'Summary',
        feedback: 'The summary is a bit generic. Focus more on your specific achievements and the value you brought to previous roles rather than just listing technologies.'
      },
      {
        section: 'Experience',
        feedback: 'Good progression shown, but you need more quantifiable metrics. Did your work increase revenue, decrease load times, or save hours of manual work? Add those numbers.'
      }
    ],
    bulletRewrites: [
      {
        original: 'Worked on fixing bugs in the frontend application.',
        suggestion: 'Resolved 50+ critical frontend bugs in React, reducing crash rates by 15% and improving overall user retention.',
        reason: 'Adds specific numbers and highlights the business impact of the bug fixes.'
      },
      {
        original: 'Helped the backend team with API design.',
        suggestion: 'Collaborated with the backend engineering team to design and implement RESTful APIs using Node.js and Express.',
        reason: 'Uses stronger verbs and specifies the technologies involved.'
      }
    ]
  };
};

export interface GroqRoadmapMonth {
  monthNumber: number;
  focusArea: string;
  estimatedHours: number;
  topics: string[];
  resources: string[];
  projects: string[];
  tasks: Array<{ description: string }>;
}

export const generateRoadmapWithGroq = async (targetRole: string, missingSkills: string[]): Promise<GroqRoadmapMonth[]> => {
  if (!groq) {
    console.log('No GROQ_API_KEY found. Returning mock roadmap.');
    return generateMockRoadmap(targetRole, missingSkills);
  }

  const prompt = `
    You are an expert technical career coach. Create a structured, month-by-month learning roadmap 
    for someone who wants to become a "${targetRole}". 
    
    They already have some skills, but they are MISSING the following skills:
    [${missingSkills.join(', ')}]
    
    Create a 3-month roadmap focused on learning these exact missing skills.
    You MUST respond with ONLY a valid JSON array of objects. Do not include markdown formatting.
    
    The JSON array must perfectly match this schema:
    [
      {
        "monthNumber": <number>,
        "focusArea": "<short string describing the month's theme>",
        "estimatedHours": <number of hours per week>,
        "topics": ["<topic 1>", "<topic 2>"],
        "resources": ["<Specific course, book, or docs to read>"],
        "projects": ["<Name of a mini project to build>"],
        "tasks": [
          { "description": "<Actionable checklist item 1>" },
          { "description": "<Actionable checklist item 2>" }
        ]
      }
    ]
  `;

  const buildCall = () =>
    createChatCompletion({
      model: REASONING_MODEL,
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

  const roadmap = await parseStructuredJson<unknown>(await buildCall(), buildCall);

  if (!Array.isArray(roadmap) || roadmap.length === 0) {
    throw new Error('AI returned an unexpected response shape for roadmap generation');
  }

  return roadmap as GroqRoadmapMonth[];
};

const generateMockRoadmap = (targetRole: string, missingSkills: string[]): GroqRoadmapMonth[] => {
  // If there are no missing skills or just 1, we still generate a robust 3-month plan
  const primarySkill = missingSkills.length > 0 ? missingSkills[0] : 'Core Technologies';
  const secondarySkill = missingSkills.length > 1 ? missingSkills[1] : 'Advanced Architecture';

  return [
    {
      monthNumber: 1,
      focusArea: `Fundamentals of ${primarySkill}`,
      estimatedHours: 15,
      topics: [
        `Syntax and Basics of ${primarySkill}`,
        'Core concepts and lifecycle',
        'Best practices and design patterns'
      ],
      resources: [
        `Official ${primarySkill} Documentation`,
        `"Deep Dive into ${primarySkill}" on Udemy`,
        'FreeCodeCamp Interactive Tutorials'
      ],
      projects: [
        `Build a simple CLI tool using ${primarySkill}`,
        'Create a basic CRUD application'
      ],
      tasks: [
        { description: `Complete chapters 1-3 of the ${primarySkill} docs` },
        { description: `Set up a local development environment for ${primarySkill}` },
        { description: 'Deploy the CLI tool to GitHub' }
      ]
    },
    {
      monthNumber: 2,
      focusArea: `Mastering ${secondarySkill} & Integration`,
      estimatedHours: 20,
      topics: [
        `Advanced ${secondarySkill} concepts`,
        `Connecting ${primarySkill} with ${secondarySkill}`,
        'State management and data flow'
      ],
      resources: [
        `Advanced ${secondarySkill} Patterns by TechTalks`,
        'Frontend Masters Architecture course'
      ],
      projects: [
        `Build a full-stack dashboard utilizing ${secondarySkill}`
      ],
      tasks: [
        { description: `Implement authentication with ${secondarySkill}` },
        { description: 'Write at least 10 unit tests for the dashboard' },
        { description: 'Optimize database queries' }
      ]
    },
    {
      monthNumber: 3,
      focusArea: `Preparing for ${targetRole} Interviews`,
      estimatedHours: 10,
      topics: [
        'System Design for Scale',
        'Common Interview Questions',
        'Resume polishing'
      ],
      resources: [
        'Grokking the System Design Interview',
        'LeetCode Top 100 questions'
      ],
      projects: [
        'Open source contribution',
        'Portfolio website revamp'
      ],
      tasks: [
        { description: 'Complete 10 medium algorithms on LeetCode' },
        { description: 'Do a mock interview with a peer' },
        { description: `Apply to 5 entry-level ${targetRole} positions` }
      ]
    }
  ];
};

export interface GroqInterviewEvaluation {
  evaluation: {
    strengths: string;
    improvements: string;
    modelAnswer: string;
    score: number;
  };
  nextQuestion: string;
  isOver: boolean;
}

export const evaluateInterviewAnswerWithGroq = async (
  targetRole: string,
  chatHistory: Array<{ role: string, content: string }>,
  latestAnswer: string
): Promise<GroqInterviewEvaluation> => {
  if (!groq) {
    console.log('No GROQ_API_KEY found. Returning mock Interview Evaluation.');
    return generateMockInterviewEvaluation(targetRole, chatHistory, latestAnswer);
  }

  const answerCount = chatHistory.filter(m => m.role === 'user').length + 1;
  const isOver = answerCount >= 3;

  const prompt = `
    You are an expert technical interviewer conducting a mock interview for the role of "${targetRole}".
    
    Here is the chat history so far:
    ${JSON.stringify(chatHistory)}
    
    The user just answered the last question with:
    "${latestAnswer}"
    
    Evaluate their answer. Provide strengths, areas for improvement, a model answer, and a score out of 100.
    ${isOver ? 'This is the final question. Do not ask another question.' : 'Then, ask the NEXT technical question related to the role.'}
    
    You MUST respond with ONLY a valid JSON object matching this schema perfectly:
    {
      "evaluation": {
        "strengths": "<short positive feedback>",
        "improvements": "<what they missed>",
        "modelAnswer": "<the ideal succinct answer>",
        "score": <0-100>
      },
      "nextQuestion": "${isOver ? 'Thank you! The interview is complete.' : '<The next question>'}",
      "isOver": ${isOver}
    }
  `;

  const buildCall = () =>
    createChatCompletion({
      model: REASONING_MODEL,
      max_tokens: 1500,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });

  const evaluation = await parseStructuredJson<unknown>(await buildCall(), buildCall);

  if (!isObject(evaluation) || !isObject(evaluation.evaluation) || typeof evaluation.isOver !== 'boolean') {
    throw new Error('AI returned an unexpected response shape for interview evaluation');
  }

  return evaluation as unknown as GroqInterviewEvaluation;
};

const generateMockInterviewEvaluation = (
  targetRole: string,
  chatHistory: Array<{ role: string, content: string }>,
  latestAnswer: string
): GroqInterviewEvaluation => {
  const answerCount = chatHistory.filter(m => m.role === 'user').length + 1;
  const isOver = answerCount >= 3;

  const score = latestAnswer.length > 50 ? 85 : 45;

  const endingQuestion = 'Thank you! The interview is complete.';

  const questions: [string, string, string] = [
    `Can you explain how you would design a scalable backend for a high-traffic e-commerce site as a ${targetRole}?`,
    `Describe a time you had to debug a complex race condition. How did you handle it?`,
    endingQuestion
  ];

  return {
    evaluation: {
      strengths: latestAnswer.length > 50 ? 'Good level of detail and solid understanding of core concepts.' : 'You got to the point quickly.',
      improvements: latestAnswer.length > 50 ? 'Try to structure your answer more clearly using the STAR method.' : 'Your answer was too brief. Elaborate on the specific technologies and tradeoffs.',
      modelAnswer: `A strong answer would be: "I would use a microservices architecture with a load balancer, caching layer (Redis), and a message queue (RabbitMQ) to handle traffic spikes smoothly."`,
      score
    },
    // Safe fallback guards the out-of-range index (noUncheckedIndexedAccess)
    nextQuestion: isOver ? endingQuestion : (questions[answerCount] ?? `Walk me through your motivation for becoming a ${targetRole}.`),
    isOver
  };
};

/**
 * Lightweight keyword/skill extraction (ATS module, Phase B).
 * Runs on the fast model deliberately: it's a high-frequency, low-stakes call
 * and must not consume the reasoning model's rate-limit budget.
 * Returns null when no API key is present so the caller can fall back to its
 * deterministic rule-based extractor.
 */
export const extractKeywordsWithGroq = async (text: string): Promise<string[] | null> => {
  if (!groq) {
    console.log('No GROQ_API_KEY found. Returning null for keyword extraction.');
    return null;
  }

  const prompt = `
    From the following text, extract the top 25 most relevant technical skills,
    tools, technologies, and professional keywords. Return ONLY a valid JSON array
    of strings like ["JavaScript", "Node.js", "AWS"]. No markdown, no extra text.
    Prefer single concepts; skip generic filler words.

    Text:
    ${text.substring(0, 8000)}
  `;

  const buildCall = () =>
    createChatCompletion({
      model: FAST_MODEL,
      max_tokens: 400,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

  const result = await parseStructuredJson<unknown>(await buildCall(), buildCall);

  if (!Array.isArray(result)) {
    throw new Error('AI returned an unexpected response shape for keyword extraction');
  }

  return result.filter((item): item is string => typeof item === 'string').slice(0, 30);
};

export const getInitialInterviewQuestion = async (targetRole: string): Promise<string> => {
  if (!groq) {
    return `Welcome to your mock interview for the ${targetRole} position! Let's start with a foundational question: Can you describe your experience with the core technologies used in this role and how you keep your skills up to date?`;
  }

  const prompt = `You are interviewing a candidate for a "${targetRole}" role. Ask them a strong, open-ended introductory technical question to start the interview. Return ONLY the string question, no JSON, no quotes.`;

  try {
    // Lightweight task: fast model keeps this snappy and preserves reasoning-model quota
    return await createChatCompletion({
      model: FAST_MODEL,
      max_tokens: 500,
      temperature: 0.5,
      messages: [{ role: 'user', content: prompt }],
    }) || `Can you describe your experience and why you are a good fit for the ${targetRole} role?`;
  } catch (error) {
    console.warn('Failed to generate initial interview question:', error);
    return `Can you describe your experience and why you are a good fit for the ${targetRole} role?`;
  }
};