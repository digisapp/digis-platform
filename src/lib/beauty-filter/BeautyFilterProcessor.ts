import { Track } from 'livekit-client';
import type { TrackProcessor, VideoProcessorOptions } from 'livekit-client';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shaders';
import type { BeautyFilterSettings } from './types';
import { DEFAULT_SETTINGS } from './types';

export class BeautyFilterProcessor implements TrackProcessor<Track.Kind.Video, VideoProcessorOptions> {
  name = 'beauty-filter';
  processedTrack?: MediaStreamTrack;

  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private video: HTMLVideoElement | null = null;
  private animFrameId: number | null = null;
  private settings: BeautyFilterSettings;

  // Uniform locations
  private uResolution: WebGLUniformLocation | null = null;
  private uSmooth: WebGLUniformLocation | null = null;
  private uBrightness: WebGLUniformLocation | null = null;
  private uGlow: WebGLUniformLocation | null = null;

  constructor(settings?: BeautyFilterSettings) {
    this.settings = settings ?? { ...DEFAULT_SETTINGS };
    this.canvas = document.createElement('canvas');
  }

  async init(opts: VideoProcessorOptions): Promise<void> {
    const { track } = opts;

    this.setupVideo(track);
    this.setupWebGL();
    this.startRenderLoop();

    const stream = this.canvas.captureStream(30);
    this.processedTrack = stream.getVideoTracks()[0];
  }

  async restart(opts: VideoProcessorOptions): Promise<void> {
    this.stopRenderLoop();
    this.setupVideo(opts.track);
    this.startRenderLoop();

    const stream = this.canvas.captureStream(30);
    this.processedTrack = stream.getVideoTracks()[0];
  }

  async destroy(): Promise<void> {
    this.stopRenderLoop();

    if (this.processedTrack) {
      this.processedTrack.stop();
      this.processedTrack = undefined;
    }

    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }

    if (this.gl) {
      if (this.texture) this.gl.deleteTexture(this.texture);
      if (this.program) this.gl.deleteProgram(this.program);
      this.gl = null;
      this.program = null;
      this.texture = null;
    }
  }

  updateSettings(settings: BeautyFilterSettings): void {
    this.settings = settings;
  }

  private setupVideo(track: MediaStreamTrack): void {
    if (this.video) {
      this.video.srcObject = null;
    }
    this.video = document.createElement('video');
    this.video.srcObject = new MediaStream([track]);
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.muted = true;
    this.video.play().catch(() => {});
  }

  private setupWebGL(): void {
    const gl = this.canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL not available');
    this.gl = gl;

    // Compile shaders
    const vs = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

    // Link program
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Shader program failed to link');
    }

    this.program = program;
    gl.useProgram(program);

    // Set up geometry (full-screen quad)
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Texture coordinates
    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1,  1, 1,  0, 0,
      0, 0,  1, 1,  1, 0,
    ]), gl.STATIC_DRAW);

    const texLoc = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    // Create texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Cache uniform locations
    this.uResolution = gl.getUniformLocation(program, 'u_resolution');
    this.uSmooth = gl.getUniformLocation(program, 'u_smooth');
    this.uBrightness = gl.getUniformLocation(program, 'u_brightness');
    this.uGlow = gl.getUniformLocation(program, 'u_glow');
  }

  private compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  private startRenderLoop(): void {
    const render = () => {
      if (!this.gl || !this.video || !this.program || !this.texture) return;

      const gl = this.gl;
      const video = this.video;

      // Match canvas size to video
      if (video.videoWidth && video.videoHeight) {
        if (this.canvas.width !== video.videoWidth || this.canvas.height !== video.videoHeight) {
          this.canvas.width = video.videoWidth;
          this.canvas.height = video.videoHeight;
          gl.viewport(0, 0, video.videoWidth, video.videoHeight);
        }

        // Upload video frame to texture
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

        // Set uniforms
        gl.uniform2f(this.uResolution, video.videoWidth, video.videoHeight);
        gl.uniform1f(this.uSmooth, this.settings.smooth);
        gl.uniform1f(this.uBrightness, this.settings.brightness);
        gl.uniform1f(this.uGlow, this.settings.glow);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  private stopRenderLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  static isSupported(): boolean {
    if (typeof document === 'undefined') return false;
    try {
      const c = document.createElement('canvas');
      const supported = !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
      return supported;
    } catch {
      return false;
    }
  }
}
