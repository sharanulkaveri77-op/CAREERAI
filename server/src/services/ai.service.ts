import Anthropic from '@anthropic-ai/sdk';

let anthropic: Anthropic | null = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

export interface ClaudeAnalysis {
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

export const analyzeResumeWithClaude = async (resumeText: string): Promise<ClaudeAnalysis> => {
  if (!anthropic) {
    console.log('No ANTHROPIC_API_KEY found. Returning mock Claude analysis.');
    return generateMockClaudeAnalysis();
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

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1500,
      temperature: 0,
      messages: [{ role: "user", content: prompt }]
    });

    // @ts-ignore - The response content is an array of content blocks, we extract the text
    const rawText = response.content[0].text;

    // Clean up potential markdown formatting from the AI response
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJsonText);

    return parsedData as ClaudeAnalysis;
  } catch (error) {
    console.error('Claude API failed:', error);
    throw new Error('Failed to analyze resume with Claude AI');
  }
};

const generateMockClaudeAnalysis = (): ClaudeAnalysis => {
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

export interface ClaudeRoadmapMonth {
  monthNumber: number;
  focusArea: string;
  estimatedHours: number;
  topics: string[];
  resources: string[];
  projects: string[];
  tasks: Array<{ description: string }>;
}

export const generateRoadmapWithClaude = async (targetRole: string, missingSkills: string[]): Promise<ClaudeRoadmapMonth[]> => {
  if (!anthropic) {
    console.log('No ANTHROPIC_API_KEY found. Returning mock Claude roadmap.');
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

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    });

    // @ts-ignore
    const rawText = response.content[0].text;
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJsonText) as ClaudeRoadmapMonth[];
  } catch (error) {
    console.error('Claude API failed:', error);
    throw new Error('Failed to generate roadmap with Claude AI');
  }
};

const generateMockRoadmap = (targetRole: string, missingSkills: string[]): ClaudeRoadmapMonth[] => {
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

export interface ClaudeInterviewEvaluation {
  evaluation: {
    strengths: string;
    improvements: string;
    modelAnswer: string;
    score: number;
  };
  nextQuestion: string;
  isOver: boolean;
}

export const evaluateInterviewAnswerWithClaude = async (
  targetRole: string, 
  chatHistory: Array<{ role: string, content: string }>, 
  latestAnswer: string
): Promise<ClaudeInterviewEvaluation> => {
  
  if (!anthropic) {
    console.log('No ANTHROPIC_API_KEY found. Returning mock Interview Evaluation.');
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

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1500,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }]
    });

    // @ts-ignore
    const rawText = response.content[0].text;
    const cleanJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJsonText) as ClaudeInterviewEvaluation;
  } catch (error) {
    console.error('Claude API failed:', error);
    throw new Error('Failed to evaluate interview answer with Claude AI');
  }
};

const generateMockInterviewEvaluation = (
  targetRole: string, 
  chatHistory: Array<{ role: string, content: string }>, 
  latestAnswer: string
): ClaudeInterviewEvaluation => {
  const answerCount = chatHistory.filter(m => m.role === 'user').length + 1;
  const isOver = answerCount >= 3;

  const score = latestAnswer.length > 50 ? 85 : 45;

  const questions = [
    `Can you explain how you would design a scalable backend for a high-traffic e-commerce site as a ${targetRole}?`,
    `Describe a time you had to debug a complex race condition. How did you handle it?`,
    `Thank you! The interview is complete.` // End
  ];

  return {
    evaluation: {
      strengths: latestAnswer.length > 50 ? 'Good level of detail and solid understanding of core concepts.' : 'You got to the point quickly.',
      improvements: latestAnswer.length > 50 ? 'Try to structure your answer more clearly using the STAR method.' : 'Your answer was too brief. Elaborate on the specific technologies and tradeoffs.',
      modelAnswer: `A strong answer would be: "I would use a microservices architecture with a load balancer, caching layer (Redis), and a message queue (RabbitMQ) to handle traffic spikes smoothly."`,
      score
    },
    nextQuestion: isOver ? questions[2] : questions[answerCount],
    isOver
  };
};

export const getInitialInterviewQuestion = async (targetRole: string): Promise<string> => {
  if (!anthropic) {
    return `Welcome to your mock interview for the ${targetRole} position! Let's start with a foundational question: Can you describe your experience with the core technologies used in this role and how you keep your skills up to date?`;
  }

  const prompt = `You are interviewing a candidate for a "${targetRole}" role. Ask them a strong, open-ended introductory technical question to start the interview. Return ONLY the string question, no JSON, no quotes.`;
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      temperature: 0.5,
      messages: [{ role: "user", content: prompt }]
    });
    // @ts-ignore
    return response.content[0].text;
  } catch (error) {
    return `Can you describe your experience and why you are a good fit for the ${targetRole} role?`;
  }
};
