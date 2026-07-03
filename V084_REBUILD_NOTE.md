# v0.84 Stable design rebuild

Built from: `wordfront_v078_black_screen_rollback.zip`

Why:
- v0.83 stacked on top of many earlier experimental CSS layers.
- This rebuild starts from the last stable visual layout and reapplies only:
  - unique footer action dock from v0.82
  - Help popup from v0.83
  - requested text/layout polish

Handlers:
- deploy handler: `deployWord`
- clear handler: `clearPending`
