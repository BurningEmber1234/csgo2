import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@fontsource/barlow/800.css';
import '@fontsource/barlow-condensed/800.css';
import * as THREE from 'three';
import { buildMap, canOccupy, floorHeight, locationName, spawns, structures } from './map.js';
import { buyCategories, weaponByName, weapons } from './weapons.js';

const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xa8c7d4);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xcac7b4, 0.004);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.08, 180);
camera.rotation.order = 'YXZ';
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xe8f0ed, 0x817052, 2.3));
const sun = new THREE.DirectionalLight(0xffe0ac, 3.8);
sun.position.set(-28, 45, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 150 });
sun.shadow.bias = -0.001;
scene.add(sun);
const colliders = buildMap(scene);

const wood = new THREE.MeshStandardMaterial({ color: 0xa08b68, roughness: 1 });
const radarCanvas = document.createElement('canvas');
radarCanvas.width = radarCanvas.height = 160;
const radarHost = document.querySelector('.radar-map');
radarHost.replaceChildren(radarCanvas);

let playing = false;
let started = false;
let buying = false;
let resumeAfterBuy = false;
let health = 100;
let ammo = weaponByName['AK-47'].magazine;
let reserve = weaponByName['AK-47'].reserve;
let kills = 0;
let round = 0;
let seconds = 115;
let reloading = false;
let reloadToken = 0;
let lastShot = -Infinity;
let money = 16000;
let weapon = 'AK-47';
let yaw = 0;
let pitch = 0;
let walk = 0;
let vertical = 0;
let shooting = false;
let scoped = false;
let roundEnding = false;
let buyCategory = 'ALL';
let buySearch = '';
let keys = {};
let audio;
let buyNoticeTimer;
const enemies = [];
const ray = new THREE.Raycaster();
const clock = new THREE.Clock();
const baseFov = 70;
const modal = $('modal');
const buyMenu = $('buyMenu');
const gun = new THREE.Group();
camera.add(gun);
gun.position.set(0.28, -0.28, -0.52);
gun.visible = false;

const gunMat = new THREE.MeshStandardMaterial({ color: 0x303737, metalness: 0.65, roughness: 0.35 });
const gunWood = new THREE.MeshStandardMaterial({ color: 0x755039, roughness: 0.6 });
const handMat = new THREE.MeshStandardMaterial({ color: 0x535b45, roughness: 0.95 });
let flash;
let savedPosition = new THREE.Vector3(0, 1.7, 29);

const currentWeapon = () => weaponByName[weapon];
const formatMoney = (amount) => `$${Math.max(0, amount).toLocaleString('en-US')}`;

function drawRadar() {
  const ctx = radarCanvas.getContext('2d');
  const scale = 2;
  const px = (x) => 80 + x * scale;
  const pz = (z) => 80 + z * scale;
  ctx.clearRect(0, 0, 160, 160);
  ctx.fillStyle = '#273a32';
  ctx.fillRect(23, 9, 114, 140);
  ctx.fillStyle = '#81917b';
  for (const [x, z, width, depth] of structures) {
    ctx.fillRect(px(x - width / 2), pz(z - depth / 2), width * scale, depth * scale);
  }
  ctx.font = 'bold 12px Arial';
  ctx.fillStyle = '#e3b568';
  ctx.fillText('A', px(19), pz(-23));
  ctx.fillText('B', px(-22), pz(-21));
  ctx.save();
  ctx.translate(px(camera.position.x), pz(camera.position.z));
  ctx.rotate(-yaw);
  ctx.fillStyle = '#c5e8f0';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(-4, 4);
  ctx.lineTo(4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  document.querySelector('.radar small').textContent = locationName(camera.position.x, camera.position.z);
}

function addGunPart(width, height, depth, x, y, z, material = gunMat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  gun.add(mesh);
  return mesh;
}

function clearGunModel() {
  for (const child of [...gun.children]) {
    gun.remove(child);
    child.traverse((object) => object.geometry?.dispose());
  }
}

function buildGunModel() {
  clearGunModel();
  const info = currentWeapon();
  const pistol = info.kind === 'pistol' || info.kind === 'special';
  const size = pistol ? 0.66 : info.kind === 'sniper' ? 1.17 : info.kind === 'shotgun' ? 1.05 : info.kind === 'heavy' ? 1.1 : 1;
  const receiverDepth = (pistol ? 0.25 : info.kind === 'heavy' ? 0.48 : 0.39) * size;
  const barrelLength = (pistol ? 0.2 : info.kind === 'sniper' ? 0.63 : info.kind === 'shotgun' ? 0.47 : 0.43) * size;
  const receiverWidth = (info.kind === 'heavy' ? 0.19 : info.kind === 'shotgun' ? 0.16 : 0.14) * size;
  const receiverHeight = (info.kind === 'heavy' ? 0.14 : 0.115) * size;
  const muzzleZ = -(receiverDepth / 2 + barrelLength);

  gunMat.color.set(info.kind === 'pistol' ? 0x343a3b : info.kind === 'sniper' ? 0x303835 : 0x303737);
  gunWood.color.set(info.kind === 'shotgun' ? 0x69533a : info.kind === 'sniper' ? 0x4c5141 : 0x755039);
  addGunPart(receiverWidth, receiverHeight, receiverDepth, 0, 0, -0.015 * size);
  addGunPart(info.kind === 'shotgun' ? 0.065 : 0.055, 0.055, barrelLength, 0, 0.025, muzzleZ / 2, gunMat);
  addGunPart(0.13 * size, 0.09 * size, 0.12 * size, 0, -0.075 * size, 0.08 * size, gunWood);
  addGunPart(0.09 * size, 0.16 * size, 0.105 * size, 0, -0.15 * size, 0.035 * size, gunMat);
  addGunPart(0.07 * size, 0.19 * size, 0.14 * size, 0, -0.14 * size, -0.015 * size, gunWood);

  if (!pistol) {
    addGunPart(0.105 * size, 0.09 * size, 0.27 * size, 0, -0.015 * size, receiverDepth / 2 + 0.105 * size, gunWood);
    addGunPart(0.045 * size, 0.045 * size, 0.13 * size, 0, 0.09 * size, -0.12 * size, gunMat);
    addGunPart(0.045 * size, 0.035 * size, 0.1 * size, 0, 0.085 * size, muzzleZ + 0.08 * size, gunMat);
    if (info.kind === 'shotgun') {
      addGunPart(0.045, 0.045, barrelLength * 0.92, 0.065, 0.025, muzzleZ / 2, gunMat);
    }
    if (info.kind === 'heavy') {
      addGunPart(0.018, 0.22, 0.018, -0.08, -0.17, -0.08, gunMat);
      addGunPart(0.018, 0.22, 0.018, 0.08, -0.17, -0.08, gunMat);
    }
    // Forearm and glove keep the lower-right view anchored in first person.
    addGunPart(0.14, 0.14, 0.43, 0.04, -0.23, 0.49, handMat);
    addGunPart(0.12, 0.12, 0.2, -0.02, -0.13, -0.26, handMat);
  }

  if (info.scoped) {
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.34, 12), gunMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.145, -0.08);
    gun.add(scopeTube);
    for (const z of [-0.25, 0.09]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 14), gunWood);
      ring.position.set(0, 0.145, z);
      gun.add(ring);
    }
  }

  flash = new THREE.Mesh(
    new THREE.ConeGeometry(0.085, 0.24, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd085 }),
  );
  flash.rotation.x = -Math.PI / 2;
  flash.position.set(0, 0.04, muzzleZ - 0.06);
  flash.visible = false;
  gun.add(flash);
}

function setScoped(enabled) {
  scoped = Boolean(enabled && currentWeapon().scoped && playing);
  camera.fov = scoped ? currentWeapon().scopeFov : baseFov;
  camera.updateProjectionMatrix();
  $('scopeOverlay').classList.toggle('hidden', !scoped);
  $('crosshair').classList.toggle('hidden', scoped);
  $('scopeWeapon').textContent = currentWeapon().name.toUpperCase();
  $('scopeZoom').textContent = currentWeapon().scoped
    ? `${(baseFov / currentWeapon().scopeFov).toFixed(1)}× OPTIC`
    : 'NO OPTIC';
  $('scopeOverlay').setAttribute('aria-hidden', String(!scoped));
  gun.visible = playing && !scoped;
}

function update() {
  const info = currentWeapon();
  $('health').textContent = Math.max(0, Math.ceil(health));
  $('healthbar').style.width = `${Math.max(0, health)}%`;
  $('ammo').textContent = reloading ? '—' : ammo;
  $('reserve').textContent = reserve;
  $('weaponName').innerHTML = `${info.name} <span>${info.ammoType}</span>`;
  $('cashAmount').textContent = formatMoney(money);
  $('buyBalance').textContent = formatMoney(money);
  $('buyFooterBalance').textContent = formatMoney(money);
  $('buyEquipped').textContent = info.name.toUpperCase();
  $('roundLabel').textContent = `ROUND ${String(Math.min(round + 1, 12)).padStart(2, '0')} / 12`;
  $('cashHud').classList.toggle('cash-low', money < 1000);
}

function sound(frequency, duration, type = 'square', volume = 0.035) {
  try {
    audio ??= new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(30, audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  } catch {
    // Audio is an optional enhancement; gameplay still works if blocked.
  }
}

function bot(x, z, index) {
  const group = new THREE.Group();
  group.position.set(x, floorHeight(x, z), z);
  const cloth = new THREE.MeshStandardMaterial({ color: [0x777258, 0x666454, 0x8c8062][index % 3] });
  const vest = new THREE.MeshStandardMaterial({ color: 0x393f35 });
  const add = (width, height, depth, px, py, pz, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(px, py, pz);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  add(0.55, 0.65, 0.3, 0, 1.15, 0, cloth);
  add(0.58, 0.4, 0.35, 0, 1.23, 0, vest);
  add(0.29, 0.32, 0.29, 0, 1.68, 0, wood);
  add(0.34, 0.18, 0.34, 0, 1.83, 0, vest);
  add(0.2, 0.72, 0.23, -0.17, 0.49, 0, cloth);
  add(0.2, 0.72, 0.23, 0.17, 0.49, 0, cloth);
  add(0.18, 0.54, 0.2, -0.38, 1.12, -0.1, cloth);
  add(0.18, 0.5, 0.2, 0.36, 1.12, -0.12, cloth);
  add(0.13, 0.13, 0.8, 0.2, 1.25, -0.4, gunMat);
  scene.add(group);
  group.userData.bot = true;
  group.traverse((object) => { object.userData.enemy = group; });
  enemies.push({
    mesh: group,
    hp: 100,
    alive: true,
    shootAt: Math.random() * 2 + 2,
    home: new THREE.Vector3(x, 0, z),
    phase: Math.random() * 6,
  });
}

function reset() {
  for (const enemy of enemies) scene.remove(enemy.mesh);
  enemies.length = 0;
  spawns.forEach(([x, z], index) => bot(x, z, index));
  reloadToken++;
  health = 100;
  ammo = currentWeapon().magazine;
  reserve = currentWeapon().reserve;
  kills = 0;
  seconds = 115;
  reloading = false;
  roundEnding = false;
  camera.position.set(0, 1.7, 29);
  yaw = 0;
  pitch = 0;
  vertical = 0;
  keys = {};
  $('roundMessage').textContent = '';
  $('killfeed').innerHTML = '';
  $('timer').textContent = '1:55';
  setScoped(false);
  update();
}

function equipWeapon(name) {
  if (!weaponByName[name]) return;
  weapon = name;
  reloadToken++;
  reloading = false;
  ammo = currentWeapon().magazine;
  reserve = currentWeapon().reserve;
  lastShot = -Infinity;
  setScoped(false);
  buildGunModel();
  update();
}

function deploy() {
  if (!started) {
    reset();
    started = true;
    savedPosition.copy(camera.position);
  }
  camera.position.copy(savedPosition);
  camera.rotation.set(pitch, yaw, 0);
  document.body.classList.add('playing');
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  playing = true;
  gun.visible = true;
  renderer.domElement.requestPointerLock?.();
}

$('deploy').addEventListener('click', deploy);
document.addEventListener('pointerlockchange', () => {
  if (buying) return;
  if (!document.pointerLockElement && playing) {
    savedPosition.copy(camera.position);
    playing = false;
    shooting = false;
    keys = {};
    setScoped(false);
    document.body.classList.remove('playing');
    $('menu').classList.remove('hidden');
    $('hud').classList.add('hidden');
    gun.visible = false;
    $('deploy').innerHTML = 'RESUME MATCH <span>↗</span>';
  }
});

document.addEventListener('mousemove', (event) => {
  if (!playing || !document.pointerLockElement) return;
  yaw -= event.movementX * 0.002;
  pitch = Math.max(-1.45, Math.min(1.45, pitch - event.movementY * 0.002));
});

document.addEventListener('keydown', (event) => {
  const isTextEntry = event.target instanceof HTMLElement && (
    event.target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(event.target.tagName)
  );
  if (event.code === 'KeyB' && !isTextEntry) {
    event.preventDefault();
    if (buying) closeBuyMenu();
    else openBuyMenu();
    return;
  }
  if (event.code === 'Escape' && buying) {
    event.preventDefault();
    closeBuyMenu();
    return;
  }
  if (buying) return;
  keys[event.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyR' && playing) reload();
  if (event.code === 'Space' && playing && camera.position.y <= floorHeight(camera.position.x, camera.position.z) + 1.71) {
    vertical = 5;
  }
});
document.addEventListener('keyup', (event) => { keys[event.code] = false; });
document.addEventListener('mousedown', (event) => {
  if (!playing || !document.pointerLockElement) return;
  if (event.button === 0) {
    if (currentWeapon().automatic) shooting = true;
    else shoot(clock.elapsedTime);
  } else if (event.button === 2) {
    setScoped(true);
  }
});
document.addEventListener('mouseup', (event) => {
  if (event.button === 0) shooting = false;
  if (event.button === 2) setScoped(false);
});
document.addEventListener('contextmenu', (event) => event.preventDefault());

function reload() {
  const info = currentWeapon();
  if (reloading || ammo >= info.magazine || reserve <= 0 || health <= 0) return;
  reloading = true;
  const token = ++reloadToken;
  const reloadingWeapon = weapon;
  update();
  sound(180, 0.15, 'triangle');
  window.setTimeout(() => {
    if (token !== reloadToken || reloadingWeapon !== weapon) return;
    const amount = Math.min(info.magazine - ammo, reserve);
    ammo += amount;
    reserve -= amount;
    reloading = false;
    update();
    sound(350, 0.09, 'triangle');
  }, info.reloadSeconds * 1000);
}

function showHitmarker() {
  $('hitmarker').style.opacity = 1;
  window.setTimeout(() => { $('hitmarker').style.opacity = 0; }, 100);
}

function eliminateEnemy(enemy) {
  if (!enemy.alive) return;
  enemy.alive = false;
  enemy.mesh.rotation.z = Math.PI / 2;
  enemy.mesh.position.y = floorHeight(enemy.mesh.position.x, enemy.mesh.position.z) + 0.25;
  kills++;
  money += 300;
  const line = document.createElement('div');
  line.textContent = `VANGUARD  ▬  ${weapon}  ▸  HOSTILE ${enemies.indexOf(enemy) + 1}`;
  $('killfeed').prepend(line);
  while ($('killfeed').children.length > 4) $('killfeed').lastElementChild.remove();
  if (kills === 5) endRound(true);
}

function shoot(now) {
  const info = currentWeapon();
  if (now - lastShot < info.fireDelay || reloading || health <= 0 || !playing) return;
  if (ammo <= 0) {
    reload();
    return;
  }
  lastShot = now;
  ammo--;
  sound(info.kind === 'pistol' ? 195 : 145, 0.13, 'sawtooth', 0.055);
  const firedFlash = flash;
  if (firedFlash) {
    firedFlash.visible = true;
    window.setTimeout(() => { firedFlash.visible = false; }, 55);
  }
  if (!scoped) gun.position.z = -0.46;
  pitch = Math.max(-1.45, Math.min(1.45, pitch + (info.kind === 'sniper' ? 0.025 : 0.006)));

  const targets = [
    ...enemies.filter((enemy) => enemy.alive).map((enemy) => enemy.mesh),
    ...scene.children.filter((object) => object.isMesh && !object.userData.enemy),
  ];
  let hit = false;
  for (let pellet = 0; pellet < info.pellets; pellet++) {
    const spread = scoped ? 0 : info.spread;
    const offset = info.pellets === 1
      ? new THREE.Vector2(0, 0)
      : new THREE.Vector2((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread);
    ray.setFromCamera(offset, camera);
    const intersections = ray.intersectObjects(targets, true);
    const enemyGroup = intersections[0]?.object.userData.enemy;
    if (!enemyGroup) continue;
    const enemy = enemies.find((candidate) => candidate.mesh === enemyGroup);
    if (!enemy?.alive) continue;
    const headshot = intersections[0].point.y - enemy.mesh.position.y > 1.5;
    enemy.hp -= headshot ? Math.max(100, info.damage * 2.5) : info.damage;
    hit = true;
    if (enemy.hp <= 0) eliminateEnemy(enemy);
  }
  if (hit) showHitmarker();
  update();
}

function endRound(won) {
  if (roundEnding) return;
  roundEnding = true;
  $('roundMessage').textContent = won ? 'SECTOR SECURED' : 'ROUND LOST';
  if (won) {
    round++;
    $('ctscore').textContent = round;
    money += 3250;
  } else {
    $('tscore').textContent = Number($('tscore').textContent) + 1;
    money += 1400;
  }
  update();
  const wasPlaying = playing;
  playing = false;
  shooting = false;
  keys = {};
  setScoped(false);
  window.setTimeout(() => {
    reset();
    if (wasPlaying && document.pointerLockElement) {
      playing = true;
      gun.visible = true;
    }
  }, 3500);
}

function canMove(x, z) {
  return canOccupy(colliders, x, z, camera.position.y - 1.7);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.04);
  const time = clock.elapsedTime;
  if (playing) {
    camera.rotation.set(pitch, yaw, 0);
    const forward = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    let speed = (keys.ShiftLeft ? 2.3 : 4.7) * delta;
    if (forward && strafe) speed *= 0.707;
    const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * speed;
    const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * speed;
    if (canMove(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
    if (canMove(camera.position.x, camera.position.z + dz)) camera.position.z += dz;
    vertical -= 12 * delta;
    const ground = floorHeight(camera.position.x, camera.position.z) + 1.7;
    camera.position.y = Math.max(ground, camera.position.y + vertical * delta);
    if (camera.position.y === ground) vertical = 0;
    drawRadar();

    walk += (Math.abs(forward) + Math.abs(strafe)) * delta * 9;
    gun.position.x = 0.28 + Math.sin(walk) * 0.012;
    gun.position.y = -0.28 + Math.cos(walk * 2) * 0.01;
    gun.position.z = THREE.MathUtils.lerp(gun.position.z, -0.52, delta * 14);
    gun.rotation.z = reloading ? Math.sin(time * 5) * 0.3 : 0;
    gun.rotation.x = reloading ? -0.45 : 0;
    if (shooting) shoot(time);

    seconds -= delta;
    $('timer').textContent = `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;
    if (seconds <= 0) endRound(false);

    for (const enemy of enemies) {
      if (!enemy.alive || roundEnding) continue;
      const distance = enemy.mesh.position.distanceTo(camera.position);
      enemy.mesh.lookAt(camera.position.x, enemy.mesh.position.y, camera.position.z);
      enemy.mesh.rotateY(Math.PI);
      const x = enemy.home.x + Math.sin(time * 0.6 + enemy.phase) * 1.2;
      const z = enemy.home.z + Math.cos(time * 0.4 + enemy.phase) * 0.6;
      if (canOccupy(colliders, x, z)) enemy.mesh.position.set(x, floorHeight(x, z), z);
      enemy.shootAt -= delta;
      if (enemy.shootAt <= 0 && distance < 25) {
        enemy.shootAt = 1.5 + Math.random() * 1.5;
        const origin = enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const direction = camera.position.clone().sub(origin).normalize();
        ray.set(origin, direction);
        const walls = ray.intersectObjects(scene.children.filter((object) => object.isMesh && !object.userData.enemy), false);
        if (!walls.length || walls[0].distance > distance - 0.4) {
          health = Math.max(0, health - 8 - Math.floor(Math.random() * 8));
          $('damage').style.opacity = 0.6;
          window.setTimeout(() => { $('damage').style.opacity = 0; }, 150);
          sound(80, 0.12, 'triangle', 0.025);
          update();
          if (health === 0) {
            endRound(false);
            break;
          }
        }
      }
    }
  } else if (!document.pointerLockElement && !buying) {
    camera.position.set(25 + Math.sin(time * 0.025) * 1.2, 13, 32);
    camera.lookAt(-1, 1, -14);
  }
  renderer.render(scene, camera);
}

function renderBuyCategories() {
  const categoryHost = $('buyCategories');
  categoryHost.innerHTML = buyCategories.map((category) => {
    const count = category.id === 'ALL'
      ? weapons.length
      : weapons.filter((item) => item.category === category.id).length;
    return `<button class="buy-category${buyCategory === category.id ? ' active' : ''}" type="button" data-category="${category.id}" aria-pressed="${buyCategory === category.id}"><span>${category.label}</span><small>${String(count).padStart(2, '0')}</small></button>`;
  }).join('');
}

function renderWeaponGrid() {
  const query = buySearch.trim().toLowerCase();
  const visibleWeapons = weapons.filter((item) => {
    const matchesCategory = buyCategory === 'ALL' || item.category === buyCategory;
    const searchable = `${item.name} ${item.category} ${item.ammoType} ${item.description}`.toLowerCase();
    return matchesCategory && (!query || searchable.includes(query));
  });
  $('buyResultCount').textContent = `${String(visibleWeapons.length).padStart(2, '0')} AVAILABLE`;
  $('buyGridTitle').textContent = buyCategory === 'ALL'
    ? 'ALL WEAPONS'
    : buyCategories.find((category) => category.id === buyCategory)?.label || 'ALL WEAPONS';
  if (!visibleWeapons.length) {
    $('buyGrid').innerHTML = '<div class="buy-empty"><b>NO MATCHING WEAPONS</b><span>Try another search or category.</span></div>';
    return;
  }
  $('buyGrid').innerHTML = visibleWeapons.map((item, index) => {
    const selected = item.name === weapon;
    const affordable = money >= item.price;
    const capacity = item.reserve > 0 ? `${item.magazine} / ${item.reserve}` : `${item.magazine} / SINGLE`;
    const optic = item.scoped ? '<span class="card-optic">OPTIC · RMB</span>' : '';
    return `<button class="weapon-card${selected ? ' equipped' : ''}${affordable ? '' : ' unaffordable'}" type="button" data-weapon="${item.name}" aria-label="Buy and equip ${item.name} for ${formatMoney(item.price)}">
      <span class="card-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="card-kind">${item.category}${optic}</span>
      <span class="weapon-silhouette ${item.kind}" aria-hidden="true"><i></i><b></b></span>
      <strong class="card-name">${item.name}</strong>
      <span class="card-description">${item.description}</span>
      <span class="card-capacity">MAG <b>${capacity}</b></span>
      <span class="card-bottom"><span>${selected ? 'EQUIPPED' : affordable ? 'BUY & EQUIP' : 'INSUFFICIENT FUNDS'}</span><b>${formatMoney(item.price)}</b></span>
    </button>`;
  }).join('');
}

function setBuyNotice(message, kind = '') {
  const notice = $('buyNotice');
  notice.textContent = message;
  notice.className = `buy-notice${kind ? ` ${kind}` : ''}`;
  window.clearTimeout(buyNoticeTimer);
  if (kind === 'success') {
    buyNoticeTimer = window.setTimeout(() => setBuyNotice('BROWSE ARMORY · SELECT TO EQUIP'), 2500);
  }
}

function openBuyMenu() {
  if (buying || roundEnding) return;
  resumeAfterBuy = playing && Boolean(document.pointerLockElement);
  if (resumeAfterBuy) {
    savedPosition.copy(camera.position);
    playing = false;
    shooting = false;
    keys = {};
    setScoped(false);
  }
  buying = true;
  buyCategory = 'ALL';
  buySearch = '';
  $('buySearch').value = '';
  renderBuyCategories();
  renderWeaponGrid();
  $('buyEquipped').textContent = currentWeapon().name.toUpperCase();
  setBuyNotice('BROWSE ARMORY · SELECT TO EQUIP');
  buyMenu.classList.remove('hidden');
  $('buySearch').focus();
  if (document.pointerLockElement) document.exitPointerLock();
}

function closeBuyMenu() {
  if (!buying) return;
  buyMenu.classList.add('hidden');
  buying = false;
  if (resumeAfterBuy) {
    camera.position.copy(savedPosition);
    camera.rotation.set(pitch, yaw, 0);
    playing = true;
    $('menu').classList.add('hidden');
    $('hud').classList.remove('hidden');
    document.body.classList.add('playing');
    gun.visible = true;
    renderer.domElement.requestPointerLock?.();
  }
  resumeAfterBuy = false;
}

function purchaseWeapon(name) {
  const item = weaponByName[name];
  if (!item) return;
  if (money < item.price) {
    setBuyNotice(`NOT ENOUGH FUNDS · ${formatMoney(item.price - money)} NEEDED`, 'error');
    sound(90, 0.12, 'triangle', 0.025);
    return;
  }
  money -= item.price;
  equipWeapon(item.name);
  if (!modal.classList.contains('hidden') && $('modalBody').dataset.view === 'loadout') showLoadout();
  setBuyNotice(`${item.name.toUpperCase()} PURCHASED · READY TO DEPLOY`, 'success');
  renderWeaponGrid();
  sound(420, 0.08, 'triangle', 0.035);
}

$('buyCategories').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  buyCategory = button.dataset.category;
  renderBuyCategories();
  renderWeaponGrid();
});
$('buyGrid').addEventListener('click', (event) => {
  const button = event.target.closest('[data-weapon]');
  if (button) purchaseWeapon(button.dataset.weapon);
});
$('buySearch').addEventListener('input', (event) => {
  buySearch = event.target.value;
  renderWeaponGrid();
});
$('closeBuy').addEventListener('click', closeBuyMenu);
buyMenu.addEventListener('click', (event) => {
  if (event.target === buyMenu) closeBuyMenu();
});

function showFieldManual() {
  $('modalBody').dataset.view = 'manual';
  $('modalBody').innerHTML = `
    <div class="eyebrow">KNOW YOUR ADVANTAGE</div>
    <h2>FIELD MANUAL</h2>
    <p>Eliminate all five hostiles before the clock runs out. Use cover, check your corners, and make every shot count.</p>
    <p><b>W A S D</b> — Move &nbsp; <b>MOUSE</b> — Aim<br>
      <b>LEFT CLICK</b> — Fire &nbsp; <b>R</b> — Reload<br>
      <b>SHIFT</b> — Walk &nbsp; <b>SPACE</b> — Jump<br>
      <b>B</b> — Buy weapons &nbsp; <b>RIGHT CLICK</b> — Scope<br>
      <b>ESC</b> — Pause / close buy menu</p>
    <p>Headshots are lethal; weapon damage, magazine size, and reload speed vary by weapon. Scoped rifles zoom while right mouse is held. Earn cash for eliminations and round results.</p>`;
}

function showLoadout() {
  const info = currentWeapon();
  $('modalBody').dataset.view = 'loadout';
  $('modalBody').innerHTML = `
    <div class="eyebrow">PREPARE FOR CONTACT</div>
    <h2>YOUR LOADOUT</h2>
    <p>Equipped: <b>${info.name}</b> · ${info.category.toLowerCase()} · ${info.ammoType}.<br>
      Training funds available: <b>${formatMoney(money)}</b>.</p>
    <p>Open the armory to purchase and equip any CS2 firearm, the Zeus x27, or the custom scoped Marshal.</p>
    <button class="modal-action" id="loadoutOpenBuy" type="button">OPEN BUY MENU <span>B</span></button>`;
}

$('closeModal').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (event) => {
  if (event.target === modal) modal.classList.add('hidden');
  if (event.target.closest('#loadoutOpenBuy')) openBuyMenu();
});
document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.tab === 'play') {
      modal.classList.add('hidden');
      return;
    }
    modal.classList.remove('hidden');
    if (button.dataset.tab === 'how') showFieldManual();
    else showLoadout();
  });
});

$('buyMenu').addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    const focusable = [...buyMenu.querySelectorAll('button:not(:disabled), input')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

buildGunModel();
renderBuyCategories();
renderWeaponGrid();
update();
animate();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
