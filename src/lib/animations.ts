import { CatmullRomCurve3, Euler, Object3D, Quaternion, Vector3 } from 'three';
import { clock, expect, sendEvent } from './globals';
import { setCardData } from './card';

export interface AnimationOpts {
  from?: {
    position?: Vector3;
    rotation?: Euler;
    quarternion?: Quaternion;
  };
  to?: {
    position?: Vector3;
    rotation?: Euler;
    quarternion?: Quaternion;
  };
  path?: CatmullRomCurve3;
  duration: number;
  start?: number;
  completeOnCancel?: boolean;
  onComplete?: () => void;
}

export interface AnimationGroup {
  animatingObjects: Set<{ obj: Object3D } & AnimationOpts>;
  animationMap: Map<string, any>;
}

export const animationGroupQueue: AnimationGroup[] = [];
queueAnimationGroup();

export function queueAnimationGroup(emit?: boolean) {
  if (emit) {
    sendEvent({ type: 'queueAnimationGroup' });
  }
  animationGroupQueue.push({
    animatingObjects: new Set<{ obj: Object3D } & AnimationOpts>(),
    animationMap: new Map<string, any>(),
  });
}

export function animateObject(obj: Object3D, opts: AnimationOpts) {
  expect(animationGroupQueue.length > 0, `animationGroupQueue empty!`);
  const { animationMap, animatingObjects } = animationGroupQueue.at(-1)!;

  if (animationMap.has(obj.uuid)) {
    let animation = animationMap.get(obj.uuid);
    if (animation.completeOnCancel) renderAnimation(animationMap.get(obj.uuid), 1);
    cancelAnimation(obj);

    animatingObjects.delete(animation);
    animationMap.delete(obj.uuid);
  }

  if (!opts.from) {
    opts.from = {};
  }

  if (opts.to?.position && !opts.from.position) {
    opts.from.position = obj.position.clone();
  }

  if (opts.to?.rotation && !opts.from.rotation) {
    opts.from.rotation = obj.rotation.clone();
  }

  if (opts.to?.rotation) {
    opts.from.quarternion = new Quaternion().setFromEuler(opts.from.rotation);
    opts.to.quarternion = new Quaternion().setFromEuler(opts.to.rotation);
  }

  let animation = {
    obj,
    ...opts,
    start: clock.elapsedTime,
  };

  setCardData(obj, 'isAnimating', true);
  animationMap.set(obj.uuid, animation);
  animatingObjects.add(animation);
}

export function cancelAnimation(obj: Object3D) {
  const { animationMap, animatingObjects } = animationGroupQueue.at(-1)!;
  let animation = animationMap.get(obj.uuid);
  animationMap.delete(obj.uuid);
  animatingObjects.delete(animation);
}

function renderAnimation(animation, delta: number): boolean {
  if (animation.path) {
    animation.path.getPointAt(delta, animation.obj.position);
  }

  if (animation.to?.position) {
    animation.obj.position.copy(
      animation.from!.position!.clone().lerp(animation.to.position, delta)
    );
  }
  if (animation.to?.rotation) {
    animation.obj.rotation.setFromQuaternion(
      animation.from!.quarternion!.clone().slerp(animation.to.quarternion!.clone(), delta)
    );
  }

  if (delta >= 1) {
    setCardData(animation.obj, 'isAnimating', false);
    if (animation.onComplete) {
      animation.onComplete();
    }
    return true;
  }
  return false;
}

export function renderAnimations(time: number) {
  expect(animationGroupQueue.length > 0, `animationGroupQueue empty!`);
  const { animatingObjects, animationMap } = animationGroupQueue[0];
  for (const animation of animatingObjects) {
    let t = Math.max(0, Math.min((time - animation.start) / animation.duration, 1));
    if (renderAnimation(animation, t)) {
      animatingObjects.delete(animation);
      animationMap.delete(animation.obj.uuid);
    }
  }
  if (animatingObjects.size < 1 && animationGroupQueue.length > 1) {
    animatingObjects.clear();
    animationGroupQueue[0].animationMap.clear();
    animationGroupQueue.shift();
    animationGroupQueue[0].animatingObjects.forEach(animation => {
      animation.start = clock.elapsedTime;
    });
  }
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
