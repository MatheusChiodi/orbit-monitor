import { AdditiveBlending, Color, Float32BufferAttribute, ShaderMaterial, TorusGeometry, Vector3 } from 'three';

/** Brand colors for the orb, read from the theme tokens so custom themes recolor it. */
export interface OrbPalette {
  blue: string;
  green: string;
}

export function readOrbPalette(): OrbPalette {
  const style = getComputedStyle(document.documentElement);
  return {
    blue: style.getPropertyValue('--info').trim() || '#3b9eff',
    green: style.getPropertyValue('--ok').trim() || '#22c55e',
  };
}

const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 world = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-world.xyz);
    gl_Position = projectionMatrix * world;
  }
`;

/** Fresnel rim: the bright glass edge, blue at the top fading to green at the bottom. */
export function rimMaterial(palette: OrbPalette, strength: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uBlue: { value: new Color(palette.blue) },
      uGreen: { value: new Color(palette.green) },
      uStrength: { value: strength },
    },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      uniform vec3 uBlue;
      uniform vec3 uGreen;
      uniform float uStrength;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6);
        vec3 color = mix(uGreen, uBlue, smoothstep(-0.7, 0.8, vNormal.y));
        gl_FragColor = vec4(color * rim * uStrength, rim * uStrength);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

/**
 * Glass shell without a transmission pass (cheap on TV boxes): faint tinted body, Fresnel edge and
 * a sharp specular highlight from the top-left key light, blended additively over the dark wall.
 */
export function glassMaterial(palette: OrbPalette): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uBlue: { value: new Color(palette.blue) },
      uGreen: { value: new Color(palette.green) },
      uLight: { value: new Vector3(-0.55, 0.65, 0.55).normalize() },
    },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      uniform vec3 uBlue;
      uniform vec3 uGreen;
      uniform vec3 uLight;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec3 n = normalize(vNormal);
        float facing = max(dot(n, vView), 0.0);
        float fresnel = pow(1.0 - facing, 1.8);
        vec3 tint = mix(uGreen, uBlue, smoothstep(-0.6, 0.7, n.y));
        float spec = pow(max(dot(reflect(-uLight, n), vView), 0.0), 70.0);
        float sheen = pow(max(dot(reflect(-uLight, n), vView), 0.0), 6.0) * 0.08;
        vec3 color = tint * (0.025 + 0.22 * fresnel) + vec3(spec * 0.85 + sheen);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

/** Soft radial glow on a camera-facing plane (core halo, satellite glint). */
export function haloMaterial(color: string, strength: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float glow = pow(max(1.0 - d, 0.0), 2.4) * uStrength;
        gl_FragColor = vec4(uColor * glow, glow);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

/** Inner core: a softly lit gradient sphere, brighter where it faces the viewer. */
export function coreMaterial(palette: OrbPalette): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uBlue: { value: new Color(palette.blue) },
      uGreen: { value: new Color(palette.green) },
    },
    vertexShader: VERTEX,
    fragmentShader: /* glsl */ `
      uniform vec3 uBlue;
      uniform vec3 uGreen;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float facing = max(dot(vNormal, vView), 0.0);
        vec3 color = mix(uBlue, uGreen, smoothstep(-0.5, 0.7, -vNormal.y * 0.6 + vNormal.x * 0.4));
        vec3 lit = color * (0.28 + 0.8 * pow(facing, 1.4)) + vec3(0.85, 0.97, 1.0) * pow(facing, 7.0) * 0.45;
        gl_FragColor = vec4(lit, 1.0);
      }
    `,
  });
}

/** Thin ring whose color sweeps blue → green → blue around its circumference. */
export function gradientRing(palette: OrbPalette, radius: number, tube: number): TorusGeometry {
  const geometry = new TorusGeometry(radius, tube, 8, 256);
  const blue = new Color(palette.blue);
  const green = new Color(palette.green);
  const position = geometry.getAttribute('position');
  const colors: number[] = [];
  const mixed = new Color();
  for (let i = 0; i < position.count; i++) {
    const angle = Math.atan2(position.getY(i), position.getX(i));
    mixed.copy(blue).lerp(green, (Math.cos(angle) + 1) / 2);
    colors.push(mixed.r, mixed.g, mixed.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}
