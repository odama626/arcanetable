import { uniqBy } from 'lodash-es';
import { nanoid } from 'nanoid';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { cancelAnimation, renderAnimations } from './lib/animations';
import { cloneCard, getCardMeshTetherPoint, setCardData } from './lib/card';
import { CARD_THICKNESS } from './lib/constants';
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
  isSpectating,
  playAreas,
  players,
  provider,
  renderer,
  scene,
  scrollTarget,
  sendEvent,
  setAnimating,
  setDeckIndex,
  setHoverSignal,
  setPlayers,
  table,
  updateFocusCamera,
  zonesById,
} from './lib/globals';
import { Hand } from './lib/hand';
import { PlayArea } from './lib/playArea';
import { transferCard } from './lib/transferCard';
import { setCounters } from './lib/ui/counterDialog';
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
    console.log({ newPlayers, players: players() });
    setPlayers(newPlayers);
  });

  outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
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
  playAreas.set(provider.awareness.clientID, playArea);
  setCounters(existing => uniqBy([...counters, ...existing], 'id'));

  playArea.subscribeEvents(sendEvent);
  provider.awareness.setLocalStateField('life', settings.startingLife);
  provider.awareness.setLocalStateField('name', settings.name);
  sendEvent({ type: 'join', payload: playArea.getLocalState() });
  counters.forEach(counter => sendEvent({ type: 'createCounter', counter }));

  hand = playArea.hand;

  table.add(playArea.mesh);
}

function onDocumentScroll(event) {
  if (!scrollTarget()) return;

  scrollTarget().dispatchEvent({ type: 'scroll', event });
}

function onDocumentMouseDown(event) {}

let isDragging = false;

function onDocumentClick(event) {
  if (isDragging) {
    isDragging = false;
    return;
  }
  if (dragTargets?.length) return;
  raycaster.setFromCamera(mouse, camera);
  let intersects = raycaster.intersectObject(scene);

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
      let remotePlayArea = playAreas.get(target.userData.clientId);
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
      let remotePlayArea = playAreas.get(target.userData.clientId);
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

function onDocumentDragStart(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  raycaster.setFromCamera(mouse, camera);
  let intersects = raycaster.intersectObject(scene);
  if (isSpectating()) return;
  if (!intersects.length) return;

  let intersection = intersects[0];

  let target = intersection.object;
  if (target.userData.location === 'deck') return;
  if (!target.userData.isInteractive) return;
  if (target.userData.isInGrid) return;

  setCardData(target, 'isDragging', true);

  let dragOffset = [0, 0, 0];
  if (target.userData.location !== 'hand') {
    dragOffset = target
      .worldToLocal(intersection.point)
      .multiply(new THREE.Vector3(-1, -1, 1))
      .toArray();
  }

  setCardData(target, 'dragOffset', dragOffset);

  dragTargets = [target];
}

function onDocumentDrop(event) {
  event.preventDefault();
  if (!dragTargets?.length) return;
  raycaster.setFromCamera(mouse, camera);

  let intersects = raycaster.intersectObject(scene);

  dragTargets?.forEach(async target => {
    setCardData(target, 'isDragging', false);
    let intersection = intersects.find(
      i =>
        i.object.userData.id !== target.userData.id &&
        (i.object.userData.isInteractive || i.object.userData.zone)
    )!;
    let toZoneId = intersection.object.userData.zoneId;
    let fromZoneId = target.userData.zoneId;
    let fromZone = zonesById.get(fromZoneId);
    let toZone = zonesById.get(toZoneId);

    if (fromZoneId && fromZoneId === toZoneId) {
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
      return;
    }

    let card = cardsById.get(target.userData.id);
    let position = toZone.mesh.worldToLocal(intersection.point);
    expect(!!card, `card not found`, { card });

    await transferCard(card, fromZone, toZone, {
      skipAnimation: true,
      positionArray: position.toArray(),
    });

    setHoverSignal(signal => {
      focusOn(signal.mesh);
      const tether = getCardMeshTetherPoint(signal.mesh);
      return {
        mouse,
        ...signal,
        tether,
      };
    });
  });

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
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  if (dragTargets?.length) {
    isDragging = true;
    raycaster.setFromCamera(mouse, camera);

    let intersects = raycaster.intersectObject(scene);

    if (!intersects.length) return;

    for (const target of dragTargets) {
      let intersection = intersects.find(intersect => intersect.object.uuid !== target.uuid);
      if (!intersection) continue;
      let pointTarget = intersection.point.clone();
      let zone = zonesById.get(target.userData.zoneId)!;
      if (target.userData.location === 'hand') {
        let quarternion = new THREE.Quaternion().setFromEuler(hand.mesh.rotation).invert();
        target.rotation.setFromQuaternion(quarternion);
      }
      zone.mesh.worldToLocal(pointTarget);

      let rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(target.rotation);
      pointTarget.add(
        new THREE.Vector3().fromArray(target.userData.dragOffset).applyMatrix4(rotationMatrix)
      );

      pointTarget.add(new THREE.Vector3(0, 0, CARD_THICKNESS / 2));

      target.position.copy(pointTarget);
    }

    setHoverSignal(signal => {
      focusOn(signal.mesh);
      const tether = getCardMeshTetherPoint(signal.mesh);
      return {
        mouse,
        ...signal,
        tether,
      };
    });
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
    render3d();
    ticks = ticks % interval;
  }
}

export function startAnimating() {
  if (animating()) return;
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
    if (next.userData.location === 'deck') {
      hover.object.material?.forEach((mat: THREE.MeshStandardMaterial, i) => {
        hover.colors[i] = mat.color.clone();
        mat.color.set(0xffa0a0);
      });
    }

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

function render3d() {
  renderAnimations(time);

  raycaster.setFromCamera(mouse, camera);

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

  if (hoverSignal()?.mesh && hoverSignal()?.mesh.userData.location !== 'deck') {
    setHoverSignal(signal => ({
      ...signal,
      tether: getCardMeshTetherPoint(signal.mesh),
    }));
  }

  camera.lookAt(scene.position);
  composer.render();
  if (hoverSignal()?.mesh) {
    let mesh = hoverSignal().mesh as THREE.Mesh;
    updateFocusCamera(mesh);

    focusRayCaster.set(
      focusCamera.position,
      mesh.localToWorld(new THREE.Vector3()).sub(focusCamera.position).normalize()
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
