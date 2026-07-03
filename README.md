# Wordfront MVP v0.18 Word-List Validator

This version fixes the dictionary problem by using the npm `word-list` package on the server.

## Run

Server:
```powershell
cd C:\Dev\wordfront-v018-wordlist-validator\server
npm install
npm run dev
```

Client:
```powershell
cd C:\Dev\wordfront-v018-wordlist-validator\client
yarn install
yarn dev
```

## v0.18 fixes
- Uses a large local English dictionary from `word-list`.
- Server-side validation applies to all players.
- SENT, GET, GOLF, GRAMS, HORN, and JOKER are included.
- Fake letter strings should still reject.
- Keeps the v0.17 UI cleanup.


## v0.19
- Fixed cut off WORDFRONT logo.
- Tightened left rail sizing.
- Cleaner gear-style menu button.
- Better responsive board scaling.


## v0.20
- Rebuilt UI to match the latest mockup more closely.
- Fixed cut-off logo.
- Restored full Surrender/Menu buttons.
- Fixed turn log layout.
- Improved board/rack proportions.


## v0.21
- Fixed left panel cards being cut off/overlapping.
- Separated bot card and turn log into their own grid rows.
- Kept Surrender/Menu as full buttons.
- Adjusted logo scale so it stays inside the left rail.


## v0.22
- Removed the Turn Log panel from the left rail.
- Removed strength numbers from board letters for cleaner readability.
- Board tile strength is available via hover tooltip.
- Left rail now keeps Lobby, Scoreboard, Bot card, Surrender, and Menu fitting cleanly.


## v0.23
- Fixed lobby card clipping so the Leave Lobby button is visible.
- Menu Return to Lobby now actually returns to the home/lobby screen and ignores old game broadcasts.
- Added a server leaveGame event so the client leaves the socket room.


## v0.24 Discord Activity Support
- Adds `@discord/embedded-app-sdk`.
- Adds `/api/auth/exchange` on the backend.
- Adds production static serving for the Vite build.
- See `DISCORD_ACTIVITY_SETUP.md`.


## v0.25
- Fixed Express 5 production fallback route error: `Missing parameter name at index 1: *`.
- Replaced `app.get('*')` with `app.use(...)` for client-side routing fallback.


## v0.26
- Discord Activity UI scaling pass.
- Smaller left/right rails to give the board more room.
- Fixed Leave Lobby clipping.
- Reduced board letter size inside tiles.
- Kept stacked Surrender/Menu buttons for Discord iframe fit.


## v0.27
- Current Rules reduced to two rules.
- Right panel compacted to remove empty space.
- Board letters made smaller.
- Fixed Deploy Word clipping.
- Moved invalid-move errors into a fitted bottom-right alert box.
- Discord Activity layout closer to the provided mockup.


## v0.28
- Smaller board letters, closer to the original web app look.
- Logo subtitle simplified to version only.
- Hidden visible Discord env warning from the logo area.
- Fixed Deploy Word button clipping.
- Added responsive scaling for smaller Discord windows.


## v0.29
- Fixed overlapping left/right/top/bottom panels.
- Made board letters smaller.
- Added cooler beveled/3D board tile styling.
- Improved body text font while preserving neon section headers.
- Kept bottom-right error box unchanged.


## v0.30
- Fixed game panels clipping/overlap in Discord-sized windows.
- Fixed Deploy Word button clipping.
- Added compact Discord-specific layout sizing.
- Added cooler beveled board tile styling.
- Added themed styling for the pre-game lobby/home screen.


## v0.31
- Fixed Railway production frontend trying to call localhost:3001.
- Production now uses the same Railway origin for Socket.IO and API calls.
- Solo vs Bot/Create Game buttons should work on the hosted Railway URL.


## v0.32 Postgres persistence
- Added optional Railway Postgres persistence using `DATABASE_URL`.
- Saves completed matches to `matches`.
- Saves cumulative player stats to `player_stats`.
- Adds `/leaderboard` and `/matches/recent` API routes.
- If `DATABASE_URL` is missing, the game still runs normally without persistence.


## v0.33 Perfect UI frame
- Reworked the game layout to match the approved mockup.
- Fixed cut-off side panels and top/bottom sections.
- Made Deploy Word fully visible.
- Improved board/card/rack spacing and visual hierarchy.
- Added responsive Discord embed fallbacks.


## v0.34 Rack/button polish
- Moved Clear and Deploy Word to the right side of the rack area.
- Fixed Deploy Word clipping.
- Added slight height/breathing room to Lobby card so Leave Lobby is not clipped.
- Left the rest of the v0.33 UI unchanged.


## v0.35 Async crash fix
- Fixed Railway crash caused by `await persistIfFinished(game)` inside a non-async socket handler.
- Removed unnecessary persistence check immediately after joining games.
- Keeps v0.34 rack/button UI polish.


## v0.45 Real class responsive/color fix
- Corrected previous CSS patches to target the app's real class names: `.timeCard`, `.boardPanel`, `.battlefield`, `.mapCell`, `.letterTile`, and `.deployControls`.
- Added early color-scheme/theme-color metadata for iframe/browser rendering.
- Rebuilt responsive rack sizing so letters do not crop and buttons remain right-aligned.
- Hard-locked dark Wordfront colors across Discord web and desktop.


## v0.46 Neon tile/design fix
- Restored neon green/purple map tile styling using real class names.
- Strengthened browser/Discord-web dark palette lock.
- Adjusted rack/deploy controls to avoid overlap while preserving responsiveness.


## v0.47 Dark UI final polish
- Restored darker original Wordfront palette.
- Restored neon green/purple board and rack tile styling.
- Reduced board sizing so it no longer clips into rack.
- Adjusted deploy controls to avoid overlap.


## v0.48 Board polish
- Made board letters smaller so stability numbers remain readable.
- Softened 2X tile brightness.
- Restored single-dot empty grid cells.
- Fixed Clear/Deploy button overlap with an even control grid.
- Added left-panel height/padding fixes so the bot card no longer clips.


## v0.49 Contested + clear button fix
- Added contested tile styling matching the legend.
- Softened 2X tile styling so placed letters stay readable.
- Fixed Clear/Deploy controls so Clear is no longer clipped.


## v0.52 Stable recovery
- Recovered from v0.50 black screen by rebuilding from stable v0.49.
- Kept complete Clear/Deploy button fixes.
- Added safe reconnect/session reattach support.
- Added server-side bot difficulty logic with safe default medium.
- Optional bot difficulty can be tested with URL query: `?bot=easy`, `?bot=medium`, `?bot=hard`, or `?bot=godlike`.


## v0.55 Clean difficulty build fix
- Rebuilt from stable v0.52 instead of broken v0.53.
- Added required Solo vs Bot difficulty modal cleanly outside the error block.
- Medium bot tuning is 5–7 letters.
- Verified the client builds successfully with Vite.


## v0.58 Rollup/Railway fix
- Removes mixed npm package-lock files so Yarn does a clean install.
- Stops ignoring optional dependencies; Rollup's native Linux package is required by Vite.
- Explicitly adds `@rollup/rollup-linux-x64-gnu` to client optionalDependencies.
- Railway build now removes cached node_modules before installing.


## v0.59 Visible difficulty + deploy fix
- Added visible required Bot Level selector before Solo vs Bot starts.
- Solo games send selected difficulty to the server.
- Medium bot tuning is 5–7 letters.
- Deploy controls are widened so Clear and Deploy Word are fully visible.


## v0.60 Lobby redesign + deploy fix
- Redesigned the home/lobby screen to match the neon in-game Wordfront style.
- Restyled bot difficulty selection into a larger themed selector.
- Made Solo vs Bot and lobby controls visually stronger.
- Increased the rack action column so Clear and Deploy Word fit fully.


## v0.61 Visual overhaul
- Implements mockup-inspired neon sci-fi game UI with glass panels and purple/green battlefield background.
- Adds letter score numbers to rack tiles.
- Reworks rack/deploy layout using grid columns so Deploy Word no longer clips.
- Restyles board, sidebars, legend, territory bar, and home screen.


## v0.62 Layout/rack/deploy fix
- Repairs v0.61 layout clipping.
- Restores stable rack tile sizing/spacing.
- Moves Clear/Deploy into a reserved right-side rack zone so Deploy Word is fully visible.
- Stabilizes side rails and brand sizing.


## v0.63 Stable footer layout
- Restored a true 3-column rack footer: instructions / letter rack / actions.
- Fixed Deploy Word and Clear by removing absolute-position overlap.
- Stabilized rack tile dimensions so the rack no longer collides with buttons.
- Reduced board/footer pressure to better match the cleaner earlier layout.


## v0.64 Discord frame lock
- Overrides the max-height rules that made the game tiny inside Discord desktop.
- Locks Discord iframe layout to stable desktop proportions.
- Fixes clipped Wordfront logo.
- Forces rack/Clear/Deploy into a real 3-column footer with no overlap.


## v0.65 Discord fixed frame
- Hard-locks Discord Activity dimensions instead of stacking fluid viewport rules.
- Fixes board/rack shrinking in Discord.
- Pins Clear and Deploy Word in a dedicated non-overlapping footer action column.
- Fixes clipped logo with scaled wordmark.


## v0.66 Mockup layout polish
- Enlarged/fitted logo section.
- Recentered board and prevented board cutoff.
- Rebuilt footer with fixed instruction/rack/actions columns.
- Fixed Deploy Word clipping and placement.
- Restored stable rack tile sizing and spacing.


## v0.67 Discord fluid scale fix
- Makes the entire game scale proportionally when Discord sidebar width changes.
- Board size is calculated from available iframe width/height to prevent cutoff.
- Footer uses CSS variables for rack/action sizing so Deploy Word never overlaps the rack.
- Deploy Word is pinned to the right action column.


## v0.68 Footer actions + left panel fix
- Moves Clear and Deploy Word into the right footer action column.
- Prevents Deploy Word from overlapping the letter rack or being clipped.
- Gives the left bottom button area enough height so Menu remains visible.
- Keeps the v0.67 fluid responsiveness when Discord sidebar size changes.


## v0.69 Left panel + deploy restore
- Increased and stabilized left rail card/button heights so nothing clips.
- Restored Deploy Word to the visible right footer action column.
- Keeps v0.68/v0.67 responsiveness and leaves the rest of the layout unchanged.


## v0.70 Deploy button markup fix
- Adds a guaranteed `.deployControlsFixed` group inside the rack footer.
- Hides older misplaced Clear/Deploy instances.
- Forces the fixed Clear/Deploy group to the right footer column.


## v0.71 Final footer buttons fix
- Pins the fixed Clear/Deploy controls inside the rack footer using absolute positioning.
- Shrinks the Clear button so it no longer dominates the footer.
- Makes Deploy Word visible and fully inside the panel.
- Leaves the rest of the responsive layout unchanged.


## v0.72 Final footer alignment
- Shrinks Clear button.
- Keeps Deploy Word visible and compact.
- Shifts the letter rack back toward visual center/right.
- Leaves the rest of the layout unchanged.


## v0.73 Restore working footer
- Removed the duplicated `deployControlsFixed` markup from v0.70+.
- Restored the older working 3-column footer layout: instructions / rack / normal deployControls.
- Keeps Deploy Word compact and inside the right column.


## v0.74 Fixed canvas scale
- Renders the game internally at 1600x900 and scales the entire game as one unit.
- Prevents Discord sidebar resizing from rearranging the UI.
- Restores a fixed footer with instructions / rack / Clear+Deploy controls.


## v0.75 Safe CSS-only fixed canvas
- Removes the v0.74 React/JS scale injection that could black-screen Discord.
- Uses CSS-only scaling for the fixed 1600x900 canvas.
- Keeps normal Clear/Deploy controls.


## v0.76 Fixed canvas position fix
- Keeps CSS-only fixed canvas scaling.
- Pins the 1600x900 canvas to top-left instead of centering it off-screen.
- Preserves the normal footer Deploy Word controls.


## v0.78 Black screen rollback
- Removes fixed-canvas JS/CSS transform systems that caused black screens in Discord.
- Restores a normal Discord-safe grid layout.
- Keeps footer/rack/deploy controls stable with standard responsive CSS.


## v0.84 Stable design + Help rebuild
- Rebuilt from v0.78 stable visual base.
- Restores consistent web/Discord neon design with normal responsive CSS.
- Keeps working Clear/Deploy controls using unique footer action classes.
- Keeps Menu → Help popup.


## v0.86 Stable UI + bot turn fix
- Reverts v0.85 aspect-lock that smushed the UI.
- Restores stable responsive layout.
- Keeps working Clear/Deploy buttons and Menu Help popup.
- Fixes solo bot turn by awaiting bot move and re-emitting game state after player word.


## v0.89 Design restored + stabilization
- Rebuilt from the pre-stabilization visual base so the old Wordfront UI/font/design returns.
- Keeps the ResizeObserver stabilization behavior from v0.87 so Discord/Railway resize consistently.
- Keeps working footer buttons, Help popup, and async bot/server fix.


## v1.0.5 Help Menu Only
- Adds Help / How to Play popup.
- Does not change multiplayer names or stabilization.
