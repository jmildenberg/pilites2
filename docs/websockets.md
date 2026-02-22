# WebSocket Protocol

PiLites uses WebSockets for low-latency frame streaming during preview and live mode. All messages are JSON objects with a `type` field.

## Endpoints

| Endpoint              | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `WS /preview/stream`  | Streams rendered frames during preview.              |
| `WS /live/stream`     | Streams rendered frames and status during live mode. |

## Multi-Client Broadcast

Both stream endpoints support multiple simultaneous clients. All connected clients receive the same messages. A client that connects while a session is already in progress begins receiving frames from the current position — no historical frames are replayed.

When a client connects to the live stream mid-session, the server immediately sends a `status` message so the client can synchronize its UI with the current cue and state before the next frame arrives.

## Connection Lifecycle

1. The client optionally calls `GET /preview/status` or `GET /live/status` to check whether a session is already running.
2. If needed, the client starts a session via `POST /preview` or `POST /live/start`.
3. The client connects to `WS /preview/stream` or `WS /live/stream`.
4. The server begins sending messages (and sends an initial `status` message for the live stream).
5. The server sends an `error` message and closes the connection on failure.
6. The server sends a `done` message and closes the connection when the stream ends naturally (preview only).
7. In live mode, the stream continues until the client disconnects or the session is stopped via `POST /live/stop`.
8. If the connection is dropped, the client should reconnect. The session continues on the server side.

## Message Types

### `frame`

Sent on both preview and live streams. Contains the full color state of all channels for the current frame.

```json
{
  "type": "frame",
  "timestamp": 1700000000.123,
  "channels": {
    "channel-1": ["#000000", "#ff0000", "#ffffff"],
    "channel-2": ["#000000", "#00ff00"]
  }
}
```

- `timestamp`: Unix timestamp (float, seconds) of the frame.
- `channels`: Map of channel ID to an array of hex color strings. The array length equals the channel's `ledCount`. Index 0 is the first pixel.

### `status` (live stream only)

Sent when the live session state changes — on start, on cue advance, on blackout, and on stop.

```json
{
  "type": "status",
  "cueId": "cue-1",
  "cueName": "Intro",
  "cueIndex": 0,
  "isRunning": true,
  "isBlackout": false
}
```

- `cueId`: The ID of the currently active cue, or `null` if no cue is active.
- `cueName`: The name of the currently active cue, or `null`.
- `cueIndex`: 0-based index of the current cue in the play's cue list, or `null`.
- `isRunning`: `true` if the live session is active.
- `isBlackout`: `true` if a blackout is currently active.

### `done` (preview stream only)

Sent when the preview stream has finished rendering all cues. The server closes the connection after this message.

```json
{ "type": "done" }
```

### `error`

Sent when an unrecoverable error occurs. The server closes the connection after this message.

```json
{ "type": "error", "message": "Human-readable error message." }
```

## Notes

- The server does not expect any messages from the client. WebSocket communication is server-to-client only.
- Frame rate is determined by the backend FPS target configuration. The client should render frames as they arrive without buffering.
- Channels not affected by the current cue are included in frame messages with all-black values.
