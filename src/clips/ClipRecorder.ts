/**
 * ClipRecorder.ts
 * Records short canvas clips (10–60s) using the MediaRecorder API for
 * YouTube Shorts / highlight generation.
 *
 * Trigger conditions (auto-clip):
 *   - Fireworks show starts      → 20s clip
 *   - Construction completes     → 10s timelapse clip
 *   - District unlock            → 15s flyover clip
 *   - Mayor elected              → 12s clip
 *   - Manual via admin panel     → any duration
 *
 * Output: WebM blob downloaded to browser (or POSTed to a server endpoint).
 * On a GPU server, FFmpeg can convert WebM → MP4 for direct Shorts upload.
 */
import { CityEventBus } from '../city/CityEventBus';

export interface ClipMeta {
  reason: string;
  duration: number;   // seconds
  startedAt: string;
}

export class ClipRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private recording = false;
  private currentMeta: ClipMeta | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.bindEvents();
  }

  /**
   * Must be called once the Three.js canvas is available.
   */
  public setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  public startClip(reason: string, durationSeconds = 20): boolean {
    if (this.recording) return false;
    if (!this.canvas) {
      console.warn('[ClipRecorder] No canvas set');
      return false;
    }

    try {
      const stream = this.canvas.captureStream(30); // 30fps
      const mimeType = this.getSupportedMime();
      if (!mimeType) {
        console.warn('[ClipRecorder] MediaRecorder not supported');
        return false;
      }

      this.recorder  = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
      this.chunks    = [];
      this.recording = true;
      this.currentMeta = { reason, duration: durationSeconds, startedAt: new Date().toISOString() };

      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.recorder.onstop = () => {
        this.recording = false;
        this.saveClip();
      };

      this.recorder.start(1000); // collect every 1s
      console.log(`[ClipRecorder] 🎬 Recording "${reason}" (${durationSeconds}s)`);

      this.stopTimer = setTimeout(() => this.stopClip(), durationSeconds * 1000);
      CityEventBus.emit('clipStarted', { reason, duration: durationSeconds });
      return true;
    } catch (e) {
      console.error('[ClipRecorder] Start error:', e);
      return false;
    }
  }

  public stopClip(): void {
    if (this.stopTimer) { clearTimeout(this.stopTimer); this.stopTimer = null; }
    if (this.recorder && this.recording) {
      this.recorder.stop();
    }
  }

  public isRecording(): boolean { return this.recording; }

  // ── Internal ───────────────────────────────────────────────────────────────

  private saveClip(): void {
    if (this.chunks.length === 0) return;
    const blob = new Blob(this.chunks, { type: this.chunks[0].type });
    const meta = this.currentMeta;
    const filename = `aicity_${meta?.reason.replace(/\s+/g,'_')}_${Date.now()}.webm`;

    // Download to browser
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    const sizeMb = (blob.size / 1_048_576).toFixed(1);
    console.log(`[ClipRecorder] ✅ Clip saved: ${filename} (${sizeMb} MB)`);
    CityEventBus.emit('clipSaved', { filename, sizeMb, reason: meta?.reason });
  }

  private getSupportedMime(): string | null {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return null;
  }

  private bindEvents(): void {
    CityEventBus.on('fireworksRequested', () => {
      setTimeout(() => this.startClip('fireworks_show', 22), 1000);
    });
    CityEventBus.on('constructionComplete', (p) => {
      this.startClip(`construction_${(p['label'] as string).replace(/\s+/g,'_')}`, 12);
    });
    CityEventBus.on('districtUnlocked', (p) => {
      this.startClip(`district_unlock_${p['districtId']}`, 15);
    });
    CityEventBus.on('mayorElected', () => {
      this.startClip('mayor_elected', 12);
    });
    // Admin-triggered manual clip
    CityEventBus.on('adminFireworks', () => {
      setTimeout(() => this.startClip('admin_fireworks', 18), 1000);
    });
  }
}

export const clipRecorder = new ClipRecorder();
