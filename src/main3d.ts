import uniqBy from 'lodash-es/uniqBy';
import { nanoid } from 'nanoid';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { animateObject, cancelAnimation, renderAnimations } from './lib/animations';
import { cloneCard, getCardMeshTetherPoint, setCardData, updateTextureAnimation } from './lib/card';
import { CARD_STACK_OFFSET, CARD_THICKNESS, CardZone } from './lib/constants';
import {
  animating,
  camera,
  cardsById,
  clock,
  expect,
  focusCamera,
  focusRayCaster,
  focusRenderer,
  gameLog,
  hoverSignal,
  init,
  initClock,
  isSpectating,
  playAreas,
  provider,
  renderer,
  scene,
  scrollTarget,
  selection,
  sendEvent,
  setAnimating,
  setDeckIndex,
  setHoverSignal,
  setIsIntitialized,
  setPlayAreas,
  setPlayers,
  table,
  updateFocusCamera,
  zonesById,
} from './lib/globals';
import { Hand } from './lib/hand';
import { PlayArea } from './lib/playArea';
import { transferCard } from './lib/transferCard';
import { setCounters } from './lib/ui/counterDialog';
import { getGlobalRotation, restackItems } from './lib/utils';
import { processEvents } from './remoteEvents';

var container;

let composer: EffectComposer;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let outlinePass: OutlinePass;
let dragTargets: THREE.Object3D[];
let hand: Hand;
let time = 0;
let playArea: PlayArea;

interface GameOptions {
  gameId: string;
}

export async function localInit(gameOptions: GameOptions) {
  container = document.createElement('div');
  document.body.appendChild(container);
  init(gameOptions);

  time = 0;
  dragTargets = [];

  provider.awareness.on('change', change => {
    let newPlayers = Array.from(provider.awareness.getStates().entries()).map(([id, entry]) => ({
      entry,
      id,
    }));
    setPlayers(newPlayers);
  });

  outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera,
  );
  outlinePass.pulsePeriod = 2;

  var ambient = new THREE.AmbientLight(0xffffff);
  ambient.intensity = 2;
  scene.add(ambient);

  var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.intensity = 2;
  directionalLight.position.set(0, 200, 0);
  directionalLight.shadow.mapSize.set(1024 * 2, 1024 * 2);
  directionalLight.shadow.camera.left = -140;
  directionalLight.shadow.camera.right = 140;
  directionalLight.shadow.camera.top = 140;
  directionalLight.shadow.camera.bottom = -140;
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.far = 400;
  scene.add(directionalLight);
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  gameLog.observe(processEvents);

  processEvents();

  container.appendChild(renderer.domElement);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
  document.addEventListener('mousedown', onDocumentMouseDown, false);
  document.addEventListener('click', onDocumentClick, false);
  document.addEventListener('dragstart', onDocumentDragStart, false);
  document.addEventListener('mouseup', onDocumentDrop, false);
  document.addEventListener('wheel', onDocumentScroll, false);
  window.addEventListener('resize', onWindowResize, false);

  if (gameOptions.deckIndex) {
    loadDeckAndJoin(gameOptions.deckIndex);
  }
  startAnimating();
}

export async function loadDeckAndJoin(settings) {
  let decks = JSON.parse(localStorage.getItem('decks') || `{}`);

  setDeckIndex(settings.deckIndex);

  let deck = decks?.decks[settings.deckIndex];
  let counters = deck?.counters ?? [];

  playArea = await PlayArea.FromDeck(provider.awareness.clientID, deck);
  setPlayAreas(provider.awareness.clientID, playArea);
  setIsIntitialized(true);
  setCounters(existing => uniqBy([...counters, ...existing], 'id'));

  playArea.subscribeEvents(sendEvent);
  provider.awareness.setLocalStateField('life', settings.startingLife);
  provider.awareness.setLocalStateField('name', settings.name);
  sendEvent({ type: 'join', payload: playArea.getLocalState() });
  counters.forEach(counter => sendEvent({ type: 'createCounter', counter }));

  hand = playArea.hand;

  table.add(playArea.mesh);
  renderer.compile(scene, camera);
}

function onDocumentScroll(event) {
  if (!scrollTarget()) return;

  scrollTarget().dispatchEvent({ type: 'scroll', event });
}

function onDocumentMouseDown(event) {}

let isDragging = false;

function onDocumentClick(event: PointerEvent) {
  raycaster.setFromCamera(mouse, camera);
  let intersects = raycaster.intersectObject(scene);

  if (isDragging) {
    isDragging = false;
    return;
  }

  if (selection.onClick(event, intersects[0]?.object)) return;

  if (dragTargets?.length) return;

  if (!intersects.length) return;

  let target = intersects[0].object;

  if (!target) return;

  if (target.userData.isAnimating && !['battlefield', 'hand'].includes(target.userData.location))
    return;

  if (target.userData.zone === 'battlefield') {
    setHoverSignal({ mouse });
  } else if (target.userData.location === 'battlefield') {
    playArea.tap(target).then(() => {
      setHoverSignal(signal => {
        focusOn(target);
        const tether = getCardMeshTetherPoint(target);
        return {
          mouse,
          ...signal,
          tether,
        };
      });
    });
  } else if (target.userData.location === 'graveyard') {
    if (target.userData.clientId !== provider.awareness.clientID) {
      let remotePlayArea = playAreas[target.userData.clientId];
      remotePlayArea?.graveyardZone.mesh.children.forEach((cardMesh, i) => {
        let card = cardsById.get(cardMesh.userData.id);
        if (!card) return;

        let cardProxy = cloneCard(card, nanoid());
        setCardData(cardProxy.mesh, 'isPublic', true);
        setTimeout(() => {
          playArea.reveal(cardProxy);
        }, 50 * i);
      });
    } else {
      playArea.peekGraveyard();
    }
  } else if (target.userData.location === 'exile') {
    if (target.userData.clientId !== provider.awareness.clientID) {
      let remotePlayArea = playAreas[target.userData.clientId];
      remotePlayArea?.exileZone.mesh.children.forEach((cardMesh, i) => {
        let card = cardsById.get(cardMesh.userData.id)!;
        if (!card) return;

        let cardProxy = cloneCard(card, nanoid());
        setCardData(cardProxy.mesh, 'isPublic', true);
        setTimeout(() => {
          playArea.reveal(cardProxy);
        }, 50 * i);
      });
    } else {
      playArea.peekExile();
    }
  }

  if (target.parent?.userData.isInteractive) {
    target = target.parent;
  }

  target.dispatchEvent({ type: 'click', event });
}

function onDocumentDragStart(event: PointerEvent) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  raycaster.setFromCamera(mouse, camera);
  let intersects = raycaster.intersectObject(scene);
  if (isSpectating()) return;
  if (!intersects.length) return;

  let intersection = intersects[0];
  let target = intersection.object;
  let targets = [target];

  if (target.userData.location === 'deck') return;

  if (!target.userData.isInteractive) {
    setHoverSignal();
    selection.startRectangleSelection(event);
    return;
  }

  if (selection.selectedItems.length && selection.selectedItems.includes(intersection.object)) {
    targets = selection.selectedItems.slice();
  }

  let origin = new THREE.Vector3(0, 0, 0);
  targets.forEach(target => {
    target.userData.mouseDistance = target
      .worldToLocal(intersection.point.clone())
      .distanceTo(origin);
  });

  targets
    .sort((a, b) => {
      return b.userData.mouseDistance - a.userData.mouseDistance;
    })
    .forEach((target, i) => {
      setCardData(target, 'isDragging', true);

      let dragOffset = [0, 0, 0];
      if (target.userData.location !== 'hand') {
        dragOffset = targets
          .at(-1)
          .worldToLocal(intersection.point.clone())
          .multiplyScalar(-1)
          .add(new THREE.Vector3(0, CARD_STACK_OFFSET * (targets.length - i), i * CARD_THICKNESS))
          .toArray();
      }

      setCardData(target, 'dragOffset', dragOffset);
    });

  dragTargets = targets;
}

async function onDocumentDrop(event) {
  event.preventDefault();
  selection.completeRectangleSelection(event);
  if (!dragTargets?.length) return;
  raycaster.setFromCamera(mouse, camera);

  let intersections = raycaster.intersectObject(scene);

  let targetsById = Object.fromEntries(dragTargets.map(target => [target.userData.id, target]));
  let intersection = intersections.find(
    i =>
      !targetsById[i.object.userData.id] &&
      (i.object.userData.isInteractive || i.object.userData.zone),
  )!;

  let shouldClearSelection = false;

  for await (const target of dragTargets ?? []) {
    setCardData(target, 'isDragging', false);

    let toZoneId = intersection.object.userData.zoneId;
    let fromZoneId = target.userData.zoneId;
    let fromZone = zonesById.get(fromZoneId);
    let toZone = zonesById.get(toZoneId);

    if (fromZoneId && fromZoneId === toZoneId) {
      setCardData(target, `zone.${toZone.id}.position`, target.position.toArray());
      setCardData(target, `zone.${toZone.id}.rotation`, target.rotation.toArray());
      sendEvent({
        type: 'animateObject',
        payload: {
          userData: target.userData,
          animation: {
            duration: 0.2,
            to: {
              position: target.position,
              rotation: target.rotation,
            },
          },
        },
      });
      continue;
    }

    let card = cardsById.get(target.userData.id);
    let position = toZone.mesh.worldToLocal(intersection.point);
    expect(!!card, `card not found`, { card });

    console.log({ card, target });

    await transferCard(card, fromZone, toZone, {
      addOptions: {
        skipAnimation: true,
        positionArray: position.toArray(),
      },
    });
    shouldClearSelection = true;
  }

  if (shouldClearSelection) {
    selection.clearSelection();
  }

  if (dragTargets.length) {
    setHoverSignal(signal => {
      let mesh = signal?.mesh ?? dragTargets[0];
      focusOn(mesh);
      const tether = getCardMeshTetherPoint(mesh);
      return {
        mouse,
        ...(signal ?? {}),
        tether,
        mesh,
      };
    });
  }

  dragTargets = [];
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  composer.setSize(window.innerWidth, window.innerHeight);

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  let focusHeight = window.innerHeight * 0.5;
  let focusWidth = (focusHeight / 700) * 750;

  focusRenderer.setPixelRatio(window.devicePixelRatio);
  focusRenderer.setSize(focusWidth, focusHeight);
}

function onDocumentMouseMove(event) {
  mouse.set(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1,
  );

  selection.onMove(event);

  if (dragTargets?.length) {
    isDragging = true;
    raycaster.setFromCamera(mouse, camera);

    let intersections = raycaster.intersectObject(scene);

    restackItems(dragTargets, intersections);

    if (hoverSignal()) {
      setHoverSignal(signal => {
        if (signal.mesh) {
          focusOn(signal.mesh);
          const tether = getCardMeshTetherPoint(signal.mesh);
          return {
            mouse,
            ...signal,
            tether,
          };
        } else {
          return {
            ...signal,
            mouse,
          };
        }
      });
    }
  } else {
    setHoverSignal(signal => ({
      mouse,
      ...signal,
    }));
  }
}

//

let ticks = 0;
let interval = 1 / 30;
export function animate() {
  if (animating()) requestAnimationFrame(animate);
  let delta = clock.getDelta();
  ticks += delta;
  time += delta;

  if (ticks >= interval) {
    render3d(delta);
    ticks = ticks % interval;
  }
}

export function startAnimating() {
  if (animating()) return;
  initClock();
  setAnimating(true);
  animate();
}

let hover: THREE.Object3D;

function hightlightHover(intersects: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>>[]) {
  let needsCleanup = false;
  let next;
  let target = intersects?.[0]?.object;

  // select top of deck
  if (target?.parent?.userData.zone === 'deck') {
    target = target.parent?.children[0];
    let zone = zonesById.get(target.userData.zoneId);
    target = zone.cards[0].mesh;
  }

  if (!intersects.length) needsCleanup = true;
  if (target !== hover?.object) {
    needsCleanup = true;
    let { isInteractive, isAnimating, location } = target?.userData ?? {};
    if ((isInteractive || ['graveyard', 'exile'].includes(location)) && !isAnimating) next = target;
  }

  if (needsCleanup && hover) {
    hover.object.material?.forEach?.((mat, i) => mat.color.set(hover.colors[i]));

    hover.object.dispatchEvent({ type: 'mouseout', mesh: hover.object });
    hover = undefined;
    outlinePass.selectedObjects = [];
  }

  if (next) {
    const tether = getCardMeshTetherPoint(next);

    hover = { object: next, colors: [] };
    setHoverSignal({ mesh: next, tether, mouse });

    hover.object.dispatchEvent({ type: 'mousein', mesh: hover.object });
    focusOn(next);

    outlinePass.selectedObjects = [hover.object];
  }
}

function focusOn(target: THREE.Object3D) {
  if (focusCamera.userData.target !== target.uuid) {
    cancelAnimation(focusCamera);
  }
  focusCamera.userData.target = target.uuid;
}

function render3d(delta: number) {
  renderAnimations(time);
  updateTextureAnimation(delta);

  raycaster.setFromCamera(mouse, camera);

  if (!selection.enabled) {
    let intersects = raycaster.intersectObject(scene).filter(hit => {
      if (isSpectating()) return true;
      if (
        hit.object?.userData.clientId !== provider.awareness.clientID &&
        !hit.object?.userData.isPublic
      )
        return false;
      return true;
    });

    hightlightHover(intersects);
  }

  let signal = hoverSignal();
  if (signal?.mesh && signal?.mesh.userData.location !== 'deck') {
    const tetherPoint = getCardMeshTetherPoint(signal.mesh);
    if (!tetherPoint.equals(signal.tether)) {
      setHoverSignal(signal => ({
        ...signal,
        tether: getCardMeshTetherPoint(signal.mesh),
      }));
    }
  }

  camera.lookAt(scene.position);
  composer.render();
  if (hoverSignal()?.mesh) {
    let mesh = hoverSignal().mesh as THREE.Mesh;
    updateFocusCamera(mesh);

    focusRayCaster.set(
      focusCamera.position,
      mesh.localToWorld(new THREE.Vector3()).sub(focusCamera.position).normalize(),
    );
    let intersections = focusRayCaster.intersectObject(scene);
    let targetDistance;
    let materials = intersections
      .map(({ object, distance }) => {
        if (object.uuid === mesh.uuid) {
          targetDistance = distance;
          return [];
        }
        if (targetDistance && distance > targetDistance) return [];
        return Array.isArray(object.material) ? object.material : [object.material];
      })
      .flat();

    materials.forEach(mat => (mat.wireframe = true));
    focusRenderer.render(scene, focusCamera);
    materials.forEach(mat => (mat.wireframe = false));
  }
}
