import { AdditiveBlending, CanvasTexture, Color, ShaderMaterial } from 'three';

/** Thin glass orbit line: brighter on the near side, fading with depth (docs/03-design.md §4.2). */
export function orbitLineMaterial(color: string, strength: number, radius: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uStrength: { value: strength }, uRadius: { value: radius } },
    vertexShader: /* glsl */ `
      uniform float uRadius;
      varying float vNear;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNear = clamp(world.z / uRadius * 0.5 + 0.5, 0.0, 1.0);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      varying float vNear;
      void main() {
        float alpha = mix(0.3, 1.0, vNear) * uStrength;
        gl_FragColor = vec4(uColor * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

let glow: CanvasTexture | null = null;

/** Shared radial glow texture for camera-facing sprites (core halo, satellite glints). */
export function glowTexture(): CanvasTexture {
  if (glow) return glow;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  glow = new CanvasTexture(canvas);
  return glow;
}
