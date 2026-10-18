import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildMap, canOccupy, floorHeight, locationName, spawns } from '../src/map.js';

// Geometry can be tested without WebGL; only procedural texture drawing is stubbed.
const noop=()=>{};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({}, {get:()=>noop,set:()=>true})})};
const scene=new THREE.Scene();
const colliders=buildMap(scene);

test('spawn and hostile patrol centers have standing clearance',()=>{
  for(const [x,z] of [[0,29],...spawns])assert.ok(canOccupy(colliders,x,z),`Blocked spawn ${x},${z}`);
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
