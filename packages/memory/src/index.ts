export interface MemoryStore { readonly databasePath: string; close(): void; }
export function createMemoryStore(databasePath: string): MemoryStore { return { databasePath, close() {} }; }
