# v0.87 Responsive Stabilization

What changed:
- Replaced the entire stacked stylesheet with one clean responsive CSS system.
- No fixed canvas.
- No transform scaling.
- No aspect-locked stage.
- Added a safe ResizeObserver hook that only updates CSS variables/classes:
  - `--wf-vw`
  - `--wf-vh`
  - `data-wf-aspect`
- Keeps the working unique footer button dock.
- Keeps Menu → Help popup.
- Keeps v0.86 bot turn fix.

Why:
- Discord Activities run inside an iframe and the iframe changes size when switching screens/sidebar layout.
- Previous patches stacked conflicting viewport and transform rules, so Railway and Discord diverged.

Handlers:
- deploy handler: `deployWord`
- clear handler: `clearPending`
- bot patch: `checked`
