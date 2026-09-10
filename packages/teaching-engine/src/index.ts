import type { LLMProvider } from "@opennblm/llm-providers";
export interface TeachingSession { id: string; }
export interface TeachingEngine { start(session: TeachingSession): Promise<void>; }
export function createTeachingEngine(_provider: LLMProvider): TeachingEngine { return { async start() {} }; }
