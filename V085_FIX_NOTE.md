# v0.85 Aspect-locked design fix

Why the Railway link and Discord Activity looked different:
- The game was using raw viewport-based CSS grid sizing.
- Discord Activities are web apps hosted inside Discord's iframe, so the available viewport differs from the full Railway browser tab.
- The fix is a centered 16:9 stage using normal CSS, not transform scaling.

Important:
- No fixed canvas transform.
- No JS scaling.
- No ResizeObserver.
- Keeps working footer buttons via `.wfFooterActionDock`.
- Keeps Menu → Help popup.

Handlers:
- deploy handler: `deployWord`
- clear handler: `clearPending`
