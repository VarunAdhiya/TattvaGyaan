import { ganeshaLevels } from '../data/divineJourneys';

export function readJourneyProgress(key, levels = ganeshaLevels) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (!value || value.version !== 1) return { current: 0, completed: [] };
    // Old collected petals become visited chapters. Free exploration can be out of order.
    const completed = levels.filter(level => Array.isArray(value.completed) && value.completed.includes(level.id)).map(level => level.id);
    const current = Number.isInteger(value.current) ? Math.max(0, Math.min(value.current, levels.length - 1)) : 0;
    return { current, completed };
  } catch {
    return { current: 0, completed: [] };
  }
}
