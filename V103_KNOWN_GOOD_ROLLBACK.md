# v1.0.3 Known-good rollback

This is intentionally rebuilt from `wordfront_v089_design_restored_stabilized.zip`.

Changes:
- Version label bumped to v1.0.3.
- Duplicate async normalized if present.

No changes:
- No new resize hook.
- No CSS rewrite.
- No render logic changes.
- No modal changes.

Server syntax check: `True`

```text

```

Client build check: `True`

```text

> wordfront-client@0.1.0 build
> vite build

[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 116 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m  1.39 kB[22m[1m[22m[2m │ gzip:   0.53 kB[22m
[2mdist/[22m[2massets/[22m[35mindex-D2iXZtLE.css  [39m[1m[2m243.11 kB[22m[1m[22m[2m │ gzip:  31.22 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-CyktEKN8.js   [39m[1m[2m390.35 kB[22m[1m[22m[2m │ gzip: 120.00 kB[22m
[32m✓ built in 1.36s[39m

```
