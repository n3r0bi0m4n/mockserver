# Mock server

Simple HTTP server for serving mock responses from `mock_data`.

## Usage

```
node server.js [--path <folder>] [--port <port>] [--public]
```

- `--path` (default: `mock_data`): directory containing mock files, resolved relative to the repository root.
- `--port` (default: `8085`): port to listen on.
- `--public`: use `0.0.0.0` as the bind address instead of `127.0.0.1`.

The server has no external dependencies. Run it directly with Node.js—no package installation required.
