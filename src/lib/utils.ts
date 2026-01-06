import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import get from 'lodash-es/get';
import set from 'lodash-es/set';
import { twMerge } from 'tailwind-merge';
import { Euler, Intersection, Matrix4, Mesh, Object3D, Quaternion, Vector3 } from 'three';
import { CARD_THICKNESS, CARD_WIDTH } from './constants';
import { provider, zonesById } from './globals';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function isVectorEqual(a: Vector3 | Euler, b: Vector3 | Euler) {
  if (!a || !b) return false;
  let ab = a.toArray();
  let bb = b.toArray();
  for (let i in ab) {
    if (ab[i] !== bb[i]) return false;
  }
  return true;
}
export function hydratePathWith<T>(obj: any, path: string[], hydrator: (value: any) => T) {
  if (get(obj, path)) {
    set(obj, path, hydrator(get(obj, path)));
  }
}
export function cleanMaterial(material: Material) {
  material.dispose();

  // dispose textures
  for (const key of Object.keys(material)) {
    const value = material[key];
    if (value && typeof value === 'object' && 'minFilter' in value) {
      value.dispose();
    }
  }
}

export function isValidMaterial(mat) {
  return mat && mat.isMaterial === true && typeof mat.onBeforeRender === 'function';
}

export function sanityCheckMaterial(mat) {
  if (!isValidMaterial(mat)) {
    console.warn(`Invalid material referenced`, mat);
  }
}

export function cleanupMesh(object: Mesh) {
  if (!object.isMesh) return;
  object.geometry.dispose();
  if (object.material.isMaterial) {
    cleanMaterial(object.material);
  } else {
    for (const material of object.material) cleanMaterial(material);
  }
}

export function cleanupFromNode(root: Object3D, isScene?: boolean) {
  root.traverse(object => {
    if (!object.isMesh) return;
    cleanupMesh(object);
    if (!isScene) root.remove(object);
  });
}

export function getGlobalRotation(mesh: Object3D) {
  let initialQuart = new Quaternion();
  mesh.getWorldQuaternion(initialQuart);
  let euler = new Euler().setFromQuaternion(initialQuart);
  return euler;
}
export function getFocusCameraPositionRelativeTo(target: Object3D, offset: Vector3) {
  let distance = 26;
  let localOffset = new Vector3(target.userData.isFlipped ? -CARD_WIDTH / 2 : 0, -1, 0);

  let targetWorldPosition = target.localToWorld(offset.clone().add(localOffset));
  let worldDirection = target.getWorldDirection(new Vector3());
  let rotation = getGlobalRotation(target);

  let isOwner = target.userData.clientId === provider.awareness.clientID;
  let isDoubleSided = target.userData.isDoubleSided;

  if (target.userData.isFlipped && !(isOwner && !isDoubleSided)) {
    worldDirection.multiply(new Vector3(-1, -1, -1));
    rotation.y += Math.PI;
    rotation.z *= -1;
  }

  let position = targetWorldPosition.add(
    worldDirection.multiply(new Vector3(distance, distance, distance)),
  );

  return {
    position,
    rotation,
  };
}

export async function sha1(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function shuffleItems<T>(items: T[], order?: number[]) {
  let newOrder = [];
  for (let i = 0; i < items.length; i++) {
    let j = order?.[i] ?? (Math.random() * i) | 0;
    [items[i], items[j]] = [items[j], items[i]];
    newOrder[i] = j;
  }
  return newOrder;
}

export function restackItems<T>(items: T[], intersections: Intersection[]) {
  if (!intersections.length) return;

  let targetsById = Object.fromEntries(items.map(target => [target.userData.id, target]));
  let intersection = intersections.find(
    i =>
      !targetsById[i.object.userData.id] &&
      (i.object.userData.isInteractive || i.object.userData.zone),
  )!;
  for (const target of items) {
    if (!intersection) continue;
    let pointTarget = intersection.point.clone();
    let zone = zonesById.get(target.userData.zoneId)!;
    if (['hand', 'peek', 'tokenSearch'].includes(target.userData.location)) {
      let globalRotation = getGlobalRotation(target.parent);
      globalRotation.x += Math.PI / 2;
      let quarternion = new Quaternion().setFromEuler(globalRotation).invert();
      target.rotation.setFromQuaternion(quarternion);
    }
    target.parent.worldToLocal(pointTarget);

    let rotationMatrix = new Matrix4().makeRotationFromEuler(target.rotation);
    pointTarget.add(
      new Vector3().fromArray(target.userData.dragOffset).applyMatrix4(rotationMatrix),
    );

    pointTarget.add(new Vector3(0, 0, CARD_THICKNESS / 2));

    target.position.copy(pointTarget);
  }
}
