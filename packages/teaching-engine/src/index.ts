import type { LLMProvider, LLMRequest } from "@opennblm/llm-providers";

export type LearnerLevel = "beginner" | "intermediate" | "advanced";
export type TeachingStyle = "teacher" | "friend" | "10-year-old" | "story" | "simple" | "technical" | "hype";
export interface TeachingInput {
  question: string;
  model?: string;
  learnerLevel?: LearnerLevel;
  subject?: string;
  language?: string;
  learnerContext?: string;
  style?: TeachingStyle;
  referenceExplanation?: string;
  /** Optional retrieved source snippets for grounded notebook chat. */
  sourceContext?: string;
}
export interface TeachingPlan {
  topic: string;
  learner_level: LearnerLevel;
  objective: string;
  key_concepts: string[];
  explanation_steps: string[];
  examples: string[];
  analogy: string;
  misconception_risks: string[];
  comprehension_check: string;
  summary: string;
  /** Natural prose shown to the learner (preferred over outline join). */
  learner_facing?: string;
}
export interface SegmentInstruction { text: string; emphasis?: string; pauseAfterMs?: number; }
export interface DeliveryPlan {
  overallTone: string;
  pace: "slow" | "steady" | "brisk";
  emphasis: string[];
  pauses: number[];
  energy: "calm" | "warm" | "bright";
  language: string;
  speaker: "Ira" | "Aisha" | "Siya" | "Zoya";
  vocalizationOpportunities: string[];
  segmentInstructions: SegmentInstruction[];
}
export interface TeachingResult {
  plan: TeachingPlan;
  delivery: DeliveryPlan;
  response: string;
  usedFallback: boolean;
  attempts: number;
}
export interface TeachingSession { id: string; }
export interface TeachingEngine {
  start(session: TeachingSession): Promise<void>;
  teach(input: TeachingInput): Promise<TeachingResult>;
}

export const teachingStyleGuidance: Record<
  TeachingStyle,
  { structure: string; vocabulary: string; delivery: string; energy: DeliveryPlan["energy"]; pace: DeliveryPlan["pace"] }
> = {
  teacher: { structure: "structured, patient, educational progression", vocabulary: "clear instructional vocabulary", delivery: "calm, clear, teacher-like", energy: "calm", pace: "steady" },
  friend: { structure: "casual conversational explanation with an intuitive starting point", vocabulary: "natural everyday language", delivery: "casual, conversational, warm", energy: "warm", pace: "steady" },
  "10-year-old": { structure: "one small idea at a time with a concrete analogy", vocabulary: "simple vocabulary without condescension", delivery: "patient, bright, reassuring", energy: "warm", pace: "steady" },
  story: { structure: "narrative explanation with a beginning, turning point, and takeaway", vocabulary: "sensory and memorable language", delivery: "warm, expressive storytelling", energy: "warm", pace: "steady" },
  simple: { structure: "minimum necessary steps and no detours", vocabulary: "minimum jargon and short sentences", delivery: "calm, plain, direct", energy: "calm", pace: "steady" },
  technical: { structure: "precise definitions, mechanisms, and deeper detail", vocabulary: "precise terminology", delivery: "precise, focused, deliberate", energy: "calm", pace: "brisk" },
  hype: { structure: "energizing progression toward an actionable insight", vocabulary: "confident, motivational language", delivery: "enthusiastic, energetic, slightly faster", energy: "bright", pace: "brisk" },
};

const planSchema = {
  type: "object",
  required: [
    "topic",
    "learner_level",
    "objective",
    "key_concepts",
    "explanation_steps",
    "examples",
    "analogy",
    "misconception_risks",
    "comprehension_check",
    "summary",
    "learner_facing",
  ],
  properties: {
    topic: { type: "string" },
    learner_level: { enum: ["beginner", "intermediate", "advanced"] },
    objective: { type: "string" },
    key_concepts: { type: "array", items: { type: "string" } },
    explanation_steps: { type: "array", items: { type: "string" } },
    examples: { type: "array", items: { type: "string" } },
    analogy: { type: "string" },
    misconception_risks: { type: "array", items: { type: "string" } },
    comprehension_check: { type: "string" },
    summary: { type: "string" },
    learner_facing: {
      type: "string",
      description: "A natural, continuous explanation the learner reads (4–8 short paragraphs). Not a bullet outline.",
    },
  },
};

const asStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);

export function validateTeachingPlan(value: unknown): value is TeachingPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Record<string, unknown>;
  const core =
    typeof plan.topic === "string" &&
    typeof plan.objective === "string" &&
    typeof plan.analogy === "string" &&
    typeof plan.comprehension_check === "string" &&
    typeof plan.summary === "string" &&
    ["beginner", "intermediate", "advanced"].includes(String(plan.learner_level)) &&
    asStrings(plan.key_concepts) &&
    asStrings(plan.explanation_steps) &&
    asStrings(plan.examples) &&
    asStrings(plan.misconception_risks);
  if (!core) return false;
  // learner_facing preferred but optional for backward-compatible validation during correction.
  if (plan.learner_facing !== undefined && typeof plan.learner_facing !== "string") return false;
  return true;
}

function fallbackPlan(input: TeachingInput): TeachingPlan {
  const level = input.learnerLevel ?? "beginner";
  const q = input.question.trim() || "this topic";
  return {
    topic: q,
    learner_level: level,
    objective: `Understand ${q} well enough to explain it simply and apply it.`,
    key_concepts: [q, "base case", "recursive step"],
    explanation_steps: [
      `Define ${q} in plain language.`,
      "Show one concrete walkthrough.",
      "Name the pitfall that usually causes confusion.",
    ],
    examples: [`Walk through a small, concrete case of ${q}.`],
    analogy: "Like opening nested containers until you reach the last one, then closing them in reverse order.",
    misconception_risks: ["Skipping the stopping condition and looping forever."],
    comprehension_check: `How would you explain ${q} to a classmate in two sentences?`,
    summary: `${q} becomes manageable when you separate the stopping condition from the repeated smaller step.`,
    learner_facing: [
      `Let's make ${q} feel concrete instead of abstract.`,
      `At its core, you solve a problem by solving a smaller version of the same problem, then combining the results. The critical piece is a clear stopping point so the process cannot continue forever.`,
      `Start with the smallest case you can describe without further splitting. That stopping point is what keeps the approach safe and finite.`,
      `Then describe the step that reduces the current problem toward that stopping point. If you can name both pieces, you already understand the mechanism.`,
      `Try a tiny example on paper: write the first call, the smaller call it makes, and what returns as you unwind. That trace is usually more helpful than memorizing a definition.`,
      `Quick check: in your own words, what stops the process, and what makes each step smaller?`,
    ].join("\n\n"),
  };
}

export function buildDeliveryPlan(plan: TeachingPlan, input: TeachingInput): DeliveryPlan {
  const style = input.style ? teachingStyleGuidance[input.style] : undefined;
  const tone =
    style?.delivery ??
    (plan.learner_level === "beginner" ? "warm and reassuring" : plan.learner_level === "advanced" ? "precise and focused" : "clear and encouraging");
  const pace = style?.pace ?? (plan.learner_level === "beginner" ? "steady" : "brisk");
  return {
    overallTone: tone,
    pace,
    emphasis: plan.key_concepts.slice(0, 3),
    pauses: plan.explanation_steps.map((_, index) => index),
    energy: style?.energy ?? (plan.learner_level === "beginner" ? "calm" : "warm"),
    language: input.language ?? "English",
    speaker: "Ira",
    vocalizationOpportunities: input.style === "hype" ? ["brief celebratory lift at the key insight"] : [],
    segmentInstructions: plan.explanation_steps.map((text, index) => ({
      text,
      emphasis: plan.key_concepts[index],
      pauseAfterMs: input.style === "technical" ? 650 : 450,
    })),
  };
}

/** Prefer natural prose; fall back to a readable composition (not labeled outline headers). */
export function renderTeachingResponse(plan: TeachingPlan): string {
  const prose = plan.learner_facing?.trim();
  if (prose && prose.length > 80) return prose;
  const parts = [
    plan.objective,
    ...plan.explanation_steps,
    plan.examples[0] ? `For example, ${plan.examples[0].replace(/^For example:\s*/i, "")}` : "",
    plan.analogy ? `${plan.analogy.startsWith("Think") || plan.analogy.startsWith("Like") ? plan.analogy : `A helpful picture: ${plan.analogy}`}` : "",
    plan.comprehension_check,
    plan.summary,
  ].filter(Boolean);
  return parts.join("\n\n");
}

const planRequest = (input: TeachingInput, correction = false): LLMRequest => {
  const style = input.style ? teachingStyleGuidance[input.style] : undefined;
  const reference = input.referenceExplanation
    ? `Current explanation to reinterpret, without repeating the full conversation: ${input.referenceExplanation}`
    : "";
  const learnerContext = input.learnerContext
    ? `Local learner context (use gently; never mention hidden memory): ${input.learnerContext}`
    : "";
  const sources = input.sourceContext
    ? `Ground your explanation in these notebook source excerpts. Cite them naturally by title when relevant:\n${input.sourceContext}`
    : "";
  return {
    model: input.model ?? "configured",
    temperature: 0.35,
    responseSchema: planSchema,
    messages: [
      {
        role: "system",
        content: `You are opennbLM's teaching planner. Return only a JSON object matching the supplied schema.
The learner_facing field MUST be a natural, continuous explanation (4–8 short paragraphs) that a student can read aloud. Do NOT write learner_facing as a bullet outline, numbered study plan, or meta instructions like "Start with…" / "Quick check:".
Answer language: ${input.language ?? "English"}. Write EVERY learner-visible string in that language only — learner_facing, topic, objective, key_concepts, explanation_steps, examples, analogy, misconception_risks, comprehension_check, and summary. The question may be in another language; still answer only in ${input.language ?? "English"}. Do not switch to the question's language. Do not transliterate ${input.language ?? "English"} into Latin letters unless the language is English — use the native script.
Also fill the structured fields for internal planning. Learner level: ${input.learnerLevel ?? "beginner"}. ${
          style ? `Style: ${style.structure}. Vocabulary: ${style.vocabulary}. Delivery intent: ${style.delivery}.` : ""
        } ${learnerContext} ${sources}`,
      },
      {
        role: "user",
        content: correction
          ? `The previous plan was invalid or learner_facing was too outline-like. Return a corrected complete plan with every required field, valid arrays, and a natural learner_facing explanation. Topic: ${input.question}. ${reference}`
          : `Create a teaching plan for: ${input.question}. ${reference}`,
      },
    ],
  };
};

export function createTeachingEngine(provider: LLMProvider): TeachingEngine {
  return {
    async start() {},
    async teach(input) {
      let attempts = 0;
      let plan: TeachingPlan | undefined;
      let usedFallback = false;
      for (let retry = 0; retry < 2; retry += 1) {
        attempts += 1;
        try {
          const candidate = await provider.structured<unknown>(planRequest(input, retry === 1));
          if (validateTeachingPlan(candidate)) {
            plan = candidate;
            // If model omitted learner_facing, keep plan but compose readable prose.
            if (!plan.learner_facing?.trim()) {
              plan = { ...plan, learner_facing: renderTeachingResponse(plan) };
            }
            break;
          }
        } catch {
          /* parse/CLI failure — try correction prompt once */
        }
      }
      if (!plan) {
        plan = fallbackPlan(input);
        usedFallback = true;
      }
      const delivery = buildDeliveryPlan(plan, input);
      return {
        plan,
        delivery,
        response: renderTeachingResponse(plan),
        usedFallback,
        attempts,
      };
    },
  };
}
