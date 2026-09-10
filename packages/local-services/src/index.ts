export interface LocalServices { close(): void; }
export function createLocalServices(_userDataPath: string): LocalServices { return { close() {} }; }
