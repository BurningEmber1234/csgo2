const weapon = (
  name,
  category,
  price,
  ammoType,
  magazine,
  reserve,
  damage,
  roundsPerMinute,
  kind,
  options = {},
) => ({
  name,
  category,
  price,
  ammoType,
  magazine,
  reserve,
  damage,
  roundsPerMinute,
  fireDelay: 60 / roundsPerMinute,
  kind,
  reloadSeconds: 2.2,
  automatic: true,
  pellets: 1,
  spread: 0.008,
  description: `${kind.toUpperCase()} · SERVICE READY`,
  ...options,
});

// The complete CS2 buyable firearm roster, plus the requested custom Marshal
// and Zeus x27. Prices and magazine sizes follow the standard CS2 loadout.
export const weapons = [
  // Pistols
  weapon('Glock-18', 'PISTOLS', 200, '9×19 MM', 20, 120, 28, 400, 'pistol', { automatic: false, description: 'LIGHT SIDEARM · HIGH CAPACITY' }),
  weapon('P2000', 'PISTOLS', 200, '9×19 MM', 13, 52, 35, 352, 'pistol', { automatic: false, description: 'SERVICE PISTOL · BALANCED' }),
  weapon('USP-S', 'PISTOLS', 200, '45 ACP', 12, 24, 35, 352, 'pistol', { automatic: false, description: 'SUPPRESSED SIDEARM · PRECISE' }),
  weapon('Dual Berettas', 'PISTOLS', 300, '9×19 MM', 30, 120, 38, 500, 'pistol', { description: 'TWIN SIDEARMS · RAPID FIRE' }),
  weapon('P250', 'PISTOLS', 300, '9×19 MM', 13, 26, 38, 400, 'pistol', { automatic: false, description: 'COMPACT PISTOL · ARMOR PIERCING' }),
  weapon('Five-SeveN', 'PISTOLS', 500, '5.7×28 MM', 20, 100, 32, 400, 'pistol', { automatic: false, description: 'HIGH-CAPACITY · ARMOR PIERCING' }),
  weapon('Tec-9', 'PISTOLS', 500, '9×19 MM', 18, 90, 33, 500, 'pistol', { automatic: false, description: 'ATTACKER SIDEARM · FAST FIRE' }),
  weapon('CZ75-Auto', 'PISTOLS', 500, '9×19 MM', 12, 12, 31, 600, 'pistol', { reloadSeconds: 2.7, description: 'FULL-AUTO SIDEARM · CLOSE RANGE' }),
  weapon('Desert Eagle', 'PISTOLS', 700, '.50 AE', 7, 35, 53, 267, 'pistol', { automatic: false, reloadSeconds: 2.4, spread: 0.012, description: 'HEAVY PISTOL · MASSIVE IMPACT' }),
  weapon('R8 Revolver', 'PISTOLS', 600, '.357 SIG', 8, 8, 86, 120, 'pistol', { automatic: false, reloadSeconds: 2.3, spread: 0.012, description: 'DOUBLE-ACTION · HIGH DAMAGE' }),

  // SMGs
  weapon('MAC-10', 'SMGS', 1050, '.45 ACP', 30, 100, 29, 800, 'smg', { description: 'LIGHT SMG · RUN-AND-GUN' }),
  weapon('MP9', 'SMGS', 1250, '9×19 MM', 30, 120, 26, 857, 'smg', { description: 'COMPACT SMG · VERY HIGH RATE' }),
  weapon('MP7', 'SMGS', 1500, '4.6×30 MM', 30, 120, 29, 750, 'smg', { description: 'VERSATILE SMG · LOW RECOIL' }),
  weapon('MP5-SD', 'SMGS', 1500, '9×19 MM', 30, 120, 27, 750, 'smg', { description: 'INTEGRAL SUPPRESSOR · QUIET' }),
  weapon('UMP-45', 'SMGS', 1200, '.45 ACP', 25, 100, 35, 600, 'smg', { description: 'HEAVY SMG · HIGH DAMAGE' }),
  weapon('P90', 'SMGS', 2350, '5.7×28 MM', 50, 100, 26, 857, 'smg', { description: 'BULLPUP SMG · 50-ROUND MAG' }),
  weapon('PP-Bizon', 'SMGS', 1400, '9×19 MM', 64, 120, 27, 750, 'smg', { description: 'HELICAL MAGAZINE · 64 ROUNDS' }),

  // Rifles
  weapon('Galil AR', 'RIFLES', 1800, '5.56×45 MM', 35, 90, 30, 667, 'rifle', { description: 'BUDGET RIFLE · 35-ROUND MAG' }),
  weapon('FAMAS', 'RIFLES', 2050, '5.56×45 MM', 25, 90, 30, 666, 'rifle', { description: 'BURST-CAPABLE · CONTROLLED FIRE' }),
  weapon('AK-47', 'RIFLES', 2700, '7.62×39 MM', 30, 90, 36, 600, 'rifle', { spread: 0.01, description: 'HIGH DAMAGE · 600 RPM' }),
  weapon('M4A4', 'RIFLES', 3000, '5.56×45 MM', 30, 90, 33, 666, 'rifle', { description: 'ASSAULT RIFLE · FAST FIRE' }),
  weapon('M4A1-S', 'RIFLES', 2900, '5.56×45 MM', 20, 80, 33, 600, 'rifle', { description: 'SUPPRESSED RIFLE · CONTROLLED' }),
  weapon('AUG', 'RIFLES', 3300, '5.56×45 MM', 30, 90, 32, 600, 'rifle', { scoped: true, scopeFov: 46, description: 'OPTIC-READY · ACCURATE BURSTS' }),
  weapon('SG 553', 'RIFLES', 3000, '5.56×45 MM', 30, 90, 30, 545, 'rifle', { scoped: true, scopeFov: 46, description: 'T-SIDE OPTIC · ACCURATE FIRE' }),

  // Dedicated scoped weapons, plus the requested custom Marshal.
  weapon('SSG 08', 'SNIPERS', 1700, '7.62×51 MM', 10, 90, 88, 48, 'sniper', { automatic: false, scoped: true, scopeFov: 34, reloadSeconds: 2.5, spread: 0.001, description: 'LIGHT SCOUT · QUICK SCOPE' }),
  weapon('AWP', 'SNIPERS', 4750, '.338 LAPUA', 10, 30, 100, 41, 'sniper', { automatic: false, scoped: true, scopeFov: 24, reloadSeconds: 3.4, spread: 0.001, description: 'BOLT-ACTION · ONE-SHOT POWER' }),
  weapon('G3SG1', 'SNIPERS', 5000, '7.62×51 MM', 20, 90, 80, 240, 'sniper', { scoped: true, scopeFov: 25, reloadSeconds: 3.5, spread: 0.003, description: 'T-SIDE AUTO SNIPER · SCOPED' }),
  weapon('SCAR-20', 'SNIPERS', 5000, '7.62×51 MM', 20, 90, 80, 240, 'sniper', { scoped: true, scopeFov: 25, reloadSeconds: 3.5, spread: 0.003, description: 'CT AUTO SNIPER · SCOPED' }),
  weapon('Marshal', 'SNIPERS', 3500, '.308 WIN', 5, 20, 90, 75, 'sniper', { automatic: false, scoped: true, scopeFov: 30, reloadSeconds: 2.8, spread: 0.001, description: 'CUSTOM SCOPED RIFLE · BOLT-ACTION' }),

  // Heavy weapons
  weapon('Nova', 'HEAVY', 1050, '12 GAUGE', 8, 32, 13, 68, 'shotgun', { automatic: false, pellets: 9, spread: 0.09, reloadSeconds: 2.8, description: 'PUMP SHOTGUN · WIDE SPREAD' }),
  weapon('XM1014', 'HEAVY', 2000, '12 GAUGE', 7, 32, 13, 240, 'shotgun', { pellets: 9, spread: 0.09, reloadSeconds: 2.8, description: 'AUTO SHOTGUN · RAPID FOLLOW-UP' }),
  weapon('MAG-7', 'HEAVY', 1300, '12 GAUGE', 5, 32, 14, 171, 'shotgun', { automatic: false, pellets: 8, spread: 0.095, reloadSeconds: 2.4, description: 'CT SHOTGUN · CLOSE-QUARTERS' }),
  weapon('Sawed-Off', 'HEAVY', 1100, '12 GAUGE', 7, 32, 14, 71, 'shotgun', { automatic: false, pellets: 8, spread: 0.11, reloadSeconds: 2.6, description: 'T SHOTGUN · DEVASTATING UP CLOSE' }),
  weapon('M249', 'HEAVY', 5200, '5.56×45 MM', 100, 200, 32, 750, 'heavy', { reloadSeconds: 5.7, spread: 0.016, description: 'LIGHT MACHINE GUN · 100 ROUNDS' }),
  weapon('Negev', 'HEAVY', 1700, '5.56×45 MM', 150, 300, 35, 800, 'heavy', { reloadSeconds: 5.7, spread: 0.02, description: 'SUPPRESSIVE FIRE · 150-ROUND MAG' }),

  // Special equipment
  weapon('Zeus x27', 'SPECIAL', 200, 'SINGLE SHOT', 1, 0, 1000, 40, 'special', { automatic: false, reloadSeconds: 0, spread: 0, description: 'ONE-CHARGE ELECTRIC SIDEARM' }),
];

export const weaponByName = Object.fromEntries(weapons.map((item) => [item.name, item]));

export const buyCategories = [
  { id: 'ALL', label: 'ALL WEAPONS' },
  { id: 'PISTOLS', label: 'PISTOLS' },
  { id: 'SMGS', label: 'SMGS' },
  { id: 'RIFLES', label: 'RIFLES' },
  { id: 'SNIPERS', label: 'SNIPERS' },
  { id: 'HEAVY', label: 'HEAVY' },
  { id: 'SPECIAL', label: 'SPECIAL' },
];
