# v0.86 Stable UI + bot turn fix

UI:
- Reverted v0.85 aspect-locked stage because it smushed the UI.
- Restored the stable normal responsive grid used in v0.78/v0.84.
- Kept working footer buttons via `.wfFooterActionDock`.
- Kept Menu → Help popup.

Bot logic:
- Patched server/src/index.js to await maybeBotTurn after player playWord and emit gameState afterward.
- Made soloGame/joinGame async if needed to avoid await-in-non-async bugs.

Handlers:
- deploy handler: `deployWord`
- clear handler: `clearPending`
- bot patch: `patched`
