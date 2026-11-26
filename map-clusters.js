/* Group saved-place markers by their current screen positions. */
const PinmapMapClusters = (() => {
  function group(entries, pointFor, radius = 42) {
    if (!entries.length) return [];
    const parent = entries.map((_, index) => index);
    const cells = new Map();
    const points = [];
    const size = Math.max(1, radius);
    const find = index => {
      while (parent[index] !== index) {
        parent[index] = parent[parent[index]];
        index = parent[index];
      }
      return index;
    };
    const join = (a, b) => { parent[find(b)] = find(a); };
    entries.forEach((entry, index) => {
      const point = pointFor(entry);
      points[index] = point;
      const x = point.x, y = point.y;
      const cellX = Math.floor(x / size), cellY = Math.floor(y / size);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        for (const other of cells.get(`${cellX + dx}:${cellY + dy}`) || []) {
          const previous = points[other];
          if ((x - previous.x) ** 2 + (y - previous.y) ** 2 <= radius ** 2) join(index, other);
        }
      }
      const key = `${cellX}:${cellY}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(index);
    });
    const groups = new Map();
    entries.forEach((entry, index) => {
      const key = find(index);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    });
    return [...groups.values()];
  }
  return Object.freeze({ group });
})();
if (typeof module !== 'undefined') module.exports = PinmapMapClusters;
