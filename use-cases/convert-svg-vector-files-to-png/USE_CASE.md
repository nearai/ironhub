### 1. Title

Convert SVG vector files to PNG

### 2. Example prompt

"Convert this SVG logo to a PNG at 2x resolution with a transparent background."

### 3. What the agent does

Uses the svg-to-png web tool to convert SVG vector files to PNG raster images directly in the browser. Unlike CLI converters (Inkscape, ImageMagick) or online services, this tool leverages the browser's own SVG rendering engine — the most accurate implementation of the SVG spec available — so complex features like `<use>` elements, CSS styles, and SVG filters render correctly instead of being dropped or misaligned.

Users can specify output resolution (any scale factor, not just screen pixels) and export with a transparent background. Useful for preparing design assets, icons, or illustrations for use in contexts that don't support SVG natively.

The tool runs entirely client-side at https://vincerubinetti.github.io/svg-to-png/ — no upload to a server, no installation required. Hand the agent an SVG file path and resolution, and it guides you through the conversion or automates it via the web app.

### 4. Skills & tools used

- svg-to-png (web app) — browser-based SVG to PNG converter that uses the browser's native SVG renderer for accurate output; supports high-resolution export and transparent backgrounds (https://github.com/vincerubinetti/svg-to-png)
- File read/write — reads the source SVG and saves the resulting PNG

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [ ] Files / knowledge
- [ ] Automation
- [x] Design / media
- [ ] Skill creation

### 6. Source (optional)

https://github.com/vincerubinetti/svg-to-png

### 7. Author (optional)

mr.potato
