"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributeReading = distributeReading;
// Allocate contiguous passages by estimated effort and prefer nearby section endings.
function distributeReading(passages, requestedDays) {
    if (!passages.length)
        return [];
    const days = Math.min(requestedDays, passages.length);
    const items = [];
    let offset = 0;
    let remainingMinutes = passages.reduce((sum, passage) => sum + passage.estimatedMinutes, 0);
    for (let day = 1; day <= days; day++) {
        const daysLeft = days - day + 1;
        const target = remainingMinutes / daysLeft;
        const lastAllowed = passages.length - (daysLeft - 1);
        let end = offset + 1;
        let minutes = passages[offset].estimatedMinutes;
        if (daysLeft === 1) {
            end = passages.length;
            minutes = remainingMinutes;
        }
        else {
            while (end < lastAllowed && Math.abs(minutes + passages[end].estimatedMinutes - target) < Math.abs(minutes - target)) {
                minutes += passages[end].estimatedMinutes;
                end++;
                if (passages[end - 1].sectionId !== passages[end]?.sectionId && minutes >= target * 0.8)
                    break;
            }
        }
        const selected = passages.slice(offset, end);
        items.push({
            dayNumber: day,
            sectionId: selected[0].sectionId,
            passageIds: selected.map(passage => passage.id),
            estimatedMinutes: Math.max(1, Math.ceil(minutes)),
            rationale: `${selected[0].reference} to ${selected[selected.length - 1].reference}. ${[...new Set(selected.map(passage => passage.reason))].join(' ')}`,
        });
        offset = end;
        remainingMinutes -= minutes;
    }
    return items;
}
//# sourceMappingURL=readingPlanSchedule.js.map