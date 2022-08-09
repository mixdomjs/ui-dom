## v1.6.2

### Changes

- Fixed the generational order related to unmounting UIRefs (in _Apply.destroyBoundary) after v1.6.1.

### Package

- Added more info.
- Included the src folder and dev sides into the package.
- Included LICENSE and CHANGES.md (this file) into the package.
- Renamed dist/index* to dist/ui-dom*.
- Renamed the global file to be UIDom.js while ui-dom.js is the file for cjs require.

### Dev

- Cleaned up the dev build process and dev. depencies, so can share the source.
- Refactored a couple of more classes into their own files.

---

## v1.6.1

### Features

- Feature for fragments to be conditional based on whether has content or not (otherwise it's an empty fragment). Implemented as `<uiDom.Fragment needsChildren={true}>` and with a shortcut `uiDom.withContent(...contents)`.
- Provided UIMini as a class / mixin, and made children support for it. Refactored contentApi as its own part (away from contextApi). 

### Changes

- Changed the unmounting order in destroying boundaries to use tree order (not reverse). This is to mirror the UIRef's unmounting process which is in tree order - because then can "salvage" all dom nodes inside a salvaged node (otherwise they would have been unmounted already, so the salvage feature would be of little practical use). Finally, the conclusion was that it's too incoherent to have refs unmount in tree order while components unmount in reverse order. (It's debatable, though.)
- Reorganized naming related to UIMini, UILive and UIComponent. So now the term "component" simply means any renderer source: function or class/mixin. And Live means the fully featured component, while Mini is the smaller one - both regardless of whether is function or class/mixin. Mostly affects typing but also some internal class members.

### Dev

- Refactored the Classes file into multiple smaller classes.

----

