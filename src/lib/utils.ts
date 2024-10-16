import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { get, set } from 'lodash-es';
import { twMerge } from 'tailwind-merge';
import { Euler, Object3D, Quaternion, Vector3 } from 'three';
import { CARD_WIDTH } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function isVectorEqual(a: Vector3, b: Vector3) {
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
export function cleanupFromNode(root: Object3D, isScene?: boolean) {
  root.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    if (object.material.isMaterial) {
      cleanMaterial(object.material);
    } else {
      for (const material of object.material) cleanMaterial(material);
    }
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

  if (target.userData.isFlipped) {
    worldDirection.multiply(new Vector3(-1, -1, -1));
    rotation.y += Math.PI;
    rotation.z *= -1;
  }

  let position = targetWorldPosition.add(
    worldDirection.multiply(new Vector3(distance, distance, distance))
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
