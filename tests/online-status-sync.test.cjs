// Execute the status logic from the screens without requiring a React Native runtime.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'frontend/app/(tabs)/dashboard.tsx'), 'utf8');
const profile = fs.readFileSync(path.join(root, 'frontend/app/(tabs)/profile.tsx'), 'utf8');
const effect = source => source.match(/useEffect\(\(\) => \{([\s\S]*?)\}, \[user(?:\?\.[\w]+)?\]\);/)[1];
for (const [name, source, setter] of [['dashboard', dashboard, 'setIsOnline'], ['profile', profile, 'setLiveLocation']]) {
  for (const online of [true, false]) {
    test(`${name} follows server status ${online} after refresh or change on another screen`, () => {
      let result = !online;
      new Function('user', setter, 'fetchData', effect(source))(
        { is_online: online }, value => { result = value; }, () => {});
      assert.equal(result, online);
    });
  }
}
const handlerSource = dashboard.split('  const toggleOnlineStatus = async (nextOnline: boolean) => {')[1]
  .split('\n  };')[0].replace('catch (e: any)', 'catch (e)');
async function toggle(nextOnline, fail = false) {
  const calls = [], updates = [], alerts = [];
  let refreshed = false;
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await new AsyncFunction('nextOnline', 'togglingStatus', 'setTogglingStatus', 'updateLocation', 'api',
    'setIsOnline', 'refreshUser', 'Alert', 'console', handlerSource)(
    nextOnline, false, () => {}, async () => ({ lat: 43.64, lng: -79.42 }),
    { put: async (url, body) => { calls.push(body); if (fail) throw Error('offline'); return { is_online: nextOnline }; } },
    value => updates.push(value), async () => { refreshed = true; },
    { alert: (...args) => alerts.push(args) }, { log() {}, error() {} });
  return { calls, updates, refreshed, alerts };
}
test('going online sends fresh GPS coordinates and retains confirmed state', async () => {
  const result = await toggle(true);
  assert.deepEqual(result.calls, [{ is_online: true, current_lat: 43.64, current_lng: -79.42 }]);
  assert.deepEqual(result.updates, [true]);
  assert.equal(result.refreshed, true);
});
test('going offline does not require a location', async () => {
  const result = await toggle(false);
  assert.equal(result.calls[0].is_online, false);
  assert.equal(result.calls[0].current_lat, undefined);
  assert.deepEqual(result.updates, [false]);
});
test('failed save preserves status and displays feedback', async () => {
  const result = await toggle(true, true);
  assert.deepEqual(result.updates, []);
  assert.equal(result.refreshed, false);
  assert.equal(result.alerts.length, 1);
});
