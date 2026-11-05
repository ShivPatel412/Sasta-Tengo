# AI Automation HQ — playable first milestone

## Existing application inspection

This repository is a Next.js App Router portfolio, not an agent-management app.
`/dashboard/[[...path]]` provides the classic portfolio dashboard. Authentication
uses the existing HttpOnly `shiv_admin` cookie and MySQL-backed expiring sessions.
`/api/admin/session` and `/api/admin/stats` remain the sources of account and
overview data. Projects, experience and enquiries remain in the existing MySQL
tables; this feature adds no database tables, credentials or write endpoints.

The separate control room at `dashboard.shivpatel.in` is linked by the existing
switcher. Its source in the parent workspace is a Python application, not an
existing Next.js n8n/agent API. This Next.js repo has no workflow executions,
agent management, realtime subscriptions or infrastructure metrics API to reuse.
Those connections are explicitly unavailable in HQ; no fictional task activity,
agent replies, resource usage or success/error counts are displayed.

## Delivered route

`/dashboard/3d` checks the existing admin session on the server before rendering.
The 3D renderer is dynamically imported only on this route. Classic View stays
at `/dashboard`, with an **Enter 3D HQ** sidebar link. The public portfolio does
not import the game or physics packages.

One stylized architectural room includes a wood plank floor, two desks, RGB PCs,
data-bearing monitor textures, chairs, shelves, plants, a glass divider, lounge,
server rack and command table. No reference image or licensed GLB character was
attached to the brief. The player and office host are original mesh placeholders;
replace `Human` in `components/game/World.jsx` when a licensed animated character
is available. Only idle and procedural walking/running leg animation are present;
sitting, GLB animation blending and autonomous NPC navigation are future stages.

## Controls

- Enter headquarters, then click the room: WASD move, Shift run, mouse look.
- If pointer lock is unavailable, click to focus and drag to look. Escape releases
  capture and focus. Movement stops when focus leaves the canvas, a dialog opens,
  or the window loses focus. Form inputs never move the player.
- E opens a nearby aimed-at station. Physics ray tests block interactions through
  intervening geometry. Escape/Close exits the native modal details panel.
- V cycles first person, third person, free camera and isometric overview.
- Free camera: left drag orbit, wheel zoom, right drag pan, with damping.
- M toggles the live minimap. Overview markers navigate to clear station approach
  positions; ordinary camera switches never reset the player.
- Tab while playing opens the real dashboard panel; otherwise normal keyboard
  focus navigation remains available. Classic View links open the existing editor.
- Settings expose FOV, mouse sensitivity, optional head bob and quality presets.

Rapier uses fixed 60 Hz simulation, a rotation-locked continuous-collision capsule,
and fixed colliders for the floor, perimeter, desks, chair bodies, command table,
server rack, host and lounge. Third-person camera rays shorten the camera arm at
obstructions. Only one directional light casts shadows; low quality disables them.
Render DPR is bounded and can drop automatically on sustained slow frames. Monitor
textures and OrbitControls are disposed on unmount. API reads stay outside the
render loop: existing overview data refreshes every 30 seconds, with a last-checked
timestamp and explicit stale/disconnected state on errors. This is polling, not a
new realtime transport. Session/auth checks and writes remain unchanged.

Desktop keyboard/mouse is the supported playable input for this milestone. Mobile
can view the room and use Classic View; touch movement controls are not implemented.
The 60 FPS goal has not been benchmarked on representative desktop hardware.

## Verification

- Node tests cover diagonal speed normalization, camera-relative movement, running,
  proximity/aim/nearest-target selection and unique station identifiers.
- Browser checked authenticated entry and Classic View navigation, live 3-project /
  3-experience counts, PC/command-table E panels, walking, table/wall blocking,
  camera switching without position reset, minimap navigation and Escape release.
- Pointer-lock capture itself is restricted in the embedded test browser; the
  focused keyboard/drag fallback was tested. Test capture in a regular desktop
  browser as well. The upstream Rapier initialization emits a deprecation warning.
- `pnpm test` and `pnpm build` validate the repository. It has no standalone lint or
  typecheck script and no TypeScript source; Next's build performs compilation.

## Remaining stages

Connect an authenticated same-origin automation adapter to the actual control-room
service before populating workflow, NPC or infrastructure state. Keep keys on the
server, retain the existing session guard, validate upstream payloads and preserve
disconnected states. Then add licensed GLB animation blending, real configured NPCs,
execution details, room expansion and representative hardware profiling. No live
monitoring integration or new external access was silently provisioned.
