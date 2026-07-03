# v1.0.1 Blue screen boot fix

Issue:
- v1.0 deployed but launched into a plain blue screen.
- That usually means either React crashed before render or the global/layout CSS hid the real app.
- The risky pieces were the newly injected modal/hook plus a full stylesheet rewrite.

Fix:
- Replaced v1.0 ResizeObserver with a smaller safer `window.innerWidth/innerHeight` hook.
- Removed Help modal injection for this recovery build to eliminate JSX/modal render risk.
- Added safety CSS so `.gameShell`, `.homeShell`, `#root`, and `.app` cannot render invisible.
- Kept the v1.0 layout foundation and working footer controls.

Server syntax check:
`True`

```text

```

Client build:
`skipped_no_node_modules`

```text

```
