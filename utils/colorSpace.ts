
import { ColorProfile } from '../types';

/**
 * World-class color management utility for Lumina Art Studio.
 * Handles transformations between sRGB, Adobe RGB, and Display P3.
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

// Matrices for linear RGB to XYZ and vice versa
const TRANSFORM_MATRICES = {
  sRGB: {
    toXYZ: [
      [0.4124564, 0.3575761, 0.1804375],
      [0.2126729, 0.7151522, 0.0721750],
      [0.0193339, 0.1191920, 0.9503041]
    ],
    fromXYZ: [
      [3.2404542, -1.5371385, -0.4985314],
      [-0.9692660, 1.8760108, 0.0415560],
      [0.0556434, -0.2040259, 1.0572252]
    ]
  },
  AdobeRGB: {
    toXYZ: [
      [0.5767309, 0.1855540, 0.1881852],
      [0.2973769, 0.6273491, 0.0752741],
      [0.0270343, 0.0706872, 0.9911085]
    ],
    fromXYZ: [
      [2.0413690, -0.5649464, -0.3446944],
      [-0.9692660, 1.8760108, 0.0415560],
      [0.0134474, -0.1183897, 1.0154096]
    ]
  },
  DisplayP3: {
    toXYZ: [
      [0.4865709, 0.2656677, 0.1982119],
      [0.2289746, 0.6917385, 0.0792869],
      [0.0000000, 0.0451134, 1.0439444]
    ],
    fromXYZ: [
      [2.4934969, -0.9313836, -0.4027108],
      [-0.8294890, 1.7626641, 0.0236247],
      [0.0358458, -0.0761724, 0.9570296]
    ]
  }
};

const gammaCompand = (v: number, profile: ColorProfile): number => {
  if (profile === 'AdobeRGB') return Math.pow(v, 1 / 2.19921875);
  // sRGB and Display P3 standard transfer function
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
};

const gammaLinear = (v: number, profile: ColorProfile): number => {
  if (profile === 'AdobeRGB') return Math.pow(v, 2.19921875);
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const multiplyMatrix = (m: number[][], v: [number, number, number]): [number, number, number] => {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
  ];
};

export const convertRGB = (rgb: RGB, from: ColorProfile, to: ColorProfile): RGB => {
  if (from === to) return rgb;

  // 1. Linearize RGB
  const linearFrom: [number, number, number] = [
    gammaLinear(rgb.r / 255, from),
    gammaLinear(rgb.g / 255, from),
    gammaLinear(rgb.b / 255, from)
  ];

  // 2. Linear RGB to XYZ
  const xyz = multiplyMatrix(TRANSFORM_MATRICES[from].toXYZ, linearFrom);

  // 3. XYZ to Target Linear RGB
  const linearTo = multiplyMatrix(TRANSFORM_MATRICES[to].fromXYZ, xyz);

  // 4. Compand back to Target Gamma
  return {
    r: Math.max(0, Math.min(255, Math.round(gammaCompand(linearTo[0], to) * 255))),
    g: Math.max(0, Math.min(255, Math.round(gammaCompand(linearTo[1], to) * 255))),
    b: Math.max(0, Math.min(255, Math.round(gammaCompand(linearTo[2], to) * 255)))
  };
};

export const isOutOfGamut = (rgb: RGB, from: ColorProfile, to: ColorProfile): boolean => {
  const linearFrom: [number, number, number] = [
    gammaLinear(rgb.r / 255, from),
    gammaLinear(rgb.g / 255, from),
    gammaLinear(rgb.b / 255, from)
  ];
  const xyz = multiplyMatrix(TRANSFORM_MATRICES[from].toXYZ, linearFrom);
  const linearTo = multiplyMatrix(TRANSFORM_MATRICES[to].fromXYZ, xyz);
  
  return linearTo.some(v => v < 0 || v > 1);
};
