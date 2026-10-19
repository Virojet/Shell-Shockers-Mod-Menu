<div align="center">

# Shell Shockers — Mod Menu

**One menu for your [Shell Shockers](https://shellshock.io) mods. Add any userscript, switch themes and turn mods on or off without reloading.**

<br>

[![Install Mod Menu](https://img.shields.io/badge/Install_Mod_Menu-one_click-2ea44f?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/Virojet/Shell-Shockers-Mod-Menu/main/Shell-Shockers-Mod-Menu.user.js)

[![Version](https://img.shields.io/badge/version-1.2.0-0E7697?style=flat-square)](./Shell-Shockers-Mod-Menu.user.js)
[![License: MIT](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)](./LICENSE)

</div>

---

## Install

1. **Get Tampermonkey** for your browser: [Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) · [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) · [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/) · [Opera GX & others](https://www.tampermonkey.net/) (or use [Violentmonkey](https://violentmonkey.github.io/))
2. **[Click here to install Mod Menu](https://raw.githubusercontent.com/Virojet/Shell-Shockers-Mod-Menu/main/Shell-Shockers-Mod-Menu.user.js)**, then press **Install** on the page that opens
3. **Reload [shellshock.io](https://shellshock.io)**

> [!TIP]
> Chrome, Edge, Brave and Opera need **Allow User Scripts** turned on: Extensions → Tampermonkey → Details.

Tampermonkey updates it by itself from this page when a new version is out.

## Open it

- Press **`** (the key under Esc), or
- click the **puzzle piece** button next to the settings gear on the home screen.

To pick a different key, open the menu and click **Hotkey** at the bottom, then press the new key. Esc cancels. Keys the game already uses (like W or R) are refused, so the menu never steals a control.

## Add a script

1. Open the menu and click **Add script**.
2. Paste a link to the script, or paste all of its code. You can also click **Choose file**, or drop a `.user.js` file on the menu.
3. Click **Add** (or press Ctrl+Enter).

These links work:
- a direct link to a `.user.js` file, such as a raw GitHub link;
- a GitHub file page;
- a Greasy Fork script page.

Some sites don't let the game's page download from them. The menu tells you when that happens; open the link, copy the code, and paste it instead.

The script turns on right away. A script with "theme" in its name goes in the **Theme** section, where only one theme is on at a time.

> [!IMPORTANT]
> If Tampermonkey also runs the script, turn it off in Tampermonkey. Otherwise it runs twice, and the menu can't switch off the Tampermonkey copy.

- **To update** a script, add the new version the same way. A script with the same name and namespace replaces the old one and keeps its saved settings.
- **To remove** one, click **Remove** on its card, then **Remove it?** to confirm. This deletes its code and everything it saved.

### What turning a script off does

The menu runs the scripts you add, and keeps track of what each one does. Turning a script off:
- takes away what it added to the page, and puts back what it removed or changed;
- stops its timers, animation frames, listeners and observers;
- puts back the game functions and globals it replaced when it started.

Turning it on again runs it again from the start.

Some changes can't be undone without a reload. When that happens, the card says so and shows a **Reload** button:

| The card says | Why |
|---|---|
| Parts of it start with the page. Reload to start them. | The script hooks into the game while the page loads, so turning it on later only starts part of it. |
| Some of its changes stay until you reload. | Something it changed couldn't be put back live. |

Changes a script makes inside the game's own data, or saves in the game's storage, aren't tracked. Neither is a text, style or attribute change it makes right after a download finishes; that change stays until you reload.

### Where added scripts are kept

They're saved in your browser's storage for the game site, not in Tampermonkey. So:
- each game address (shellshock.io, algebra.best and so on) has its own list;
- clearing the site's data removes them;
- there's room for about 5 MB of scripts in all.

### What scripts get

Scripts get the usual Tampermonkey functions:
- the value functions (`GM_getValue`, `GM_setValue` and the rest);
- `GM_addStyle` and `GM_addElement`;
- `GM_registerMenuCommand`, shown as buttons on the script's card;
- `GM_xmlhttpRequest`, `GM_notification`, `GM_setClipboard` and `GM_openInTab`;
- `GM_getResourceText` and `GM_getResourceURL`;
- `GM_info` and `unsafeWindow`;
- the `GM.*` versions of all of these.

`@require` and `@resource` files are downloaded when you add the script. Each script runs at its `@run-at` time, and only on pages its `@match`, `@include` and `@exclude` allow.

`GM_xmlhttpRequest` goes through the game's page, so it only reaches sites that allow it. Keep scripts that need other sites in Tampermonkey.

## Mods it finds by itself

Mods Tampermonkey runs show up here too:

| Mod | What the menu does |
|---|---|
| **Cherry Blossom** theme | Switches it on or off live, petals included. |
| **Blossom V4** theme | Switches it on or off live. |
| **Fuji Dusk** theme | Switches it on or off live. Its own settings open from the **Settings** button on its card. |
| **Better HUD** | Listed as always on. **Settings** jumps to Better HUD's MODS tab, where its own switches are. |
| Any mod that registers itself | Turned on or off live. See [For mod authors](#for-mod-authors). |

**Themes:** pick one, or pick **Game default** for the normal look. The menu itself follows the theme you pick.

**Your choices are saved.** When you load the game again, a theme you turned off stays off from the first frame, with no flash. When you install a new theme, it takes over once; switch back any time.

> [!NOTE]
> **Why Better HUD has no switch when Tampermonkey runs it:** it changes the game while the page loads, so turning it off needs a reload. Use its MODS tab to turn its parts on or off. To get a switch, turn it off in Tampermonkey and add it to the menu instead. Turning it off then still leaves some of its changes until you reload.

## For mod authors

Add your mod to the menu with a few lines. This works whether your script or the menu loads first:

```js
(window.ssModMenuQueue = window.ssModMenuQueue || []).push({
  id: "my-mod",                 // letters, numbers, . _ - (up to 48)
  name: "My Mod",
  description: "What it does, in one line.",
  group: "mod",                 // or "theme": only one theme is on at a time
  enable() { /* turn it on  */ },
  disable() { /* turn it off */ },
});
```

`enable()` and `disable()` must work again and again without a reload. If the player saved your mod as off, the menu calls `disable()` right away, before the first paint.

If a player adds your script to the menu, this doesn't make a second card. Your `disable()` runs when they switch the script off, before the menu undoes the rest, and your `openSettings()` gets the **Settings** button on the script's card.

Optional fields:

| Field | Meaning |
|---|---|
| `version` | Shown next to the name. |
| `defaultOn: false` | Starts off the first time it's seen. |
| `active: false` | Your mod isn't applied yet, so the menu calls `enable()` if it should be on. |
| `openSettings()` | Adds a **Settings** button to the card. Return `false` if your settings can't open right now. |
| `alwaysOn: true` | Listed with no switch, for mods that can't be turned off live. |

If `enable()` or `disable()` throws, the card shows the error and the switch stays where it really is.

### `window.ssModMenu`

| Call | Does |
|---|---|
| `register(def)` | Same as pushing to the queue. Returns `{ id, isEnabled(), setEnabled(on), unregister() }`. |
| `unregister(id)` | Removes a mod from the list. |
| `isEnabled(id)` / `setEnabled(id, on)` | Reads or changes a mod. |
| `getTheme()` / `setTheme(id)` | The current theme id, or `"none"` for Game default. |
| `addScript(source)` | Adds a script from a link or its code, and turns it on. Returns a promise of its id. |
| `removeScript(id)` | Removes an added script and everything it saved. |
| `list()` | Every mod with its id, name, group, version and state. Added scripts have `script: true`. |
| `open()` / `close()` / `toggle()` | Shows or hides the menu. |

After each change the menu fires `ssmodmenu:change` on `window`, with `{ id, enabled }` in `event.detail`.

## Changelog

### 1.2.0 — 2026-10-19
- **Blossom V4 theme** is found and switched on or off live, like Cherry Blossom and Fuji Dusk.

### 1.1.0
- Add any userscript by link, code or file; the menu runs it and undoes it when it's switched off.

### 1.0.0
- The first version: a list of your mods and themes with switches that work without a reload.

## License

[MIT](./LICENSE)
