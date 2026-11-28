/* Date and category summaries shared by the map course list. */
const PinmapMapCourseList = (() => {
  const utcDay = value => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    const [, year, month, day] = match.map(Number);
    const timestamp = Date.UTC(year, month - 1, day);
    const parsed = new Date(timestamp);
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day ? timestamp : null;
  };
  const daysUntil = (date, today = new Date()) => {
    const target = utcDay(date);
    if (target == null) return null;
    const current = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((target - current) / 86400000);
  };
  const dDay = difference => difference == null ? '' : difference === 0 ? 'D-day' : difference > 0 ? `D-${difference}` : `D+${-difference}`;
  const categories = places => [...new Set((places || []).map(place => PinmapCategories.of(place.sourceItem || place).label))];
  const group = (courses, today = new Date()) => {
    const entries = (courses || []).map(course => ({ ...course, daysUntil: daysUntil(course.date, today) }));
    return {
      upcoming: entries.filter(entry => entry.daysUntil == null || entry.daysUntil >= 0).sort((a, b) => (a.daysUntil ?? Infinity) - (b.daysUntil ?? Infinity)),
      past: entries.filter(entry => entry.daysUntil < 0).sort((a, b) => b.daysUntil - a.daysUntil)
    };
  };
  return Object.freeze({ daysUntil, dDay, categories, group });
})();
if (typeof window !== 'undefined') window.PinmapMapCourseList = PinmapMapCourseList;
if (typeof module !== 'undefined') module.exports = PinmapMapCourseList;
