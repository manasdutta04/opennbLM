import { join } from "node:path";
import { createMemoryStore } from "@opennblm/memory";
export function createLocalServices(userDataPath: string) { const memory = createMemoryStore(join(userDataPath, "opennblm.sqlite")); return { memory, close() { memory.close(); } }; }
