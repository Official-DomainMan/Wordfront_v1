# v0.82 Footer controls hard fix

Investigation:
- main.jsx had 8 deploy/control-related mentions before patching.
- Repeated prior patches used `.deployControls`, but the CSS had many old rules hiding or repositioning `.deployControls`.
- The fix avoids those selectors entirely by adding unique classes:
  - `.wfFooterActionDock`
  - `.wfClearButton`
  - `.wfDeployButton`

Detected handlers:
- deploy handler: `deployWord`
- clear handler: `clearPending`

After patch:
- new deploy/action mentions: 6
