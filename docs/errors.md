# Error Handling

## HTTP Error Responses

All error responses use a consistent JSON body:

```json
{ "detail": "Human-readable error message." }
```

This matches the FastAPI default error format and applies to all non-2xx responses.

## HTTP Status Codes

| Code | When used |
| ------ | ---------- |
| 400 | Bad request — the request is malformed or logically invalid (e.g., invalid file path on import). |
| 404 | Not found — the requested resource does not exist (e.g., unknown play or channel ID). |
| 409 | Conflict — the operation cannot proceed due to state (e.g., starting live mode when already running). |
| 422 | Validation error — the request body fails schema validation. FastAPI returns structured detail (see below). |
| 500 | Internal server error — an unexpected failure on the backend. |

## Validation Errors (422)

FastAPI returns structured detail for validation failures:

```json
{
  "detail": [
    {
      "loc": ["body", "gpioPin"],
      "msg": "value is not a valid integer",
      "type": "type_error.integer"
    }
  ]
}
```

## WebSocket Errors

Errors during a WebSocket stream are sent as a message before the connection closes:

```json
{ "type": "error", "message": "Human-readable error message." }
```

The server closes the WebSocket connection after sending an error message.

## Not Found vs. Validation

- Use **404** when the resource ID is unknown.
- Use **422** when the request body is structurally invalid.
- Use **400** for domain-level invalidity that passes schema validation. Examples:
  - A region references a `channelId` that does not exist.
  - A region's ranges overlap each other.
  - Two regions assigned to the same cue have overlapping pixel ranges on the same channel.
