export interface RumikRuntime { start(): Promise<void>; stop(): Promise<void>; speak(text: string): Promise<void>; }
export interface RumikRuntimeConfig { executablePath?: string; modelPath?: string; }
