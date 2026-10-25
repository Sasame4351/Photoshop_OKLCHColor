const { entrypoints } = require("uxp");

const { oklchToSrgb } = require("./color/oklch.js");

const showAlert = () => {
  alert("This is an alert message");
};

entrypoints.setup({
  commands: {
    showAlert,
  },
  panels: {
    vanilla: {
      show(node) {
      }
    }
  }
});

const fields = [
  { id: "lightness", min: 0, max: 1, value: 0.7 },
  { id: "chroma", min: 0, max: 0.4, value: 0.15 },
  { id: "hue", min: 0, max: 360, value: 250 },
];

function getPreviewTextColor(color) {
  // Use the quantized sRGB channels represented by the preview's HEX background.
  const linear = [color.r255, color.g255, color.b255].map(channel => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? "#000000" : "#FFFFFF";
}

function updateOklchText() {
  document.getElementById("oklch-value").textContent =
    `oklch(${fields.map(field => field.value).join(" ")})`;

  const color = oklchToSrgb(fields[0].value, fields[1].value, fields[2].value);
  document.getElementById("color-preview").style.backgroundColor = color.hex;
  const previewHex = document.getElementById("preview-hex");
  previewHex.textContent = color.hex;
  previewHex.style.color = getPreviewTextColor(color);
  document.getElementById("rgb-value").textContent =
    `RGB: ${color.r255}, ${color.g255}, ${color.b255}`;
  document.getElementById("hex-value").textContent = `HEX: ${color.hex}`;
  document.getElementById("gamut-value").textContent =
    `Gamut: ${color.inGamut ? "sRGB" : "Out of sRGB"}`;
}

fields.forEach(field => {
  const input = document.getElementById(field.id);

  function updateValue(commit) {
    const text = String(input.value).trim();
    const value = Number(text);

    if (text !== "" && Number.isFinite(value)) {
      field.value = Math.min(field.max, Math.max(field.min, value));
      if (commit || value !== field.value) {
        input.value = String(field.value);
      }
    } else if (commit) {
      input.value = String(field.value);
    }

    updateOklchText();
  }

  input.addEventListener("input", () => updateValue(false));
  input.addEventListener("change", () => updateValue(true));
  input.addEventListener("blur", () => updateValue(true));
});

updateOklchText();
