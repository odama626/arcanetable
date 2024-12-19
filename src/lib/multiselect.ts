import { createRoot } from 'solid-js';
import { createStore, SetStoreFunction } from 'solid-js/store';
import { Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { SelectionBox } from 'three/addons/interactive/SelectionBox';
import { SelectionHelper } from './SelectionHelper';

const SELECTED_EMISSIVE_COLOR = 0x4ba0ff;

export class Multiselect {
  selected!: Mesh[];
  setSelected!: SetStoreFunction<Mesh[]>;
  helper: SelectionHelper;
  selectionBox: SelectionBox;
  isDown: boolean;
  justSelected: boolean;

  constructor(renderer: WebGLRenderer, camera: PerspectiveCamera, scene: Scene) {
    this.selectionBox = new SelectionBox(camera, scene);
    this.helper = new SelectionHelper(renderer, 'selectBox');
    this.helper.enabled = false;
    this.isDown = false;
    this.justSelected = false;
    createRoot(() => {
      [this.selected, this.setSelected] = createStore<Mesh[]>([]);
    });
  }

  get enabled() {
    return this.helper.enabled;
  }

  start(event: PointerEvent) {
    this.justSelected = false;
    this.isDown = true;
    this.helper.enabled = true;
    this.helper.onPointerDown(event);
    this.clearSelectionHighlight();

    this.selectionBox.startPoint.copy(
      new Vector3(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
        0.5
      )
    );
  }

  onMove(event: PointerEvent) {
    this.helper.onPointerMove(event);
    if (this.helper.isDown) {
      for (let i = 0; i < this.selectionBox.collection.length; i++) {
        setMeshEmissivity(this.selectionBox.collection[i], 0x000000);
      }

      this.selectionBox.endPoint.copy(
        new Vector3(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1,
          0.5
        )
      );

      const allSelected = this.selectionBox.select().filter(isSelectable);

      for (let i = 0; i < allSelected.length; i++) {
        setMeshEmissivity(allSelected[i], SELECTED_EMISSIVE_COLOR);
      }
    }
  }

  select(event: PointerEvent) {
    this.helper.onPointerUp();
    if (this.helper.enabled && this.isDown) {
      this.justSelected = true;
      this.selectionBox.endPoint.copy(
        new Vector3(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1,
          0.5
        )
      );
      for (let i = 0; i < this.selectionBox.collection.length; i++) {
        setMeshEmissivity(this.selectionBox.collection[i], 0x000000);
      }
      const allSelected = this.selectionBox.select().filter(isSelectable);
      this.setSelected(allSelected);

      for (let i = 0; i < allSelected.length; i++) {
        setMeshEmissivity(allSelected[i], SELECTED_EMISSIVE_COLOR);
      }
    }
    this.isDown = false;
    this.helper.enabled = false;
  }

  private clearSelectionHighlight() {
    for (const item of this.selectionBox.collection) {
      setMeshEmissivity(item, 0x000000);
    }
  }

  clearSelection() {
    this.clearSelectionHighlight();
    this.setSelected([]);
  }

  destroy() {}
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
