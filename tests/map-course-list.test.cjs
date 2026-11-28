const test = require('node:test');
const assert = require('node:assert/strict');
global.PinmapCategories = require('../categories.js');
const list = require('../map-course-list.js');

test('course dates group today with upcoming and order each section by proximity', () => {
  const today = new Date(2026, 10, 28);
  const courses = [
    { id: 'old', date: '2026-11-20' },
    { id: 'future', date: '2026-12-01' },
    { id: 'today', date: '2026-11-28' },
    { id: 'recent', date: '2026-11-27' }
  ];
  const groups = list.group(courses, today);
  assert.deepEqual(groups.upcoming.map(course => course.id), ['today', 'future']);
  assert.deepEqual(groups.past.map(course => course.id), ['recent', 'old']);
  assert.deepEqual(groups.upcoming.map(course => list.dDay(course.daysUntil)), ['D-day', 'D-3']);
  assert.deepEqual(groups.past.map(course => list.dDay(course.daysUntil)), ['D+1', 'D+8']);
});

test('calendar days remain correct across a daylight saving change', () => {
  assert.equal(list.daysUntil('2026-03-09', new Date(2026, 2, 8)), 1);
  assert.equal(list.daysUntil('2026-02-30', new Date(2026, 1, 28)), null);
});

test('course categories use canonical saved-place categories without duplicates', () => {
  const places = [
    { sourceItem: { category: '카페/디저트' } },
    { sourceItem: { category: '카페' } },
    { sourceItem: { category: '전시/팝업' } }
  ];
  assert.deepEqual(list.categories(places), ['카페', '전시']);
});
