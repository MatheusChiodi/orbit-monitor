import { AdditiveBlending, Color, ShaderMaterial, TorusGeometry, Float32BufferAttribute } from 'three';

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
        vec3 color = mix(uBlue, uGreen, smoothstep(-0.2, 0.9, vNormal.y * 0.6 + vNormal.x * 0.4));
        gl_FragColor = vec4(color * (0.35 + 0.85 * pow(facing, 1.6)), 1.0);
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
