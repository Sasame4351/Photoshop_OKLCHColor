const { entrypoints } = require("uxp");

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

function updateOklchText() {
  document.getElementById("oklch-value").textContent =
    `oklch(${fields.map(field => field.value).join(" ")})`;
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
