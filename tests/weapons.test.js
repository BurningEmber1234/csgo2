import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyCategories, weaponByName, weapons } from '../src/weapons.js';

const cs2BuyableWeapons = [
  'Glock-18', 'P2000', 'USP-S', 'Dual Berettas', 'P250', 'Five-SeveN', 'Tec-9',
  'CZ75-Auto', 'Desert Eagle', 'R8 Revolver', 'MAC-10', 'MP9', 'MP7', 'MP5-SD',
  'UMP-45', 'P90', 'PP-Bizon', 'Galil AR', 'FAMAS', 'AK-47', 'M4A4', 'M4A1-S',
  'AUG', 'SG 553', 'SSG 08', 'AWP', 'G3SG1', 'SCAR-20', 'Nova', 'XM1014',
  'MAG-7', 'Sawed-Off', 'M249', 'Negev', 'Zeus x27',
];

test('buy catalog includes every CS2 firearm, the Zeus, and the requested custom Marshal', () => {
  for (const name of cs2BuyableWeapons) assert.ok(weaponByName[name], `Missing ${name}`);
  assert.ok(weaponByName.Marshal, 'Missing the custom Marshal');
  assert.equal(weapons.length, cs2BuyableWeapons.length + 1);
  assert.equal(new Set(weapons.map((item) => item.name)).size, weapons.length);
});

test('every catalog entry has valid buy, magazine, and firing data', () => {
  for (const item of weapons) {
    assert.ok(item.price >= 0, `${item.name} has an invalid price`);
    assert.ok(item.magazine > 0, `${item.name} has no magazine`);
    assert.ok(item.reserve >= 0, `${item.name} has invalid reserve ammo`);
    assert.ok(item.damage > 0, `${item.name} has no damage`);
    assert.ok(item.fireDelay > 0, `${item.name} has no firing interval`);
    assert.ok(buyCategories.some((category) => category.id === item.category), `${item.name} has no buy category`);
  }
});

test('Marshal and the CS2 optic weapons are scoped; other weapons are not', () => {
  for (const name of ['Marshal', 'AWP', 'SSG 08', 'G3SG1', 'SCAR-20', 'AUG', 'SG 553']) {
    assert.equal(weaponByName[name].scoped, true, `${name} should have an optic`);
    assert.ok(weaponByName[name].scopeFov > 0 && weaponByName[name].scopeFov < 70);
  }
  assert.equal(weaponByName['Desert Eagle'].scoped, undefined);
});

test('all buy categories expose the expected weapon families', () => {
  const counts = Object.fromEntries(buyCategories.map(({ id }) => [
    id,
    id === 'ALL' ? weapons.length : weapons.filter((item) => item.category === id).length,
  ]));
  assert.deepEqual(counts, {
    ALL: 36,
    PISTOLS: 10,
    SMGS: 7,
    RIFLES: 7,
    SNIPERS: 5,
    HEAVY: 6,
    SPECIAL: 1,
  });
});
