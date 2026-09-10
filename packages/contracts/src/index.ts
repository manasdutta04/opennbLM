export interface AppInfo { name: string; version: string; }
export interface PreloadApi { getAppInfo(): Promise<AppInfo>; }
