# v0.89 Design Restored + Stabilized

Built from visual base:
`wordfront_v086_stable_ui_bot_turn_fix.zip`

Why:
- v0.87/v0.88 stabilization worked for cross-platform sizing, but the clean stylesheet changed the game's font/design.
- This version keeps the pre-stabilization UI/design CSS, then adds only the safe ResizeObserver stabilization hook.

Kept:
- Working Clear + Deploy buttons via `.wfFooterActionDock`
- Menu → Help popup from the visual base if present
- Bot turn async fix
- Cross-platform iframe reflow variables/classes

Removed:
- v0.87 clean CSS visual rewrite
- Fixed canvas transform
- 16:9 aspect lock
- Font/design reset

Handlers:
- deploy handler: `deployWord`
- clear handler: `clearPending`

Node server syntax check: `True`

```text

```
