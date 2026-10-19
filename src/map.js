import * as THREE from 'three';

export const mapCatalog = [
  {
    id: 'dust-sector',
    name: 'Dust Sector',
    label: 'DUST SECTOR',
    location: 'Al-Mazrah outskirts',
    time: '14:32',
    environment: 'DESERT',
    description: 'Sun-baked lanes, sandstone cover, and long sightlines.',
    accent: '#e4b66f',
  },
  {
    id: 'frostline',
    name: 'Frostline',
    label: 'FROSTLINE',
    location: 'Kara Ridge · Siberia',
    time: '03:14',
    environment: 'ARCTIC',
    description: 'A frozen relay station in blue-hour snowfall.',
    accent: '#9bd0dc',
  },
  {
    id: 'harbor-front',
    name: 'Harbor Front',
    label: 'HARBOR FRONT',
    location: 'Port of Kestrel',
    time: '05:47',
    environment: 'COASTAL',
    description: 'Industrial docks, weathered steel, and sea mist.',
    accent: '#d68b63',
  },
];

const mapThemes = {
  'dust-sector': {
    sand: '#d4bb8b', cream: '#e0cfaa', stone: '#b5a17c', paving: '#bfb295', timber: '#786346', blue: '#5f8587',
    steel: 0x47534b, recess: 0x353c37, rust: 0x9b6241, fog: 0xcac7b4, sky: 0xa8c7d4, sun: 0xffe0ac,
    label: '#963e25',
  },
  frostline: {
    sand: '#c3d0d0', cream: '#e0e8e4', stone: '#8eaaaf', paving: '#aebfc0', timber: '#647779', blue: '#5b9ba8',
    steel: 0x52696e, recess: 0x304247, rust: 0x96745f, fog: 0xb6cbd1, sky: 0x91b4c3, sun: 0xd5e8ed,
    label: '#507f88',
  },
  'harbor-front': {
    sand: '#929e95', cream: '#c4cabe', stone: '#707e78', paving: '#87948d', timber: '#665648', blue: '#457b80',
    steel: 0x405457, recess: 0x2c393a, rust: 0xb26445, fog: 0xaebdb6, sky: 0xa3c0c4, sun: 0xffd3a1,
    label: '#a75f43',
  },
};

export function getMapDefinition(id) {
  return mapCatalog.find((map) => map.id === id) || mapCatalog[0];
}

export function getMapTheme(id) {
  return mapThemes[id] || mapThemes['dust-sector'];
}

export const bounds = { minX: -28, maxX: 28, minZ: -35, maxZ: 34 };
export const ctSpawns = [[-5, 29], [-2.5, 29], [0, 29], [2.5, 29], [5, 29]];
export const ctPlayerSpawn = [0, 29];
export const ctTeammateSpawns = ctSpawns.filter(([x]) => x !== ctPlayerSpawn[0]);
export const spawns = [[-5, -31], [-2.5, -31], [0, -31], [2.5, -31], [5, -31]];
export const structures = [
  [-10, 22, 8, 13, 8], [11, 22, 9, 13, 10],
  [-10, 1, 9, 22, 9], [11, 0, 9, 24, 11],
  [-10, -22, 8, 13, 8], [10, -23, 8, 13, 9],
];
export function floorHeight(x, z) {
  if (x >= 15.6 && x <= 25.5) {
    if (z >= -30 && z <= -20) return 1.25;
    if (z > -20 && z < -14) return 1.25 * (-14 - z) / 6;
  }
  return 0;
}
export function canOccupy(colliders, x, z, feet = floorHeight(x, z)) {
  if (x < bounds.minX + .32 || x > bounds.maxX - .32 || z < bounds.minZ + .32 || z > bounds.maxZ - .32) return false;
  if (floorHeight(x, z) > feet + .35) return false;
  return !colliders.some(b => b.max.y > feet + .3 && b.min.y < feet + 1.65 &&
    x > b.min.x - .32 && x < b.max.x + .32 && z > b.min.z - .32 && z < b.max.z + .32);
}
export function locationName(x, z) {
  if (z > 16) return 'CT SPAWN';
  if (x > 15 && z < -19) return 'A PLATFORM';
  if (x > 15) return 'A LONG';
  if (x < -15 && z < -14) return 'B SITE';
  if (x < -15) return 'LOWER TUNNELS';
  if (z < -28) return 'CROSSOVER';
  return z < -12 ? 'MID DOORS' : 'MID';
}
export function clearMap(scene) {
  const mapObjects = scene.children.filter((object) => object.userData.mapObject);
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  for (const object of mapObjects) {
    object.traverse((child) => {
      if (child.geometry) geometries.add(child.geometry);
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of childMaterials) {
        if (!material) continue;
        materials.add(material);
        if (material.map) textures.add(material.map);
      }
    });
    scene.remove(object);
  }
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

export function buildMap(scene, mapId = 'dust-sector') {
  const firstMapObject = scene.children.length;
  const theme = getMapTheme(mapId);
  const colliders = [];
  function surface(color, mode = 'plaster') {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256);
    // Grain, chipped plaster and hand-laid stone are generated locally.
    for (let i = 0; i < 11000; i++) {
      ctx.fillStyle = Math.random() > .5 ? '#ffffff0c' : '#3b271415';
      ctx.fillRect(Math.random()*256, Math.random()*256, 1+Math.random()*4, 1+Math.random()*3);
    }
    if (mode === 'stone' || mode === 'paving') {
      ctx.strokeStyle = '#695f4845'; ctx.lineWidth = 2;
      const row = mode === 'paving' ? 64 : 32;
      for (let y=0; y<256; y+=row) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(256,y); ctx.stroke();
        for(let x=(y/row%2)*64; x<256; x+=128) {
          ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+row);ctx.stroke();
        }
      }
    }
    if(mode==='wood')for(let x=0;x<256;x+=32){ctx.fillStyle='#24190f50';ctx.fillRect(x,0,2,256);}
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({map, roughness:.95});
  }
  const sand=surface(theme.sand), cream=surface(theme.cream), stone=surface(theme.stone,'stone');
  const paving=surface(theme.paving,'paving');paving.map.repeat.set(32,40);
  const timber=surface(theme.timber,'wood'), blue=surface(theme.blue);
  const steel=new THREE.MeshStandardMaterial({color:theme.steel,roughness:.7,metalness:.35});
  const recess=new THREE.MeshStandardMaterial({color:theme.recess});
  const rust=new THREE.MeshStandardMaterial({color:theme.rust,roughness:.85});
  function box(w,h,d,x,y,z,mat=sand,solid=false) {
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);
    m.castShadow=m.receiveShadow=true;scene.add(m);
    if(solid)colliders.push(new THREE.Box3().setFromObject(m));return m;
  }
  function label(text,x,y,z,rotation=0,size=2,color=theme.label) {
    const c=document.createElement('canvas');c.width=512;c.height=256;
    const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold 115px Arial';ctx.fillText(text,256,170);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(size*2,size),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
    m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m);return m;
  }
  box(100,.3,110,0,-.2,0,paving);
  // Outer walls enclose the playable lanes, not invisible open desert.
  box(1,7,71,-28.5,3.5,-.5,stone,true);box(1,7,71,28.5,3.5,-.5,stone,true);
  box(57,7,1,0,3.5,-35.5,stone,true);box(57,6,1,0,3,34.5,stone,true);
  for(const [x,z,w,d,h] of structures) {
    const material=x<0?sand:cream;
    box(w,h,d,x,h/2,z,material,true);
    box(w+.35,.3,d+.35,x,h,z,stone);box(w+.15,.3,d+.15,x,1,z,stone);
    // Parapets and rooftop water tanks.
    for(const side of [-1,1])box(w,.7,.25,x,h+.4,z+side*d/2,material);
    box(1.5,1.3,1.5,x+1,h+.8,z,steel);
    for(const face of [-1,1]) {
      const facade=z+face*(d/2+.03);
      for(let xx=x-w/2+1.5;xx<x+w/2-1;xx+=2.8) {
        box(1,1.6,.12,xx,4.4,facade,recess);
        box(1.15,.14,.3,xx,3.55,facade,stone);
        for(const s of [-1,1])box(.43,1.6,.16,xx+s*.27,4.4,facade+face*.08,blue);
      }
    }
    // Side-facing shutters, lintels, and service doors visible from long lanes.
    for(const side of [-1,1]) {
      const wallX=x+side*(w/2+.04);
      for(let zz=z-d/2+2;zz<z+d/2-1;zz+=3.7) {
        box(.12,1.5,1,wallX,5.1,zz,blue);box(.28,.12,1.2,wallX,4.3,zz,stone);
      }
      box(.12,2.6,1.5,wallX,1.3,z,timber);
      box(.3,.2,1.9,wallX,2.7,z,stone);
      // Sun-faded striped awning over side door.
      const awning=box(1.8,.1,2.4,wallX+side*.8,3.1,z,blue);awning.rotation.z=-side*.12;
    }
  }
  // Mid: arched gateway and angled double doors leave a traversable central gap.
  box(3,6,1.6,-4.5,3,-14,stone,true);box(3,6,1.6,4.5,3,-14,stone,true);
  const arch=new THREE.Shape();arch.moveTo(-3,0);arch.absarc(0,0,3,Math.PI,0,true);arch.lineTo(3,3.3);arch.lineTo(-3,3.3);arch.closePath();
  const archMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(arch,{depth:1.6,bevelEnabled:false,curveSegments:20}),stone);
  archMesh.position.set(0,3.6,-14.8);archMesh.castShadow=archMesh.receiveShadow=true;scene.add(archMesh);
  for(const side of [-1,1]) {
    const door=box(1.65,3.4,.22,side*2.25,1.7,-14,timber);door.rotation.y=side*.35;
    colliders.push(new THREE.Box3().setFromObject(door));
    for(const y of [.5,1.8,2.9])box(1.7,.13,.12,side*2.25,y,-13.74,steel);
  }
  // B tunnel: shaded but open at both ends; its roof stays above player collision.
  box(9, .5, 13, -20, 4.5, 1, stone, true);
  for(const z of [-5,7]) {
    box(.6,4.2,1,-25,2.1,z,stone,true);box(.6,4.2,1,-15.6,2.1,z,stone,true);
    box(10,.4,1,-20.3,4,z,cream);
  }
  // Raised A platform with a continuous, walkable ramp instead of decorative steps.
  box(10,1.25,10,20.6,.575,-25,stone);
  const rampGeometry=new THREE.BufferGeometry();
  rampGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
    15.6,0,-14,25.6,0,-14,25.6,1.25,-20,
    15.6,0,-14,25.6,1.25,-20,15.6,1.25,-20],3));
  rampGeometry.computeVertexNormals();const ramp=new THREE.Mesh(rampGeometry,stone);ramp.receiveShadow=true;scene.add(ramp);
  box(.4,1.7,10,25.8,1,-25,cream,true);
  function crate(x,z,w=2.5,h=2.5,y=floorHeight(x,z)) {
    box(w,h,w,x,y+h/2,z,timber,true);
    for(const yy of [.14,h-.14])box(w+.04,.12,w+.04,x,y+yy,z,steel);
    for(const xx of [-w/2+.1,w/2-.1])box(.12,h,w+.06,x+xx,y+h/2,z,steel);
    const stripe=box(w*.8,.12,.04,x,y+h/2,z+w/2+.04,cream);stripe.rotation.z=.65;
  }
  crate(19,-26,2.7,2.5);crate(22,-26,2.7,2.5);crate(20.5,-26,2.4,2,3.75);
  crate(-22,-25,3,3);crate(-19,-25,2.8,2.8);crate(-22,-25,2.7,2,3);
  crate(-17,-18,2,1.4);crate(3,-25,2.4,2.4);crate(-3,6,2,1.6);
  function barrel(x,z) {
    const y=floorHeight(x,z);const m=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,1.3,14),steel);m.position.set(x,y+.65,z);m.castShadow=true;scene.add(m);colliders.push(new THREE.Box3().setFromObject(m));
    for(const dy of [.18,1.1]){const band=new THREE.Mesh(new THREE.TorusGeometry(.49,.035,4,14),rust);band.rotation.x=Math.PI/2;band.position.set(x,y+dy,z);scene.add(band);}
  }
  [[24,-9],[-24,-15],[-23,-16],[5,14],[-4,-31]].forEach(p=>barrel(...p));
  // Abandoned sedan adds low cover along A long.
  box(1.9,.8,4.2,24.3,.65,6,blue,true);box(1.6,.65,2,24.3,1.35,5.8,recess,true);
  for(const x of [23.35,25.25])for(const z of [4.5,7.5]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.2,12),recess);wheel.rotation.z=Math.PI/2;wheel.position.set(x,.4,z);scene.add(wheel);}
  for(const [x,z,letter] of [[20.5,-23,'A'],[-20,-21,'B']]) {
    const marking=label(letter,x,floorHeight(x,z)+.025,z,0,3);marking.rotation.x=-Math.PI/2;
    const points=[[-3,-3],[3,-3],[3,3],[-3,3],[-3,-3]].map(([dx,dz])=>new THREE.Vector3(x+dx,floorHeight(x,z)+.03,z+dz));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),rust));
  }
  label('A →',3.9,2.7,15.46,0,1.5);label('← B',-10,2.8,15.46,0,1.5);
  label('A',16.1,3.7,-20,Math.PI/2,2);label('B',-14.55,3,-22,Math.PI/2,2);
  label('MID',0,7,-13.12,0,1.3,'#61513c');
  // Satellite dishes, antennae and cables break up the roofline.
  for(const [x,z,w,d,h] of structures) {
    const dish=new THREE.Mesh(new THREE.SphereGeometry(.75,12,6,0,Math.PI*2,0,Math.PI*.45),cream);dish.position.set(x-1,h+1,z);dish.rotation.z=.4;scene.add(dish);
    box(.06,2,.06,x-1,h+.9,z,steel);
  }
  for(const z of [-10,12,30]) {
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-27,8,z),new THREE.Vector3(0,6.4,z+1),new THREE.Vector3(27,9,z)]);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)),new THREE.LineBasicMaterial({color:0x45463a})));
  }
  // Distant skyline stays outside the playable boundary.
  for(let i=0;i<12;i++){let x=-40+i*7,h=8+(i%4)*2;box(6,h,8,x,h/2,-43,i%2?cream:sand);}
  // Small environment-specific landmarks make each vote visibly distinct.
  if (mapId === 'frostline') {
    const ice = new THREE.MeshStandardMaterial({ color: 0x79b6c3, metalness: 0.28, roughness: 0.24, transparent: true, opacity: 0.62 });
    box(8, 0.045, 24, 0, -0.015, 1, ice);
    for (const [x, z] of [[-5, 4], [5, -6], [20, 5]]) box(2.4, 1.8, 2.4, x, 0.9, z, ice, true);
    for (const [x, z] of [[-23, 10], [23, 10], [-23, -10], [23, -10]]) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), ice);
      shard.position.set(x, 1.1, z);
      shard.scale.set(0.55, 1.65, 0.55);
      scene.add(shard);
    }
  } else if (mapId === 'harbor-front') {
    const water = new THREE.MeshStandardMaterial({ color: 0x284d56, metalness: 0.48, roughness: 0.24 });
    box(5, 0.08, 100, -32, -0.02, 0, water);
    box(5, 0.08, 100, 32, -0.02, 0, water);
    for (const [x, z, color] of [[-22, 12, 0x9c5d43], [22, 12, 0x496a70], [-22, -12, 0x687056], [22, -12, 0x9c5d43]]) {
      const container = new THREE.MeshStandardMaterial({ color, metalness: 0.36, roughness: 0.72 });
      box(3.6, 1.5, 2.2, x, 0.75, z, container, true);
      for (let rib = -1.4; rib <= 1.4; rib += 0.4) box(0.055, 1.48, 2.23, x + rib, 0.75, z, steel);
    }
  }

  for (const object of scene.children.slice(firstMapObject)) object.userData.mapObject = true;
  scene.userData.activeMap = mapId;
  return colliders;
}
