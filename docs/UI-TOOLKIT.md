# What a mod can draw

Checked against Claude Code 2.1.293's mod API (2026-10-08). Mods draw with a small set of
elements, laid out like flexbox. They do not get HTML or CSS.

## Where a mod can draw

| Place | What it is |
| --- | --- |
| Band | The row above the prompt. Every plugin's band rows stack. |
| Pane | A side panel. Scrolls by itself when the content is taller than the panel. |
| Status line | One line of text in the footer. |
| Toast | A short popup message. |
| Transcript rows | A plugin can redraw a command's output, or a user message row, inline. |

## The building blocks

| Element | What it gives you |
| --- | --- |
| `Box` | Layout: row or column, gap, padding, margin, width and height, borders, background color, absolute positioning, hover styles, hide and show. |
| `Text` | Color, background, bold, italic, underline, strikethrough, inverse, dim, wrapping or truncation. |
| `Button` | A label, primary or secondary, a plain look, a one-letter hotkey, and an action when pressed. |
| `Markdown` | Rendered markdown: headings, lists, bold, code, and links you can press. |
| `Code` | Syntax-highlighted code, and unified diffs. |
| `Svg` | Any vector drawing: charts, progress rings, diagrams. |
| `Input`, `Select` | Form fields: a text box and a dropdown. Not on mobile. |
| `Link` | A link that opens in the browser. |
| `Image`, `Raster` | Pictures. |
| `Client` | A small stateful widget with its own timers, keys and mouse events: drag, live updates, games. |

## What a mod can do behind the drawing

- Read and write files, list folders, run processes, make HTTP calls.
- Run slash commands and skills, like a button that runs `/dod:check`.
- Call a model on the side, like the rolling handoff draft on Haiku.
- Keep values per session (`$.state`) or across sessions (`$.store`). A change redraws whatever reads it.
- React to events: each turn ending, tool calls, prompts, `/clear`, the session starting.

## Limits to design around

- **No HTML or CSS.** No custom fonts, no exact pixel sizes, no stylesheets. Layout is flexbox in
  character cells. The desktop app draws its own native look from the same tree.
- **No true tabs element.** Tabs are buttons in a row. Make the active one stand out with
  `variant`, and the others `plain` and dim.
- **Borders go around a whole `Box`.** There's no one-sided border, so a divider is a line of text.
- **No global hotkey of your own.** Keybindings can't run a command or open a pane. A `Button`
  `hotkey` works only once its band or pane has the keyboard focus, which is a terminal feature.
- **No file watching.** To notice a file change, check its modified time on a timer.
