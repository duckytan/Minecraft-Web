import * as THREE from 'three';

export interface RaycastHit {
  point: THREE.Vector3;
  face: THREE.Face | null;
  faceIndex: number | null;
  normal: THREE.Vector3;
  object: THREE.Object3D;
  distance: number;
}

export class RaycastController {
  private readonly raycaster: THREE.Raycaster;

  private readonly maxDistance: number;

  constructor(maxDistance = 5) {
    this.raycaster = new THREE.Raycaster();
    this.maxDistance = maxDistance;
  }

  cast(camera: THREE.Camera, objects: THREE.Object3D[]): RaycastHit | null {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    this.raycaster.set(camera.position, direction);
    this.raycaster.far = this.maxDistance;

    const intersects = this.raycaster.intersectObjects(objects, false);

    if (intersects.length === 0) {
      return null;
    }

    const hit = intersects[0];

    const normal = hit.face
      ? hit.face.normal.clone().transformDirection((hit.object as THREE.Mesh).matrixWorld)
      : new THREE.Vector3(0, 1, 0);

    return {
      point: hit.point,
      face: hit.face || null,
      faceIndex: hit.faceIndex || null,
      normal,
      object: hit.object,
      distance: hit.distance
    };
  }
}
