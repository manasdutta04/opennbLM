import { join } from "node:path";
import { createMemoryStore } from "@opennblm/memory";
export async function createLocalServices(userDataPath: string) { const memory = await createMemoryStore(join(userDataPath, "opennblm.sqlite")); return { memory, close() { memory.close(); } }; }
