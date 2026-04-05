# Session Diagnostics And Background-Safe Audio Design

**Date:** 2026-04-05
**Status:** Approved design
**Scope:** Krome session runtime, diagnostics UX, background-safe plip scheduling

## Goal

Make the session plip system reliable in background tabs and provide an in-app diagnostics surface that explains what is breaking, why it is likely breaking, and what the runtime expected to happen, without depending on Chrome DevTools.

## Problem Summary

The current session runtime still couples three responsibilities to the same JavaScript timer loop inside `src/app/hooks/useKrome.tsx`:

- elapsed time updates
- plip boundary detection
- plip playback

This causes persistent issues:

- background tabs throttle the timer loop, so plip decisions happen late or not at all
- missed boundaries are intentionally collapsed by the current catch-up rule, so multiple missed plips are dropped
- brick fill visuals update from stale elapsed state and then jump when the timer wakes up
- debugging depends too heavily on console access and post-hoc reasoning

## Design Principles

1. Split visual timing from audio timing.
2. Keep audio scheduling off the throttled JS timer path.
3. Treat diagnostics as a runtime contract checker, not a generic AI system.
4. Keep diagnostics completely dormant unless Diagnostics Mode is enabled.
5. Surface issues everywhere in the app shell, not only on the Focus screen.

## User Experience

### Diagnostics Mode

Add a `Diagnostics Mode` toggle in settings. When off:

- no diagnostics observers run
- no diagnostics issue chip renders
- no diagnostics history is collected

When on:

- runtime events are collected and classified
- a persistent top-right issue chip appears for active issues
- clicking the chip opens a right-side drawer with the full issue explanation

### Diagnostics Chip

The diagnostics chip is global to the app shell and remains visible across all screens, zoom levels, and page positions.

Behavior:

- appears at the top-right corner of the viewport
- persists until manually dismissed with a close button
- does not auto-dismiss
- clicking the chip body opens the diagnostics drawer
- reflects severity visually: info, warning, error

Chip content:

- short issue title
- one-line summary
- time since first seen or last updated

### Diagnostics Drawer

The drawer opens from the right side and contains the expanded issue details.

Drawer sections:

- expected behavior
- observed behavior
- probable cause
- evidence timeline
- current runtime state snapshot
- related recent events from the same session
- copy/share bug snapshot action

The drawer is intended for debugging and support, not for everyday user education.

## Runtime Diagnostics Model

### Event Collection

When Diagnostics Mode is enabled, the app records structured events from the app shell and session runtime.

Primary event categories:

- session lifecycle
  - `session_started`
  - `session_paused`
  - `session_resumed`
  - `session_completed`
  - `session_abandoned`
- visual timing
  - `visual_loop_started`
  - `visual_loop_stopped`
  - `visual_tick_gap_detected`
  - `visibility_hidden`
  - `visibility_visible`
- audio timing
  - `audio_context_created`
  - `audio_resume_requested`
  - `audio_resume_succeeded`
  - `audio_resume_failed`
  - `plips_scheduled`
  - `plips_cancelled`
  - `unexpected_plip_after_cancel`
  - `end_sound_played`
- runtime health
  - `runtime_error`
  - `unhandled_rejection`

### Issue Classification

Diagnostics rules compare actual runtime behavior against explicit expectations.

Examples:

- active running session with sound enabled should have future plips scheduled
- paused, abandoned, or completed session should not retain scheduled future plips
- active visible session should not show large visual update gaps
- any play attempt after cancellation is a bug
- audio resume failures should always surface when sound is expected

### Issue Shape

Each diagnostics issue contains:

- `id`
- `dedupeKey`
- `severity`
- `title`
- `summary`
- `expected`
- `observed`
- `probableCause`
- `evidence`
- `firstSeenAt`
- `lastSeenAt`
- `dismissed`

### Dedupe Behavior

Repeated detection of the same issue updates the existing issue rather than creating new chips.

This prevents:

- one issue per animation frame
- one issue per repeated visibility transition
- one issue per missed tick during a prolonged failure

## Permanent Plip Fix

### Visual Clock

The visual clock remains in `src/app/hooks/useKrome.tsx`.

Responsibilities:

- compute `elapsed` from wall clock time using `Date.now() - session.startTime`
- update focus UI and brick fill state
- detect session completion

Implementation constraints:

- use `requestAnimationFrame` for visible UI updates
- never decide plip playback from this loop
- when the tab becomes visible again, snap visual state to current elapsed immediately rather than animating a stale catch-up sweep

### Plip Clock

The plip clock is separated from the visual loop and uses the Web Audio timeline.

Responsibilities:

- compute all future plip boundaries from the current session elapsed time
- schedule those plips directly against `AudioContext.currentTime`
- return a cancel function that silences any unsounded future plips

Implementation constraints:

- use a small lead time before the first scheduled sound to avoid resume-edge dropouts
- exclude the final session-end boundary from plip scheduling because session completion uses the end chime
- reschedule on resume after an interrupt using the updated start time and remaining future boundaries

### Lifecycle Rules

At session start:

- warm up the audio context
- compute remaining future plip offsets
- schedule future plips
- start the visual animation loop

At session pause or interrupt:

- stop the visual animation loop
- cancel all future scheduled plips

At session resume:

- recompute future plip offsets from the updated effective session start time
- reschedule future plips
- restart the visual animation loop

At session abandon, completion, logout, provider teardown, or any idle reset:

- stop the visual animation loop
- cancel any remaining future scheduled plips

## File Boundaries

### New Files

- `src/app/types/diagnostics.ts`
  - diagnostics event types
  - diagnostics issue types
  - severity levels and evidence types
- `src/app/services/diagnosticsService.ts`
  - event collection
  - issue classification
  - dedupe logic
  - diagnostics state helpers
- `src/app/components/diagnostics/DiagnosticsChip.tsx`
  - persistent top-right chip
- `src/app/components/diagnostics/DiagnosticsDrawer.tsx`
  - right-side issue detail drawer
- `src/app/components/diagnostics/DiagnosticsHost.tsx`
  - global shell host for rendering chip and drawer

### Modified Files

- `src/app/hooks/useKrome.tsx`
  - split visual clock from plip scheduling
  - emit diagnostics events for runtime state changes
- `src/app/utils/sound.ts`
  - add session plip scheduling and cancellation helpers
  - report audio resume outcomes
- `src/app/core/sessionEngine.ts`
  - compute future plip offsets
  - keep pure timing logic centralized
- `src/app/types.ts`
  - add `diagnosticsMode` to settings
- `src/app/components/SettingsView.tsx`
  - add Diagnostics Mode toggle
- `src/app/App.tsx`
  - mount the global diagnostics host once above page-specific views

## Error Handling

### Diagnostics Errors

Diagnostics must never destabilize the main app runtime.

Rules:

- diagnostics failures fail closed and silently from the app's perspective
- issue classification must be pure and defensive
- browser APIs such as `ReportingObserver` or `PerformanceObserver` are optional and must degrade gracefully if unsupported

### Audio Failures

The app can detect and explain likely audio failures, but it cannot guarantee physical sound output if the browser, OS, hardware, or user settings block playback.

The diagnostics drawer should say this clearly when relevant.

## Verification Strategy

### Automated Checks

Add or update tests/scripts for:

- future plip offset calculation
- cancellation of scheduled plips on pause, abandon, and complete
- session resume reschedules only future plips
- diagnostics dedupe behavior
- active session with sound enabled but no scheduled plips creates a diagnostics issue

### Runtime Validation

Use Diagnostics Mode to validate:

- active session hidden and restored
- pause and resume after several minutes
- abandon during active session
- complete session after backgrounding
- visible session with deliberate visual loop gaps

## Non-Goals

This design does not create:

- a general-purpose AI debugger
- a full telemetry pipeline or remote monitoring system
- guaranteed browser or OS sound output
- broad app-wide instrumentation unrelated to session runtime and debugging

## External Guidance Used

The design was informed by current browser guidance and official references on:

- background timer throttling in modern browsers
- `requestAnimationFrame` behavior in hidden tabs
- Web Audio timeline scheduling and audio context resume behavior
- browser-side diagnostics hooks such as global error and rejection handlers

These references support the core decision to move plip timing off the throttled JS timer path and to rely on explicit runtime diagnostics instead of console-only debugging.
