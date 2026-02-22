# UI Design

## Navigation

A persistent left sidebar contains navigation links. The current screen is highlighted.

```text
┌──────────────────────────────────────┐
│ Channels │ [main content area]       │
│  Plays   │                           │
│ Preview  │                           │
│   Live   │                           │
│          │                           │
│ Settings │                           │
└──────────────────────────────────────┘
```

Sidebar links:

- **Channels** — hardware channel configuration
- **Plays** — play list and editor
- **Preview** — preview mode
- **Live** — live performance mode
- **Settings** — data management (import, export, backup, restore)

## Screens

### Channels

Lists all configured channels. Each channel shows its name, GPIO pin, LED count, and color order.

Actions:

- **Add channel** — opens a modal to create a new channel
- **Edit channel** — opens a modal to edit the channel's fields
- **Delete channel** — removes the channel (with confirmation)
- **Test: White** — sends an all-white test signal to the channel's hardware
- **Test: Off** — turns off the channel's hardware immediately

Channel form fields: name, GPIO pin, LED count, LED type, color order.

### Plays

Lists all plays. Each play shows its name.

Actions:

- **New play** — opens a modal to name a new play, then navigates to the play editor
- **Edit** — navigates to the play editor for that play
- **Delete** — removes the play (with confirmation)

### Play Editor

Accessible from the Plays list. Shows the play name at the top with a **Preview** button that navigates to the Preview screen with this play preloaded.

Two tabs:

#### Regions Tab

Lists all regions in the play. Each region shows its name, channel, and pixel ranges.

Actions:

- **Add region** — opens a modal to create a new region
- **Edit region** — opens a modal to edit name, channel, and pixel ranges
- **Delete region** — removes the region (with confirmation)
- **Test** `[T]` — sends a white test signal to the region's pixel range on hardware

Region form fields: name, channel (dropdown of configured channels), pixel ranges (one or more start/end pairs, 0-indexed).

#### Cues Tab

Lists all cues in play order. Each cue shows its name and the effects assigned to each region.

Actions:

- **Add cue** — opens a modal to create a new cue and assign effects to regions
- **Edit cue** — opens a modal to edit the cue name and effect assignments
- **Delete cue** — removes the cue (with confirmation)
- **Reorder** — cues can be reordered via up/down arrows or drag-and-drop

Cue form fields: name, and for each region in the play: effect type (dropdown) and effect parameters. Regions with no assigned effect remain black for that cue.

Effect parameter fields are rendered dynamically based on the selected effect type, using the parameter definitions in the effects catalog.

### Preview

Shows rendered frames for a selected play during preview mode.

Layout:

- Play selector at the top (if no play is pre-selected)
- Current cue name and cue position (e.g., "Cue 2 of 8: Intro")
- **Previous** and **Next** buttons to advance or go back through cues
- **Stop** button to end the preview session
- Frame visualizer: one horizontal strip per channel, showing the current color of each LED as a row of colored pixels

```text
┌─────────────────────────────────────────┐
│  Preview: Main Stage  [◀ Prev] [Next ▶] │
│  Cue 1 of 8: Intro              [Stop]  │
├─────────────────────────────────────────┤
│ Channel 1 – Main Strand (600 LEDs)      │
│ ██████████████████████████████████████  │
│                                         │
│ Channel 2 – Balcony (300 LEDs)          │
│ ███████████████████                     │
└─────────────────────────────────────────┘
```

The visualizer updates in real-time from the WebSocket frame stream. Each strip pixel maps to one LED; pixels are rendered as small colored squares scaled to fit the available width.

Connecting to an in-progress preview picks up from the current frame without restarting.

### Live

Used during a performance. Shows the current session state and operator controls.

Layout:

- Session name (play name) and current cue info prominently displayed
- Frame visualizer (same strip visualization as Preview) so the operator can see what the lights are doing
- **Next Cue** — large tap target, advances to the next cue (disabled on last cue)
- **Blackout** — activates blackout; all lights go dark but session continues. Pressing Next Cue clears blackout and advances.
- **Stop** — ends the live session and turns off hardware output

```text
┌─────────────────────────────────────────┐
│  LIVE: Main Stage        Cue 2/8: Intro │
├─────────────────────────────────────────┤
│ Channel 1: ██████████████████████████   │
│ Channel 2: ████████████                 │
├─────────────────────────────────────────┤
│  [          NEXT CUE          ]         │
│  [    BLACKOUT    ] [   STOP  ]         │
└─────────────────────────────────────────┘
```

A status indicator shows whether blackout is active. The **Next Cue** and **Blackout** buttons are disabled when no live session is running. **Stop** ends the session.

A live session is started by navigating to the Live screen and pressing a **Start** button (which prompts for a play selection). Returns 409 if a live session is already running.

### Settings

Per-play data management. Lists all plays, each with the following actions:

- **Export** — calls `POST /plays/{id}/export` and offers the resulting file as a download
- **Import (replace)** — uploads a JSON file via `POST /plays/import/upload`, then applies it to this play via `POST /plays/{id}/import`, replacing the play's content
- **Backup** — calls `POST /plays/{id}/backup` to create a timestamped backup
- **Restore** — lists available backups from `GET /plays/{id}/backups` (newest first) and applies the selected one via `POST /plays/{id}/restore`

## Edit Interactions

All create and edit actions open a **modal dialog**. The list or screen behind the modal remains visible but non-interactive. Modals are dismissed by saving, canceling, or pressing Escape.

## Error Handling

API errors display a brief dismissible error message (toast or inline alert). Validation errors from the server (422) show field-level messages where possible. Conflict errors (409) show an explanatory message (e.g., "A live session is already running").

## WebSocket Reconnection

If the WebSocket connection drops during preview or live mode, the client attempts to reconnect automatically. The session continues server-side; the client resumes receiving frames on reconnect.
