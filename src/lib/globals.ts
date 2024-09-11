import { createSignal } from 'solid-js';
import {
  ArrowHelper,
  BoxGeometry,
  Clock,
  Euler,
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
import { WebsocketProvider } from 'y-websocket';
import { Doc } from 'yjs';
import { YArray } from 'yjs/dist/src/internals';
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
export let provider: WebsocketProvider;

export function init({ gameId }) {
  provider = new WebsocketProvider('wss://ws.arcanetable.app', gameId, ydoc);

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

  // let focusWidth = 750;
  // let focusHeight = 700;
  let focusHeight = window.innerHeight * 0.5;

  let focusWidth = (focusHeight / 700) * 750;

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
    worldRotation.z *= -1;
  }

  let position = targetWorldPosition.add(
    worldDirection.multiply(new Vector3(distance, distance, distance))
  );

  return {
    position,
    rotation: worldRotation,
  };
}

export function updateFocusCamera(target: Object3D, offset = new Vector3(CARD_WIDTH / 4, 0, 0)) {
  if (focusCamera.userData.isAnimating) return;

  let { position, rotation } = getFocusCameraPositionRelativeTo(target, offset);

  focusCamera.position.copy(position);

  focusCamera.lookAt(target.getWorldPosition(new Vector3()));
  focusCamera.rotation.copy(rotation);
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

  cleanupFromNode(scene);
}

export function cleanupFromNode(root: Object3D) {
  root.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    if (object.material.isMaterial) {
      cleanMaterial(object.material);
    } else {
      for (const material of object.material) cleanMaterial(material);
    }
    root.remove(object)
  });
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
