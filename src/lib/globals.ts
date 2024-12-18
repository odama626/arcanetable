import ColorHash from 'color-hash';
import * as Comlink from 'comlink';
import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import * as THREE from 'three';
import {
  ArrowHelper,
  BoxGeometry,
  Clock,
  LoadingManager,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WebrtcProvider } from 'y-webrtc';
import { WebsocketProvider } from 'y-websocket';
import { Doc } from 'yjs';
import { YArray } from 'yjs/dist/src/internals';
import { Card, CARD_WIDTH, CardZone } from './constants';
import type { PlayArea } from './playArea';
import TextureLoaderWorker from './textureLoaderWorker?worker';
import { cleanupFromNode, getFocusCameraPositionRelativeTo } from './utils';
import * as multiselect from './multiselect';

export function expect(test: boolean, message: string, ...supplemental: any) {
  if (!test) {
    console.error(message, ...supplemental);
    throw new Error(message);
  }
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
export let zonesById = new Map<string, CardZone<unknown>>();
export let [playAreas, setPlayAreas] = createStore<Record<number, PlayArea>>({});
export let [peekFilterText, setPeekFilterText] = createSignal('');
export let ydoc = new Doc();
export let table: Object3D;
export let gameLog: YArray<any>;
export let [animating, setAnimating] = createSignal(false);
export let [players, setPlayers] = createSignal([]);
export let [deckIndex, setDeckIndex] = createSignal();
export let [isInitialized, setIsIntitialized] = createSignal(false);
export let focusRayCaster: Raycaster;
export let arrowHelper = new ArrowHelper();
export const [scrollTarget, setScrollTarget] = createSignal();
export let provider: WebsocketProvider | WebrtcProvider;
export let [logs, setLogs] = createStore([]);
export let [processedEvents, setProcessedEvents] = createSignal(0);
export let [isSpectating, setIsSpectating] = createSignal(false);
export let [playerCount, setPlayerCount] = createSignal(0);
export let orbitControls: OrbitControls;
export const PLAY_AREA_ROTATIONS = [0, Math.PI, Math.PI / 2, Math.PI / 2 + Math.PI];
export const colorHashLight = new ColorHash({ lightness: 0.7 });
export const colorHashDark = new ColorHash({ lightness: 0.2 });
export const [selectedDeckIndex, setSelectedDeckIndex] = createSignal(undefined);
export let textureLoaderWorker;

export function doXTimes(x: number, callback, delay = 100): Promise<void> {
  if (x < 1) return Promise.resolve();
  return new Promise<void>(resolve => {
    new Array(x).fill(0).forEach((_, i) =>
      setTimeout(() => {
        callback();
        if (i === x - 1) resolve();
      }, delay * i)
    );
  });
}

export function doAfter(x: number, callback: Function): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(async () => {
      await callback();
      resolve();
    }, x);
  });
}

export function headlessInit(opts = {}) {
  clock = new Clock();
  setProcessedEvents(0);
  loadingManager = new LoadingManager();
  textureLoader = new TextureLoader(loadingManager);
  textureLoaderWorker = Comlink.wrap(new TextureLoaderWorker());
  gameLog = opts.gameLog ?? ydoc.getArray('gameLog');
  provider = opts?.provider;
}

export function initClock() {
  clock = new Clock();
}

export function init({ gameId }) {
  headlessInit();
  if (import.meta.env.PROD) {
    provider = new WebsocketProvider('wss://ws.arcanetable.app', gameId, ydoc);
  } else {
    provider = new WebrtcProvider(gameId, ydoc, { signaling: [`signaling.arcanetable.app`] });
  }

  loadingManager.onProgress = function (item, loaded, total) {
    console.log(item, loaded, total);
  };
  THREE.Cache.enabled = true;

  camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.z = 200;
  const matrix = new THREE.Matrix4();
  matrix.makeRotationX((Math.PI / 2) * -0.4);
  camera.position.applyMatrix4(matrix);

  renderer = new WebGLRenderer();
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.draggable = true;
  renderer.setClearColor(0x05050e);

  let focusHeight = window.innerHeight * 0.5;
  let focusWidth = (focusHeight / 700) * 750;

  focusRenderer = new WebGLRenderer();
  focusRenderer.setPixelRatio(window.devicePixelRatio);
  focusRenderer.setSize(focusWidth, focusHeight);
  focusRenderer.shadowMap.enabled = true;
  focusRenderer.setClearAlpha(0x05050e);

  focusCamera = new PerspectiveCamera(50, focusWidth / focusHeight, 1, 2000);

  scene = new Scene();

  scene.add(arrowHelper);

  multiselect.initialize(renderer, camera, scene);

  // let helper = new CameraHelper(focusCamera);
  // scene.add(helper);

  focusRayCaster = new Raycaster();

  const tableGeometry = new BoxGeometry(200, 200, 5);
  const tableMaterial = new MeshStandardMaterial({ color: 0xdeb887 });
  table = new Mesh(tableGeometry, tableMaterial);
  table.receiveShadow = true;
  table.userData.zone = 'battlefield';
  table.rotateX(Math.PI * -0.5);
  scene.add(table);
}

export function startSpectating() {
  setIsSpectating(true);
  setPlayerCount(count => count - 1);
  provider.awareness.setLocalStateField('isSpectating', true);
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.target = table.position;

  let curIndex = 0;
  Object.values(playAreas).forEach((playArea, i) => {
    playArea.mesh.rotation.z = PLAY_AREA_ROTATIONS[curIndex];
    curIndex++;
  });
}

export function sendEvent(event) {
  event.clientID = provider.awareness.clientID;
  gameLog.push([event]);
}

export function cleanup() {
  cardsById.clear();
  zonesById.clear();
  setPeekFilterText('');
  setHoverSignal();
  setScrollTarget();
  provider?.destroy();
  ydoc.destroy();
  ydoc = new Doc();
  setAnimating(false);
  setPlayers([]);
  setDeckIndex();
  setSelectedDeckIndex(undefined);
  setIsSpectating(false);
  setIsIntitialized(false);

  if (!renderer) return;

  multiselect.destroy();

  renderer.domElement.remove();
  renderer.dispose();

  focusRenderer.dispose();
  focusRenderer.domElement.remove();

  cleanupFromNode(scene, true);
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

export function onConcede(clientId?: string) {
  if (!clientId) {
    clientId = provider.awareness.clientID;
    startSpectating();
    sendEvent({ type: 'concede' });
  } else {
    setPlayerCount(count => count - 1);
  }
  console.log(clientId);
  console.log(playAreas);
  const playArea = playAreas[clientId];
  playArea.destroy();
  setPlayAreas(clientId, undefined);
  if (playerCount() < 2) {
    Object.values(playAreas).forEach(playArea => {
      playArea.destroy();
    });
    setSelectedDeckIndex(undefined);
    setIsSpectating(false);
    setIsIntitialized(false);
    orbitControls?.dispose();
    multiselect.destroy();
  }
}

export function updateFocusCamera(target: Object3D, offset = new Vector3(CARD_WIDTH / 4, 0, 0)) {
  if (focusCamera.userData.isAnimating) return;

  let { position, rotation } = getFocusCameraPositionRelativeTo(target, offset);

  focusCamera.position.copy(position);

  focusCamera.lookAt(target.getWorldPosition(new Vector3()));
  focusCamera.rotation.copy(rotation);
}
