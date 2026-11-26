const { test } = require('node:test');
const assert = require('node:assert/strict');
const { group } = require('../map-clusters.js');

test('map markers stay separate when zoomed in and group as screen positions converge', () => {
  const places = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 70, y: 0 },
    { id: 'c', x: 140, y: 0 },
    { id: 'd', x: 350, y: 0 },
  ];
  const project = scale => place => ({ x: place.x * scale, y: place.y * scale });
  assert.deepEqual(group(places, project(1)).map(items => items.map(item => item.id)), [['a'], ['b'], ['c'], ['d']]);
  assert.deepEqual(group(places, project(0.5)).map(items => items.map(item => item.id)), [['a', 'b', 'c'], ['d']]);
  assert.deepEqual(group(places, project(0.1)).map(items => items.map(item => item.id)), [['a', 'b', 'c', 'd']]);
});

test('marker grouping preserves each place once across adjacent grid cells', () => {
  const places = [
    { id: 'a', x: 41, y: 41 },
    { id: 'b', x: 44, y: 42 },
    { id: 'c', x: 100, y: 100 },
  ];
  assert.deepEqual(group(places, item => item).map(items => items.map(item => item.id)), [['a', 'b'], ['c']]);
});
