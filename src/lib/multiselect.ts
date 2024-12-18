import { Camera, Color, Mesh, Renderer, Scene, WebGLRenderer } from 'three';
import { SelectionBox } from 'three/addons/interactive/SelectionBox.js';
import { SelectionHelper } from './SelectionHelper';
import { createStore } from 'solid-js/store';

let selectionBox: SelectionBox;
export let helper: SelectionHelper;
const SELECTED_EMISSIVE_COLOR = 0x4ba0ff;
export const [selected, setSelected] = createStore([]);

export function initialize(renderer: WebGLRenderer, camera: Camera, scene: Scene) {
  selectionBox = new SelectionBox(camera, scene);
  helper = new SelectionHelper(renderer, 'selectBox');
  helper.enabled = false;
  setSelected([]);

  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
}

function setMeshEmissivity(mesh: Mesh, color: number) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (let i = 0; i < materials.length; i++) {
    const material = materials[i];
    if (material.emissive) {
      material.emissive.set(color);
    }
  }
}

function isSelectable(mesh: Mesh) {
  return mesh.userData.isInteractive && mesh.userData.location !== 'deck';
}

function onPointerDown(event: PointerEvent) {
  if (helper.enabled) {
    clearSelection();

    selectionBox.startPoint.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
      0.5
    );
  }
}

export function clearSelection() {
  for (const item of selectionBox.collection) {
    setMeshEmissivity(item, 0x000000);
  }
}

function onPointerMove(event: PointerEvent) {
  if (helper.isDown && helper.enabled) {
    for (let i = 0; i < selectionBox.collection.length; i++) {
      setMeshEmissivity(selectionBox.collection[i], 0x000000);
    }

    selectionBox.endPoint.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
      0.5
    );

    const allSelected = selectionBox.select().filter(isSelectable);

    for (let i = 0; i < allSelected.length; i++) {
      setMeshEmissivity(allSelected[i], SELECTED_EMISSIVE_COLOR);
    }
  }
}
function onPointerUp(event: PointerEvent) {
  if (helper.enabled) {
    selectionBox.endPoint.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
      0.5
    );
    for (let i = 0; i < selectionBox.collection.length; i++) {
      setMeshEmissivity(selectionBox.collection[i], 0x000000);
    }
    const allSelected = selectionBox.select().filter(isSelectable);
    console.log({ allSelected });
    setSelected(allSelected);

    for (let i = 0; i < allSelected.length; i++) {
      setMeshEmissivity(allSelected[i], SELECTED_EMISSIVE_COLOR);
    }
  }
}

export function destroy() {
  document.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
}
