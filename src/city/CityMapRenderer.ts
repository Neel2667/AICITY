/**
 * CityMapRenderer.ts
 * Maps authored city layout blockHint names to actual loaded Three.js block assets.
 * Called after asset loading to swap random chunks for deterministic authored ones.
 */
import * as THREE from 'three';
import { getChunkEntry, type CityChunkEntry } from './CityMap';
import { GVar } from '../utils/GVar';

const BLOCK_HINT_MAP: Record<string, string[]> = {
  apartments:   ['block_1', 'block_2', 'block_3'],
  house:        ['block_4'],
  house2:       ['block_5'],
  house3:       ['block_6'],
  park:         ['park'],
  factory:      ['block_11', 'block_10'],
  shoparea:     ['block_7'],
  shops:        ['block_9'],
  coffeeshop:   ['block_8'],
  supermarket:  ['block_7'],
  fastfood:     ['block_9'],
  gas:          ['block_4'],
  residence:    ['block_5', 'block_6'],
  stadium:      ['block_8_merged'],
};

export class CityMapRenderer {
  private blockPool: Map<string, THREE.Object3D[]> = new Map();

  public ingestBlocks(arrBlocks: any[]): void {
    this.blockPool.clear();
    for (const block of arrBlocks) {
      const name: string = (block.name as string) || '';
      if (!this.blockPool.has(name)) this.blockPool.set(name, []);
      this.blockPool.get(name)!.push(block);
    }
  }

  public resolveBlock(hint: string | undefined): THREE.Object3D | null {
    if (!hint) return this.getFallback();
    const candidates = BLOCK_HINT_MAP[hint] ?? [];
    for (const nameFragment of candidates) {
      for (const [poolName, blocks] of this.blockPool.entries()) {
        if (poolName.includes(nameFragment) && blocks.length > 0) return blocks[0].clone();
      }
    }
    return this.getFallback();
  }

  private getFallback(): THREE.Object3D | null {
    for (const [, blocks] of this.blockPool.entries()) {
      if (blocks.length > 0) return blocks[0].clone();
    }
    return null;
  }

  public buildChunk(x: number, y: number): THREE.Object3D | null {
    const nx = ((x % GVar.TABLE_SIZE) + GVar.TABLE_SIZE) % GVar.TABLE_SIZE;
    const ny = ((y % GVar.TABLE_SIZE) + GVar.TABLE_SIZE) % GVar.TABLE_SIZE;
    const entry: CityChunkEntry | undefined = getChunkEntry(nx, ny);
    if (!entry) return null;

    const block = this.resolveBlock(entry.blockHint);
    if (!block) return null;

    const chunk = new THREE.Object3D();
    chunk.name = 'chunk';

    const rotations = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    block.rotation.y = rotations[entry.rotation ?? 0] ?? 0;
    block.position.set(0, 0, 0);

    (chunk as any).cityEntry = entry;
    (chunk as any).districtId = entry.districtId;
    (chunk as any).chunkName = entry.name ?? null;
    (chunk as any).block = block;
    chunk.add(block);

    if (entry.underConstruction) {
      block.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const mat = (obj.material as THREE.MeshStandardMaterial).clone();
          mat.transparent = true;
          mat.opacity = 0.55;
          obj.material = mat;
        }
      });
      const markerGeo = new THREE.BoxGeometry(1.5, 8, 1.5);
      const markerMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(0, 4, 0);
      marker.name = 'construction_marker';
      chunk.add(marker);
    }

    return chunk;
  }
}

export const cityMapRenderer = new CityMapRenderer();
