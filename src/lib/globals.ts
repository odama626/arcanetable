import { createSignal } from 'solid-js';
import {
  ArrowHelper,
  Box3,
  BoxGeometry,
  CameraHelper,
  CatmullRomCurve3,
  Clock,
  Euler,
  Group,
  LoadingManager,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three';
import { WebrtcProvider } from 'y-webrtc';
import { Doc } from 'yjs';
import { YArray } from 'yjs/dist/src/internals';
import { cleanMaterial } from '~/main3d';
import { Card, CARD_WIDTH } from './card';
import { PlayArea } from './playArea';

export function expect(test: boolean, message: string, ...supplemental: any) {
  if (!test) {
    console.error(message, ...supplemental);
    throw new Error(message);
  }
}

export interface CardZone {
  mesh: Object3D;
  removeCard?(cardMesh: Mesh): void;
  addCard(card: Card, opts?: { skipAnimation?: boolean; position?: Vector3 }): void;
  getSerializable(): { id: string };
}

export let clock: Clock;
export let loadingManager: LoadingManager;
export let textureLoader: TextureLoader;
export let renderer: WebGLRenderer;
export let scene: Scene;
export let camera: PerspectiveCamera;
export let focusRenderer: WebGLRenderer;
export let focusCamera: PerspectiveCamera;
export let [hoverSignal, setHoverSignal] = createSignal();
export let cardsById = new Map<string, Card>();
export let zonesById = new Map<string, CardZone>();
export let playAreas = new Map<number, PlayArea>();
export let [peekFilterText, setPeekFilterText] = createSignal('');
export const ydoc = new Doc();
export let table: Object3D;
export let gameLog: YArray<any>;
export let [animating, setAnimating] = createSignal(false);
export let [players, setPlayers] = createSignal([]);
export let [deckIndex, setDeckIndex] = createSignal();
export let focusRayCaster: Raycaster;

export let arrowHelper = new ArrowHelper();

export const [scrollTarget, setScrollTarget] = createSignal();

export let provider: WebrtcProvider;

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function init({ gameId }) {
  provider = new WebrtcProvider(gameId, ydoc, {
    signaling: ['wss://signaling.arcanetable.app'],
  });

  clock = new Clock();
  loadingManager = new LoadingManager();
  loadingManager.onProgress = function (item, loaded, total) {
    console.log(item, loaded, total);
  };
  textureLoader = new TextureLoader(loadingManager);

  camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.z = 250;

  renderer = new WebGLRenderer();
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.draggable = true;
  // renderer.setClearColor(0x9d9eae)
  renderer.setClearColor(0x05050e);

  let focusWidth = 750;
  let focusHeight = 700;
  focusRenderer = new WebGLRenderer();
  focusRenderer.setPixelRatio(window.devicePixelRatio);
  focusRenderer.setSize(focusWidth, focusHeight);

  focusCamera = new PerspectiveCamera(50, focusWidth / focusHeight, 1, 2000);

  // let helper = new CameraHelper(focusCamera);

  scene = new Scene();

  scene.add(arrowHelper);

  focusRayCaster = new Raycaster();

  // scene.add(helper);

  const tableGeometry = new BoxGeometry(200, 200, 5);
  const tableMaterial = new MeshStandardMaterial({ color: 0xdeb887 });
  table = new Mesh(tableGeometry, tableMaterial);
  table.rotateX(Math.PI * -0.3);
  table.position.set(0, 0, 50);
  table.receiveShadow = true;
  table.userData.zone = 'battlefield';
  scene.add(table);
  gameLog = ydoc.getArray('gameLog');
}

export function sendEvent(event) {
  event.clientID = provider.awareness.clientID;
  gameLog.push([event]);
}


export async function sha1(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
export function getFocusCameraPositionRelativeTo(target: Object3D, offset: Vector3) {
  let distance = 30;
  let targetWorldPosition = target.localToWorld(offset);
  let worldDirection = target.getWorldDirection(new Vector3());
  let worldRotation = getGlobalRotation(target);

  if (target.userData.isFlipped) {
    worldDirection.multiply(new Vector3(-1, -1, -1));
    worldRotation.y += Math.PI;
  }

  let position = targetWorldPosition.add(
    worldDirection.multiply(new Vector3(distance, distance, distance))
  );

  // focusCamera.lookAt(target.getWorldPosition(new Vector3()));
  return {
    position,
    rotation: worldRotation,
  };
  // focusCamera.rotation.copy(worldRotation);}
}

export function updateFocusCamera(target: Object3D, offset = new Vector3(CARD_WIDTH / 4, 0, 0)) {
  if (focusCamera.userData.isAnimating) return;

  let { position, rotation } = getFocusCameraPositionRelativeTo(target, offset);

  focusCamera.position.copy(position);

  focusCamera.lookAt(target.getWorldPosition(new Vector3()));
  focusCamera.rotation.copy(rotation);
}


function fitCameraToObject(camera, object, offset) {
  offset = offset || 1.5;

  const boundingBox = new Box3();

  boundingBox.setFromObject(object);

  const center = boundingBox.getCenter(new Vector3());
  const size = boundingBox.getSize(new Vector3());

  const startDistance = center.distanceTo(camera.position);
  // here we must check if the screen is horizontal or vertical, because camera.fov is
  // based on the vertical direction.
  const endDistance =
    camera.aspect > 1
      ? (size.y / 2 + offset) / Math.abs(Math.tan(camera.fov / 2))
      : (size.y / 2 + offset) / Math.abs(Math.tan(camera.fov / 2)) / camera.aspect;

  camera.position.set(
    (camera.position.x * endDistance) / startDistance,
    (camera.position.y * endDistance) / startDistance,
    (camera.position.z * endDistance) / startDistance
  );
  camera.lookAt(center);
}

export async function animateCardToNewLocalPosition(
  cardMesh: Group,
  newParent: Group,
  localPath: Vector3[],
  duration: number = 0.2
) {
  let initialPosition = new Vector3();
  cardMesh.getWorldPosition(initialPosition);
  let quarternion = new Quaternion().setFromEuler(cardMesh.parent.rotation).invert();
  newParent.add(cardMesh);
  cardMesh.position.copy(initialPosition);

  newParent.worldToLocal(initialPosition);

  return new Promise<void>(resolve =>
    animateObject(cardMesh, {
      duration,
      path: new CatmullRomCurve3([initialPosition, ...localPath]),
      to: {
        quarternion,
      },
      onComplete: resolve,
    })
  );
}

interface AnimationOpts {
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
  onComplete?: () => void;
}

interface AnimationGroup {
  animatingObjects: Set<{ obj: Object3D } & AnimationOpts>;
  animationMap: Map<string, any>;
}

const animationGroupQueue: AnimationGroup[] = [];
queueAnimationGroup();

export function queueAnimationGroup() {
  animationGroupQueue.push({
    animatingObjects: new Set<{ obj: Object3D } & AnimationOpts>(),
    animationMap: new Map<string, any>(),
  });
}
export function animateObject(obj: Object3D, opts: AnimationOpts) {
  expect(animationGroupQueue.length > 0, `animationGroupQueue empty!`);
  const { animationMap, animatingObjects } = animationGroupQueue.at(-1)!;
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

  if (animationMap.has(obj.uuid)) {
    animatingObjects.delete(animationMap.get(obj.uuid));
    animationMap.delete(obj.uuid);
  }

  obj.userData.isAnimating = true;
  animationMap.set(obj.uuid, animation);
  animatingObjects.add(animation);
}

export function cancelAnimation(obj: Object3D) {
  const { animationMap, animatingObjects } = animationGroupQueue.at(-1)!;
  animationMap.delete(obj.uuid);
  animatingObjects.delete(obj.uuid);
  obj.userData.isAnimating = false;
}

export function renderAnimations(time: number) {
  expect(animationGroupQueue.length > 0, `animationGroupQueue empty!`);
  const { animatingObjects } = animationGroupQueue[0];
  for (const animation of animatingObjects) {
    let t = Math.max(0, Math.min((time - animation.start) / animation.duration, 1));

    if (animation.path) {
      animation.path.getPointAt(t, animation.obj.position);
    }

    if (animation.to?.position) {
      animation.obj.position.copy(animation.from!.position!.clone().lerp(animation.to.position, t));
    }
    if (animation.to?.rotation) {
      animation.obj.rotation.setFromQuaternion(
        animation.from!.quarternion!.clone().slerp(animation.to.quarternion!.clone(), t)
      );
    }

    if (t === 1) {
      animation.obj.userData.isAnimating = false;
      if (animation.onComplete) {
        animation.onComplete();
      }
      animatingObjects.delete(animation);
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

export function getProjectionVec(vec: Vector3) {
  let canvas = renderer.domElement;
  let projectionVec = vec.clone();
  projectionVec.project(camera);
  projectionVec.x = Math.round(
    (0.5 + projectionVec.x / 2) * (canvas.width / window.devicePixelRatio)
  );
  projectionVec.y = Math.round(
    (0.5 - projectionVec.y / 2) * (canvas.height / window.devicePixelRatio)
  );
  return projectionVec;
}

export function getGlobalRotation(mesh: Object3D) {
  let initialQuart = new Quaternion();
  mesh.getWorldQuaternion(initialQuart);
  let euler = new Euler().setFromQuaternion(initialQuart);
  return euler;
}

export function cleanup() {
  cardsById.clear();
  zonesById.clear();
  setPeekFilterText('');
  setHoverSignal();
  setScrollTarget();

  provider?.destroy();
  ydoc.destroy();
  setAnimating(false);
  setPlayers([]);

  if (!renderer) return;

  renderer.domElement.remove();
  renderer.dispose();

  focusRenderer.dispose();
  focusRenderer.domElement.remove();

  scene.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    if (object.material.isMaterial) {
      cleanMaterial(object.material);
    } else {
      for (const material of object.material) cleanMaterial(material);
    }
  });
}
