# setup-zotero

Download and setup Zotero in CI for plugin development and testing.

## Usage

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: zotero-plugin-dev/setup-zotero@v1
        with:
          channel: release
      - run: echo "Zotero at ${{ steps.zotero.outputs.zotero-bin-path }}"
```

## Inputs

| Name             | Description                                                                                                    | Required | Default   |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| `zotero-version` | Zotero version (e.g. `7.0.0`, `7.1-beta.39+0acfcd3f9`). Omit for latest.                                       | No       | —         |
| `channel`        | Release channel: `release`, `beta`, or `dev`                                                                   | No       | `release` |
| `architecture`   | Target platform. Auto-detected if omitted. One of: `mac`, `win-x64`, `win-arm64`, `linux-x86_64`, `linux-i686` | No       | —         |
| `cache`          | Use GitHub Actions cache                                                                                       | No       | `true`    |

## Outputs

| Name              | Description                            |
| ----------------- | -------------------------------------- |
| `cache-hit`       | Whether Zotero was restored from cache |
| `zotero-version`  | Installed Zotero version               |
| `zotero-build-id` | Installed Zotero build ID              |
| `zotero-path`     | Path to the Zotero program directory   |
| `zotero-bin-path` | Path to the Zotero executable          |
| `zotero-platform` | Resolved platform identifier           |
| `zotero-channel`  | Resolved channel                       |

## Environment Variables

| Variable                        | Description                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| `ZOTERO_PLUGIN_ZOTERO_BIN_PATH` | Path to Zotero executable (used by `zotero-plugin-scaffold`) |
| `ZOTERO_PATH`                   | Path to Zotero program directory                             |
| `ZOTERO_VERSION`                | Installed Zotero version                                     |

## Platform Support

| Platform             | Status                               |
| -------------------- | ------------------------------------ |
| Windows (x64, arm64) | Supported                            |
| macOS (universal)    | Supported                            |
| Linux (x86_64, i686) | Supported, with automatic Xvfb setup |

## Caching

Installer and extracted program files are cached. Cache key format:

```
zotero-{platform}-{channel}-{version}-{buildID}
```

Set `cache: 'false'` to disable caching.
