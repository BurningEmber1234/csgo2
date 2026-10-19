import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildMap, canOccupy, clearMap, ctPlayerSpawn, ctSpawns, ctTeammateSpawns, floorHeight, getMapTheme, locationName, mapCatalog, spawns } from '../src/map.js';

// Geometry can be tested without WebGL; only procedural texture drawing is stubbed.
const noop=()=>{};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({}, {get:()=>noop,set:()=>true})})};
const scene=new THREE.Scene();
const colliders=buildMap(scene);

test('side-by-side CT and T spawn rows have standing clearance',()=>{
  for(const [x,z] of [...ctSpawns,...spawns])assert.ok(canOccupy(colliders,x,z),`Blocked spawn ${x},${z}`);
  assert.deepEqual(ctPlayerSpawn,[0,29]);
  assert.equal(ctTeammateSpawns.length,4);
  for(const row of [ctSpawns,spawns]){
    assert.equal(new Set(row.map(([,z])=>z)).size,1,'All teammates share a spawn line');
    assert.deepEqual(row.map(([x])=>x),[-5,-2.5,0,2.5,5]);
  }
});
test('map ballot offers distinct themed battlefields',()=>{
  assert.deepEqual(mapCatalog.map(map=>map.id),['dust-sector','frostline','harbor-front']);
  assert.equal(new Set(mapCatalog.map(map=>map.name)).size,mapCatalog.length);
  assert.notEqual(getMapTheme('dust-sector').fog,getMapTheme('frostline').fog);
  assert.notEqual(getMapTheme('frostline').fog,getMapTheme('harbor-front').fog);
});
test('voted maps can be rebuilt and the previous map is removable',()=>{
  const alternateScene=new THREE.Scene();
  const frostColliders=buildMap(alternateScene,'frostline');
  assert.ok(frostColliders.length>0);
  for(const [x,z] of [...ctSpawns,...spawns])assert.ok(canOccupy(frostColliders,x,z),`Blocked Frostline spawn ${x},${z}`);
  assert.ok(alternateScene.children.some(object=>object.userData.mapObject));
  clearMap(alternateScene);
  assert.equal(alternateScene.children.length,0);
  const harborColliders=buildMap(alternateScene,'harbor-front');
  assert.ok(harborColliders.length>0);
  for(const [x,z] of [...ctSpawns,...spawns])assert.ok(canOccupy(harborColliders,x,z),`Blocked Harbor Front spawn ${x},${z}`);
  assert.equal(alternateScene.userData.activeMap,'harbor-front');
  clearMap(alternateScene);
  assert.equal(alternateScene.children.length,0);
});
test('mid doors and tunnels have standing clearance, outer walls contain player',()=>{
  assert.ok(canOccupy(colliders,0,-14));
  assert.ok(canOccupy(colliders,-20,0));
  assert.equal(canOccupy(colliders,-10,0),false);
  assert.equal(canOccupy(colliders,29,0),false);
});
test('A ramp rises continuously, platform cannot be entered through vertical edge',()=>{
  assert.equal(floorHeight(20,-14),0);
  assert.equal(floorHeight(20,-17),.625);
  assert.equal(floorHeight(20,-21),1.25);
  assert.equal(canOccupy(colliders,16,-22,0),false);
  for(let z=-14;z>=-22;z-=.1)assert.ok(canOccupy(colliders,18,z,floorHeight(18,z+.1)));
});
test('both bombsites and middle are reachable from CT spawn',()=>{
  const queue=[[0,29]],seen=new Set(['0,29']);
  for(let i=0;i<queue.length;i++){
    const [x,z]=queue[i];
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;
      if(!seen.has(key)&&canOccupy(colliders,nx,nz,floorHeight(x,z))){seen.add(key);queue.push([nx,nz]);}
    }
  }
  for(const p of [[20,-22],[-20,-21],[0,-20]])assert.ok(seen.has(p.join(',')),`No route to ${p}`);
});
test('location labels follow actual site and lane positions',()=>{
  assert.equal(locationName(0,29),'CT SPAWN');
  assert.equal(locationName(20,-22),'A PLATFORM');
  assert.equal(locationName(-20,-21),'B SITE');
});
