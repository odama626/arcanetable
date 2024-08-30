import { nanoid } from 'nanoid';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { Card, cloneCard, createCardGeometry, getCardMeshTetherPoint } from './lib/card';
import {
  animateObject,
  animating,
  camera,
  cardsById,
  clock,
  expect,
  gameLog,
  init,
  playAreas,
  players,
  provider,
  renderAnimations,
  renderer,
  scene,
  scrollTarget,
  sendEvent,
  setAnimating,
  setHoverSignal,
  setPlayers,
  table,
  zonesById,
} from './lib/globals';
import { Hand } from './lib/hand';
import { PlayArea } from './lib/playArea';


var container;

let composer: EffectComposer;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let outlinePass: OutlinePass;
let dragTargets: THREE.Object3D[];
let hand: Hand;
let time = 0;
let processedEvents = 0;
let playArea: PlayArea;

interface GameOptions {
  gameId: string;
}

export function cleanMaterial(material) {
  console.log('dispose material!');
  material.dispose();

  // dispose textures
  for (const key of Object.keys(material)) {
    const value = material[key];
    if (value && typeof value === 'object' && 'minFilter' in value) {
      console.log('dispose texture!');
      value.dispose();
    }
  }
}
export async function localInit(gameOptions: GameOptions) {
  container = document.createElement('div');
  document.body.appendChild(container);
  init(gameOptions);

  processedEvents = 0;
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
  directionalLight.position.set(0, 100, 200);
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

  // let demo = new THREE.CameraHelper(directionalLight.shadow.camera);
  // scene.add(demo);

  function processEvents() {
    while (processedEvents < gameLog.length) {
      const event = gameLog.get(processedEvents);
      processedEvents++;
      if (event.clientID === provider.awareness.clientID) continue;
      handleEvent(event);
    }
  }

  gameLog.observe(processEvents);

  processEvents();

  container.appendChild(renderer.domElement);

  composer = new EffectComposer(renderer);

  // const bloomComposer = new EffectComposer(renderer);
  // bloomComposer.renderToScreen = false;

  // const copyPass = new TexturePass(scene.texture);
  // bloomComposer.addPass(copyPass);

  // const bloomPass = new UnrealBloomPas(
  //   new Vector2(renderer.domElement.width, renderer.domElement.height),
  //   1.5,
  //   0.4,
  //   0,
  //   85
  // );

  // bloomPass.clearColor= new Color(0xfffff)
  // bloomComposer.addPass(bloomPass);

  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(outlinePass);

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

export async function loadDeckAndJoin(deckIndex: number) {
  let decks = JSON.parse(localStorage.getItem('decks') || `{}`);

  let deckText = decks?.decks[deckIndex].cardList;

  playArea = await PlayArea.FromCardList(provider.awareness.clientID, deckText);
  playAreas.set(provider.awareness.clientID, playArea);

  playArea.subscribeEvents(sendEvent);
  sendEvent({ type: 'join', payload: playArea.getLocalState() });

  hand = playArea.hand;

  table.add(playArea.mesh);
}

interface Event {
  clientID: string;
  payload: unknown;
}

const EVENTS = {
  join(event: Event) {
    let playArea = new PlayArea(event.clientID, event.payload.cards, event.payload);
    playArea.mesh.rotateZ(Math.PI);
    table.add(playArea.mesh);
    playAreas.set(event.clientID, playArea);
  },
  draw(event: Event, playArea: PlayArea) {
    playArea?.draw();
  },
  addToHand(event: Event, playArea: PlayArea, card: Card) {
    if (card.mesh.userData.location === 'peek') {
      playArea.peekZone.removeCard(card.mesh);
    }
    playArea.addToHand(card);
  },
  addCardBottomDeck(event: Event, playArea: PlayArea, card: Card) {
    if (card.mesh.userData.location === 'peek') {
      playArea.peekZone.removeCard(card.mesh);
    }
    playArea.addCardBottomDeck(card);
  },
  addCardTopDeck(event: Event, playArea: PlayArea, card: Card) {
    if (card.mesh.userData.location === 'peek') {
      playArea.peekZone.removeCard(card.mesh);
    }
    playArea.addCardTopDeck(card);
  },
  animateObject(event: Event, _playArea: PlayArea, card: Card) {
    animateObject(card.mesh, event.payload.animation);
  },
  destroy(event: Event, playArea: PlayArea, card: Card) {
    if (card.mesh.userData.location === 'peek') {
      playArea.peekZone.removeCard(card.mesh);
    }
    playArea?.destroy(card.mesh);
  },
  transferCard(event: Event, playArea: PlayArea, card: Card) {
    let fromZone = zonesById.get(event.payload.fromZoneId);
    let toZone = zonesById.get(event.payload.toZoneId);
    console.log({ fromZone, toZone });
    fromZone?.removeCard(card.mesh);
    let p = event?.payload?.addOptions?.position;
    let position = p ? new THREE.Vector3(p.x, p.y, p.z) : undefined;
    toZone?.addCard(card, { position });
  },
  createCard(event: Event, playArea: PlayArea) {
    // let card = cloneCard(event.payload.card, event.payload.card.id);
    let card = structuredClone(event.payload.userData.card);
    card.id = event.payload.userData.id;
    card.mesh = createCardGeometry(card);
    card.mesh.userData = event.payload.userData;
    cardsById.set(card.id, card);

    let zone = zonesById.get(event.payload.zoneId);
    let p = event.payload.addOptions.position;
    let position = new THREE.Vector3(p.x, p.y, p.z);
    zone?.addCard(card, { position });
  },
  tap(event: Event, playArea: PlayArea, card: Card) {
    playArea?.tap(card.mesh);
  },
  flip(event: Event, playArea: PlayArea, card: Card) {
    playArea?.flip(card.mesh);
  },
  clone(event: Event, playArea: PlayArea) {
    playArea?.clone(event.payload.id, event.payload.newId);
  },
  peek(event: Event, playArea: PlayArea) {
    playArea.peek();
  },
  reveal(event: Event, remotePlayArea: PlayArea, card: Card) {
    expect(!!card, 'card not found');
    let cardProxy = cloneCard(card, nanoid());
    // remotePlayArea.peek();
    cardProxy.mesh.userData.isPublic = true;
    playArea.reveal(cardProxy);
  },
  exileCard(event: Event, playArea: PlayArea, card: Card) {
    if (card.mesh.userData.location === 'peek') {
      playArea.peekZone.removeCard(card.mesh);
    }
    playArea?.exileCard(card.mesh);
  },
  deckFlipTop(event: Event, playArea: PlayArea) {
    playArea?.deckFlipTop(event.payload.toggle);
  },
  shuffleDeck(event: Event, playArea: PlayArea) {
    playArea?.reorderDeck(event.payload.order);
  },
};

function handleEvent(event) {
  console.log({ event });
  expect(!!EVENTS[event.type], `${event.type} not implemented`);
  let playArea = playAreas.get(event.clientID);
  let card = cardsById.get(event.payload?.userData?.id);
  EVENTS[event.type](event, playArea, card);
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

  if (target.userData.zone === 'battlefield') {
    setHoverSignal();
  } else if (target.userData.location === 'battlefield') {
    playArea.tap(target).then(() => {
      setHoverSignal(signal => {
        const tether = getCardMeshTetherPoint(target);
        return {
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
        let cardProxy = cloneCard(card, nanoid());
        cardProxy.mesh.userData.isPublic = true;
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
        let card = cardsById.get(cardMesh.userData.id);
        let cardProxy = cloneCard(card, nanoid());
        cardProxy.mesh.userData.isPublic = true;
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

  if (!intersects.length) return;
  let target = intersects[0].object;
  if (target.userData.location === 'deck') return;
  if (!target.userData.isInteractive) return;
  if (target.userData.isInGrid) return;

  target.userData.isDragging = true;

  dragTargets = [target];
}

function onDocumentDrop(event) {
  event.preventDefault();
  if (!dragTargets?.length) return;
  console.log({ dragTargets });
  raycaster.setFromCamera(mouse, camera);

  let intersects = raycaster.intersectObject(scene);

  dragTargets?.forEach(target => {
    target.userData.isDragging = false;
    let intersection = intersects.find(i => i.object.userData.id !== target.userData.id)!;
    let toZoneId = intersection.object.userData.zoneId;
    let fromZoneId = target.userData.zoneId;
    let fromZone = zonesById.get(fromZoneId);
    let toZone = zonesById.get(toZoneId);
    let fromLocation = target.userData.location;
    let toLocation = intersection.object.userData.location ?? intersection.object.userData.zone;

    console.log(intersection.object.userData);

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

    if (!!fromZone?.removeCard) {
      console.warn(`fromZone removeCard doesn't exist`, target.userData.zoneId);
    }
    console.log({ fromZone, fromZoneId, zonesById, toZone, toZoneId, intersection });

    if (fromZone?.removeCard) {
      fromZone.removeCard(target);
    } else {
      console.warn('fromZone missing');
      if (fromLocation !== toLocation) {
        target.parent?.remove(target);
      }
    }

    let card = cardsById.get(target.userData.id);
    let position = toZone?.mesh?.worldToLocal(intersection.point);
    expect(!!card, `card not found`, { card });
    toZone.addCard(card, { skipAnimation: true, position });

    sendEvent({
      type: 'transferCard',
      payload: {
        userData: card?.mesh.userData,
        fromZoneId,
        toZoneId,
        addOptions: { skipAnimation: true, position },
      },
    });

    console.log({ fromLocation, toLocation });

    target.userData.location = toLocation;

    setHoverSignal(signal => {
      const tether = getCardMeshTetherPoint(signal.mesh);
      return {
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

  renderer.setSize(window.innerWidth, window.innerHeight);
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
      if (target.userData.location === 'hand') {
        hand.mesh.worldToLocal(pointTarget);
        let quarternion = new THREE.Quaternion().setFromEuler(hand.mesh.rotation).invert();
        target.rotation.setFromQuaternion(quarternion);
      } else if (target.userData.location === 'battlefield') {
        playArea.battlefieldZone.mesh.worldToLocal(pointTarget);
      }

      target.position.set(pointTarget.x, pointTarget.y, pointTarget.z);
    }
    setHoverSignal(signal => {
      const tether = getCardMeshTetherPoint(signal.mesh);
      return {
        ...signal,
        tether,
      };
    });
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
  }

  if (!intersects.length) needsCleanup = true;
  if (target !== hover?.object) {
    needsCleanup = true;
    if (target?.userData?.isInteractive && !target?.userData?.isAnimating) next = target;
  }

  if (needsCleanup && hover) {
    hover.object.material?.forEach((mat, i) => mat.color.set(hover.colors[i]));

    hover.object.dispatchEvent({ type: 'mouseout', mesh: hover.object });
    hover = undefined;
    outlinePass.selectedObjects = [];
  }

  if (next) {
    const tether = getCardMeshTetherPoint(next);

    hover = { object: next, colors: [] };
    setHoverSignal({ mesh: next, tether });
    hover.object.dispatchEvent({ type: 'mousein', mesh: hover.object });
    if (next.userData.location === 'deck') {
      hover.object.material?.forEach((mat: THREE.MeshStandardMaterial, i) => {
        hover.colors[i] = mat.color.clone();
        mat.color.set(0xffa0a0);
      });
    }
    outlinePass.selectedObjects = [hover.object];
  }
}

function render3d() {
  renderAnimations(time);

  raycaster.setFromCamera(mouse, camera);

  let intersects = raycaster.intersectObject(scene);

  hightlightHover(intersects);

  camera.lookAt(scene.position);
  composer.render();
}
