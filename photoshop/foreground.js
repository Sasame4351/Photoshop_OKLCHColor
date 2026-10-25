// Photoshop state changes must run inside a modal scope.
// https://developer.adobe.com/photoshop/uxp/2022/ps_reference/classes/solidcolor/
async function setForegroundColor(color) {
  const { app, core } = require("photoshop");
  const { r255, g255, b255 } = color;

  await core.executeAsModal(async () => {
    const solidColor = new app.SolidColor();
    solidColor.rgb.red = r255;
    solidColor.rgb.green = g255;
    solidColor.rgb.blue = b255;
    app.foregroundColor = solidColor;
  }, { commandName: "Set Foreground Color" });
}

module.exports = { setForegroundColor };
