const { test } = require('node:test');
const assert = require('node:assert/strict');
const { distributeReading } = require('../dist/services/readingPlanSchedule');

const passages = weights => weights.map((estimatedMinutes, i) => ({ id: String(i), reference: String(i + 1), sectionId: 'section', estimatedMinutes, reason: 'Sample analysis' }));

test('plans balance effort instead of assigning equal passage counts', () => {
  const input = passages([10, 2, 2, 2, 2, 2]);
  const plan = distributeReading(input, 2);
  assert.deepEqual(plan.map(day => day.passageIds.length), [1, 5]);
  assert.deepEqual(plan.map(day => day.estimatedMinutes), [10, 10]);
  assert.deepEqual(plan.flatMap(day => day.passageIds), input.map(passage => passage.id));
});

test('one-day, long-duration and uneven plans include every passage once in order', () => {
  for (const count of [1, 2, 17, 700]) {
    const input = passages(Array.from({ length: count }, (_, index) => (index % 7 + 1) / 5));
    for (const days of [1, 7, 30, 365]) {
      const plan = distributeReading(input, days);
      assert.equal(plan.length, Math.min(days, count));
      assert.deepEqual(plan.flatMap(day => day.passageIds), input.map(passage => passage.id));
      assert.ok(plan.every((day, index) => day.dayNumber === index + 1 && day.passageIds.length > 0 && day.estimatedMinutes > 0));
    }
  }
});
