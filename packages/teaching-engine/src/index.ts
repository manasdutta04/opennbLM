export interface TeachingSession { id: string; }
export interface TeachingEngine { start(session: TeachingSession): Promise<void>; }
