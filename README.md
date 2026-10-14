# dsh-approval-enter

Focus the DeepSeek Harness approval panel automatically, so **Enter approves and Esc rejects** without reaching for the mouse.

`dsh` 的审批面板弹出时自动获取焦点，**回车批准、Esc 拒绝**，不用再点鼠标。

---

## The problem · 问题

DeepSeek Harness ships Enter/Esc shortcuts for approvals, but the panel inserts itself alongside the composer **without taking focus**:

```js
// @deepseek-ai/dsh-client-ui-approval/lib/client.js
if (event.defaultPrevented
    || !event.currentTarget.contains(document.activeElement)   // ← requires focus inside
    || element.closest("input, textarea, ...") !== null) return;
```

Focus stays in the composer, whose Enter means "send", so Enter never reaches the panel. You have to click the card first — or press `Tab`.

This plugin makes the focus follow the panel.

## What it does · 行为

| Composer state | Behaviour |
| --- | --- |
| **Empty** | Focus moves into the panel → `Enter` approves, `Esc` rejects |
| **Has a draft** | Focus is **left alone** — your Enter still means "send"; `Tab` reaches the panel |
| Same request | Decides once, does not fight you for focus |
| Panel closes | Focus returns to where it was |

The draft rule is deliberate: stealing focus mid-sentence loses typing, and a reflexive Enter afterwards could approve a destructive command.

## Install · 安装

```sh
dsh plugin --profile desktop add github:YOUR-USER/dsh-approval-enter
```

Or pin a local clone (edits take effect immediately — the profile links it):

```sh
git clone https://github.com/YOUR-USER/dsh-approval-enter ~/dsh-plugins/dsh-approval-enter
dsh plugin --profile desktop add "link:$HOME/dsh-plugins/dsh-approval-enter"
```

Restart DeepSeek Harness afterwards.

## Uninstall · 卸载

```sh
dsh plugin --profile desktop remove dsh-approval-enter
```

## Compatibility · 兼容性

- DeepSeek Harness desktop app, or `dsh web`
- Verified against the panel markup as shipped in dsh `0.2.0-rc.2`
- No API key, no login, no runtime dependencies

If a future build renames the panel's `data-approval-key` / `data-approval-scroll` attributes the focus target is not found; the plugin then falls back to the panel root and grants it a programmatic tab stop. If the panel cannot be focused at all, the plugin does nothing and the shipped behaviour returns.

## How it works · 原理

The official panel renders two hooks this plugin uses:

- the panel root carries `data-approval-key` and owns the `keydown` handler
- the detail area carries `data-approval-scroll` and `tabIndex: 0`

A `MutationObserver` watches for the panel, and — only when the composer holds no draft — moves focus to the detail area. The official `keydown` guard then sees focus inside the panel and lets Enter and Esc through. Nothing else is patched, and no official file is modified: the browser half ships through `exports["./client"]`, the way any dsh client plugin does.

## License

MIT
