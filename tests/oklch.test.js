// Run with: node tests/oklch.test.js (Node built-ins only; not part of the plugin UI).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { oklchToSrgb } = require("../color/oklch.js");

function near(actual, expected, tolerance = 1e-7) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function checkDisplay(color) {
  for (const channel of [color.r, color.g, color.b]) {
    assert.ok(Number.isFinite(channel) && channel >= 0 && channel <= 1);
  }
  for (const channel of [color.r255, color.g255, color.b255]) {
    assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255);
  }
  assert.match(color.hex, /^#[0-9A-F]{6}$/);
  assert.equal(parseInt(color.hex.slice(1), 16),
    color.r255 * 65536 + color.g255 * 256 + color.b255);
}

for (const [L, expected, hex] of [[0, 0, "#000000"], [1, 1, "#FFFFFF"]]) {
  const color = oklchToSrgb(L, 0, 0);
  for (const channel of [color.r, color.g, color.b]) near(channel, expected);
  assert.equal(color.hex, hex);
  assert.equal(color.inGamut, true);
}

// Neutral linear channels are L^3; cover both sRGB transfer branches and boundary.
for (const [linear, encoded] of [
  [0.001, 0.01292],
  [0.0031308, 0.040449936],
  [0.004, 0.05070871397734796],
  [0.125, 0.3885728590463344],
]) {
  const color = oklchToSrgb(Math.cbrt(linear), 0, 0);
  for (const channel of [color.r, color.g, color.b]) near(channel, encoded);
}

for (const L of [0, 0.1, 0.5, 0.7, 1]) {
  const reference = oklchToSrgb(L, 0, 0);
  for (const H of [30, 90, 180, 250, 360]) {
    assert.deepEqual(oklchToSrgb(L, 0, H), reference);
  }
}

// Reference OKLab coordinates for sRGB red, green, blue (Ottosson matrices).
for (const [L, a, b, expected] of [
  [0.6279553606, 0.2248630611, 0.1258462985, [1, 0, 0]],
  [0.8664396115, -0.2338875742, 0.1794984799, [0, 1, 0]],
  [0.4520137184, -0.0324569842, -0.3115281477, [0, 0, 1]],
]) {
  const color = oklchToSrgb(L, Math.hypot(a, b), Math.atan2(b, a) * 180 / Math.PI);
  [color.r, color.g, color.b].forEach((value, i) => near(value, expected[i], 2e-6));
  assert.equal(color.inGamut, true);
}

const initial = oklchToSrgb(0.7, 0.15, 250);
assert.equal(initial.hex, "#4BA3F7");
assert.equal(initial.inGamut, true);
const outside = oklchToSrgb(0.7, 0.4, 250);
assert.equal(outside.inGamut, false);
assert.equal(outside.r, 0);
assert.equal(outside.b, 1);
assert.equal(outside.hex, "#0085FF");
for (const H of [0, 60, 120, 180, 240, 300, 360]) {
  assert.equal(oklchToSrgb(0.7, 0.4, H).inGamut, false);
}
for (const L of [0, 0.1, 0.5, 0.7, 1]) {
  for (const C of [0, 0.15, 0.4]) {
    for (const H of [0, 60, 120, 180, 250, 360]) checkDisplay(oklchToSrgb(L, C, H));
  }
}
const wrapped = oklchToSrgb(0.7, 0.15, 360);
const zeroHue = oklchToSrgb(0.7, 0.15, 0);
for (const channel of ["r", "g", "b"]) near(wrapped[channel], zeroHue[channel]);
assert.throws(() => oklchToSrgb(NaN, 0, 0), TypeError);
console.log("PASS: black, white, neutrals, primaries, gamma branches, gamut and display values");

// Exercise the actual main.js handlers with the actual HTML IDs/defaults.
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const elements = {};
for (const match of html.matchAll(/id="([^"]+)"/g)) {
  elements[match[1]] = { textContent: "", style: {}, listeners: {},
    addEventListener(event, callback) { this.listeners[event] = callback; } };
}
for (const match of html.matchAll(/<input id="([^"]+)"[^>]*value="([^"]+)"/g)) {
  elements[match[1]].value = match[2];
}
vm.runInNewContext(fs.readFileSync(path.join(root, "main.js"), "utf8"), {
  require(name) {
    if (name === "uxp") return { entrypoints: { setup() {} } };
    assert.equal(name, "./color/oklch.js");
    return { oklchToSrgb };
  },
  document: { getElementById(id) { assert.ok(elements[id], id); return elements[id]; } },
});
function edit(id, value, event = "input") {
  elements[id].value = value;
  elements[id].listeners[event]();
}
function expectOutput(L, C, H) {
  const color = oklchToSrgb(L, C, H);
  assert.equal(elements["oklch-value"].textContent, `oklch(${L} ${C} ${H})`);
  assert.equal(elements["rgb-value"].textContent, `RGB: ${color.r255}, ${color.g255}, ${color.b255}`);
  assert.equal(elements["hex-value"].textContent, `HEX: ${color.hex}`);
  assert.equal(elements["gamut-value"].textContent, `Gamut: ${color.inGamut ? "sRGB" : "Out of sRGB"}`);
  assert.equal(elements["color-preview"].style.backgroundColor, color.hex);
  assert.equal(elements["preview-hex"].textContent, color.hex);
}
expectOutput(0.7, 0.15, 250);
assert.equal(elements["color-preview"].style.backgroundColor, "#4BA3F7");
assert.equal(elements["preview-hex"].style.color, "#000000");
edit("lightness", "0.6");
expectOutput(0.6, 0.15, 250);
edit("hue", "120");
expectOutput(0.6, 0.15, 120);
edit("hue", "250");
edit("lightness", "0.7");
edit("chroma", "0.4");
expectOutput(0.7, 0.4, 250);
assert.equal(elements["color-preview"].style.backgroundColor, "#0085FF");
assert.equal(elements["gamut-value"].textContent, "Gamut: Out of sRGB");
for (const [id, min, max] of [["lightness", 0, 1], ["chroma", 0, 0.4], ["hue", 0, 360]]) {
  edit(id, "-10"); assert.equal(Number(elements[id].value), min);
  edit(id, "999"); assert.equal(Number(elements[id].value), max);
  const before = elements["rgb-value"].textContent;
  const previewBefore = elements["color-preview"].style.backgroundColor;
  edit(id, ""); assert.equal(elements["rgb-value"].textContent, before);
  assert.equal(elements["color-preview"].style.backgroundColor, previewBefore);
  edit(id, "", "blur"); assert.equal(Number(elements[id].value), max);
  for (const invalid of ["abc", "NaN", "Infinity"]) {
    edit(id, invalid, "change"); assert.equal(Number(elements[id].value), max);
  }
}
expectOutput(1, 0.4, 360);
edit("chroma", "0", "change");
expectOutput(1, 0, 360);
assert.equal(elements["preview-hex"].style.color, "#000000");
edit("lightness", "0");
expectOutput(0, 0, 360);
assert.equal(elements["preview-hex"].style.color, "#FFFFFF");
edit("lightness", "0.5");
expectOutput(0.5, 0, 360);
assert.equal(elements["preview-hex"].style.color, "#FFFFFF");
edit("lightness", "0.8");
expectOutput(0.8, 0, 360);
assert.equal(elements["preview-hex"].style.color, "#000000");
console.log("PASS: UI initialization, live RGB/HEX/gamut updates, bounds and invalid-input recovery");
console.log("PASS: preview background/HEX updates, light/dark text contrast and clipped out-of-gamut preview");
