/**
 * CitySignage.ts
 * ----------------------------------------------------------------------------
 * Floating in-world labels over each named landmark, so a viewer always knows
 * what they're looking at — even with the HUD hidden. Cozy pill-shaped sprites
 * with an icon + name that gently bob and always face the camera (sprites do
 * this for free). They fade with distance/fog via the renderer.
 */
import * as THREE from 'three';
import { LANDMARKS, tileToWorld } from './CityDesign';
import type { IUpdate } from '../interfaces/IUpdate';

interface Sign {
  sprite: THREE.Sprite;
  baseY: number;
  phase: number;
}

export class CitySignage {
  private signs: Sign[] = [];
  public readonly root = new THREE.Group();

  constructor(scene: THREE.Object3D) {
    this.root.name = 'citySignage';
    scene.add(this.root);
  }

  public build(): void {
    for (const lm of LANDMARKS) {
      const { x, z } = tileToWorld(lm.tile[0], lm.tile[1]);
      const sprite = this.makeSign(`${lm.icon}  ${lm.name}`);
      const baseY = 26;
      sprite.position.set(x, baseY, z);
      this.root.add(sprite);
      this.signs.push({ sprite, baseY, phase: Math.random() * Math.PI * 2 });
    }
    console.log(`[CitySignage] Placed ${this.signs.length} landmark signs`);
  }

  public update(ud: IUpdate): void {
    for (const s of this.signs) {
      s.sprite.position.y = s.baseY + Math.sin(ud.elapsed * 0.9 + s.phase) * 1.2;
    }
  }

  private makeSign(text: string): THREE.Sprite {
    const pad = 28;
    const font = 'bold 44px system-ui, sans-serif';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = font;
    const textW = Math.ceil(ctx.measureText(text).width);
    canvas.width = textW + pad * 2;
    canvas.height = 96;

    const c = canvas.getContext('2d')!;
    // pill background
    const r = 40;
    c.fillStyle = 'rgba(10,16,34,0.82)';
    roundRect(c, 4, 4, canvas.width - 8, canvas.height - 8, r);
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    roundRect(c, 4, 4, canvas.width - 8, canvas.height - 8, r);
    c.stroke();
    // text
    c.font = font;
    c.fillStyle = '#fff7e8';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur = 6;
    c.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true });
    const sprite = new THREE.Sprite(mat);
    // world scale ~ proportional to canvas aspect
    const h = 9;
    sprite.scale.set(h * (canvas.width / canvas.height), h, 1);
    return sprite;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
