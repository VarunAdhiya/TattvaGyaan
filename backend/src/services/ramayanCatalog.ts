import { RAMAYAN_SOURCE } from './bookLayoutService';

// Preserve the public detail URL of the former separate collection. Edition,
// passage, plan and reader URLs retain their original IDs during consolidation.
export const RAMAYAN_LEGACY_IDS = ['7ef9d10a-ac5f-460b-8bf7-b08d1cb6469a'];
export function isLegacyRamayan(id: string) {
  return RAMAYAN_LEGACY_IDS.includes(id);
}

export function preferRamayanText<T extends { source?: string | null }>(editions: T[]): T[] {
  return [...editions].sort((a, b) => Number(b.source === RAMAYAN_SOURCE) - Number(a.source === RAMAYAN_SOURCE));
}
