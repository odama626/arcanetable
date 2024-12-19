import { createRoot } from 'solid-js';
import { createStore, SetStoreFunction } from 'solid-js/store';
import { Mesh, Object3D, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { SelectionBox } from 'three/addons/interactive/SelectionBox';
import { SelectionHelper } from './SelectionHelper';

const SELECTED_EMISSIVE_COLOR = 0x4ba0ff;

export class Selection {
  selectedItems!: Object3D[];
  private _setSelectedItems!: SetStoreFunction<Object3D[]>;
  helper: SelectionHelper;
  selectionBox: SelectionBox;
  isDown: boolean;
  justSelected: boolean;
  selectionSet: Set<Object3D>;

  constructor(renderer: WebGLRenderer, camera: PerspectiveCamera, scene: Scene) {
    this.selectionBox = new SelectionBox(camera, scene);
    this.helper = new SelectionHelper(renderer, 'selectBox');
    this.helper.enabled = false;
    this.isDown = false;
    this.justSelected = false;
    this.selectionSet = new Set();
    createRoot(() => {
      [this.selectedItems, this._setSelectedItems] = createStore<Object3D[]>([]);
    });
  }

  get enabled() {
    return this.helper.enabled;
  }

  onClick(event: PointerEvent, target?: Object3D): boolean {
    if (this.justSelected) {
      this.justSelected = false;
      return true;
    }
    if (this.enabled) return false;
    if (target && isSelectable(target)) {
      if (event.ctrlKey || event.metaKey) {
        this.toggleSelection(target);
        return true;
      } else if (event.shiftKey) {
        setMeshEmissivity(target, SELECTED_EMISSIVE_COLOR);
        this.addSelectedItems([target]);
        return true;
      }
    }
    this.clearSelection();
    return false;
  }

  toggleSelection(object: Object3D) {
    if (this.selectionSet.has(object)) {
      setMeshEmissivity(object, 0x000000);
      this.selectionSet.delete(object);
    } else {
      this.selectionSet.add(object);
      setMeshEmissivity(object, SELECTED_EMISSIVE_COLOR);
    }
    this._setSelectedItems(this.selectionSet.values().toArray());
  }

  startRectangleSelection(event: PointerEvent) {
    this.justSelected = false;
    this.isDown = true;
    this.helper.enabled = true;
    this.helper.onPointerDown(event);
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
    } else {
      this.clearSelection();
    }
    this.selectionBox.collection = [];

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
        if (!this.selectionSet.has(this.selectionBox.collection[i])) {
          setMeshEmissivity(this.selectionBox.collection[i], 0x000000);
        }
      }

      this.selectionBox.endPoint.copy(
        new Vector3(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1,
          0.5
        )
      );

      const allSelected = new Set(this.selectionBox.select().filter(isSelectable));

      if (event.metaKey || event.ctrlKey) {
        let intersection = this.selectionSet.intersection(allSelected);
        intersection.forEach(item => setMeshEmissivity(item, 0x000000));
        let difference = this.selectionSet.symmetricDifference(allSelected);
        difference.forEach(item => setMeshEmissivity(item, SELECTED_EMISSIVE_COLOR));
      } else {
        for (const selected of allSelected) {
          setMeshEmissivity(selected, SELECTED_EMISSIVE_COLOR);
        }
      }
    }
  }

  completeRectangleSelection(event: PointerEvent) {
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
        if (!this.selectionSet.has(this.selectionBox.collection[i])) {
          setMeshEmissivity(this.selectionBox.collection[i], 0x000000);
        }
      }
      let allSelected = new Set(this.selectionBox.select().filter(isSelectable));

      if (event.metaKey || event.ctrlKey) {
        let exclusions = this.selectionSet.intersection(allSelected);
        exclusions.forEach(item => {
          setMeshEmissivity(item, 0x000000);
          this.selectionSet.delete(item);
        });
        allSelected = allSelected.difference(exclusions);
      } else if (event.shiftKey) {
      } else {
        this.clearSelection();
      }

      this.addSelectedItems(allSelected);

      for (const selected of allSelected) {
        setMeshEmissivity(selected, SELECTED_EMISSIVE_COLOR);
      }
    }
    this.isDown = false;
    this.helper.enabled = false;
  }

  addSelectedItems(items: Mesh[] | Set<Mesh>) {
    items.forEach(item => this.selectionSet.add(item));
    this._setSelectedItems(this.selectionSet.values().toArray());
  }

  private clearSelectionHighlight() {
    for (const item of this.selectionSet) {
      setMeshEmissivity(item, 0x000000);
    }
  }

  clearSelection() {
    this.clearSelectionHighlight();
    this.addSelectedItems([]);
    this.selectionSet.clear();
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
