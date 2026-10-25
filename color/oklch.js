// OKLab matrices: https://bottosson.github.io/posts/oklab/
// sRGB transfer function: https://www.w3.org/Graphics/Color/srgb
// Allow only small matrix/floating-point errors at the gamut boundary.
const GAMUT_EPSILON = 2e-7;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function encodeSrgb(linear) {
  return linear <= 0.0031308
    ? 12.92 * linear
    : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
}

/**
 * Convert finite OKLCH coordinates (L: 0..1, C: >= 0, H: degrees).
 * Returns clamped, gamma-encoded display RGB and the original gamut status.
 * This module has no UI or Photoshop dependencies and performs no gamut mapping.
 */
function oklchToSrgb(L, C, H) {
  if (![L, C, H].every(value => Number.isFinite(value))) {
    throw new TypeError("OKLCH coordinates must be finite numbers.");
  }

  const h = H * Math.PI / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  // OKLab -> cube-root LMS -> linear LMS -> linear sRGB.
  const lRoot = L + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = L - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = lRoot * lRoot * lRoot;
  const m = mRoot * mRoot * mRoot;
  const s = sRoot * sRoot * sRoot;

  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];

  // Evaluate the original channels BEFORE any display clipping.
  const inGamut = linear.every(value =>
    value >= -GAMUT_EPSILON && value <= 1 + GAMUT_EPSILON
  );
  const [r, g, blue] = linear.map(value => clamp01(encodeSrgb(value)));
  const [r255, g255, b255] = [r, g, blue].map(value => Math.round(value * 255));
  const hex = "#" + [r255, g255, b255]
    .map(value => ("0" + value.toString(16)).slice(-2))
    .join("").toUpperCase();

  return { r, g, b: blue, r255, g255, b255, hex, inGamut };
}

module.exports = { oklchToSrgb };
