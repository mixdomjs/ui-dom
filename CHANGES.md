## v1.7.1

### Enhancements

- Refined that using .getDomNodes(true) for refs will include multiple root nodes if has multiple roots - not just the first one. So for example, if refers to a boundary and it returns a fragment, will get all the root dom nodes.
- Improved and clarified the mixin TypeScript support.
  - For all 3 basic use cases: use, extend and create combos.
  - Also refined that the UILiveMixin and others utilize types from interface (vs. the programmatically created class).


### Optimizations

- Optimized that adjacent string content are joined together in the createDef process - there's no need to create a textNode (or wrap a tag) around each. So for example: `<span>hello: {someName}!</span>` results in `uiDom.def("span", null, "name :", someName, "!")`, and so we can just join "name :", someName and "!" together (if all are strings). (As this is in the static part, we can't include a setting for this (at least currently).)

### Changes (in JavaScript)

- In the processing, refactored needsChildren from Fragment's props to the def - so fragment has no props after being handled as a def.
- Changed uiDom.Fragment's `needsChildren` prop to `withContent` to avoid confusion with how `contentApi.needsChildren` behaves. Also matches with `uiDom.withContent` which clarifies the feature.
- Removed UILive.initContext method. It's just confusing, and if needs to init the local context can do it like state: live.context = {...}.
- Removed unused getHostsFromTreeNodes static method from UIContextServices.

### Changes in TypeScript & Comments

- Changed internal typing name from GroundedTreeNode* to UITreeNode*.
- Cleared up some comments. Especially the confusing old comments from UIContextServices .refreshNow method. (It explained the earlier slower way to get the nodes in the tree - they are now based on direct interests.)
- Removed the UISomeClassType from all related, as the type didn't work correctly. Simply use typeof UISomeClass. The only exception is UIWiredType as it needs to have generics inside a static class. It's also just clearer to have its as own type because of its special half-static-like functionality.

## v1.7.0

### Features

- Supported inserting multiple contexts with a single uiDom.Contexts def: `<uiDom.Contexts cascade={namedContexts}>...</uiDom.Contexts>`

### Changes

- Removed inserting context by `<uiDom.Context name="themes" context={themesContext}>`. Instead all are inserted by `<uiDom.Contexts cascade={namedContexts}>`.
- In relation to above, changed that UIContext class / mixin does not care for props anymore, and can accept data and settings instead.
- Changed the def type detection to use UI_DOM_TYPE static member in all cases and added it to the pseudo classes.

### Fixes

- Fixed recognizing mixin versions of UIContext and UIHost.

### Package

- Fixed log in CHANGES.md v1.6.2: src not included in the npm package. Instead, the source files can be found at the GitHub repo: https://github.com/ui-dom/ui-dom.git

### GitHub

- Update all to version 1.7.0.
- Included the src folder and dev stuff into the GitHub repo.
- Added CONTRIBUTING.md.

---

## v1.6.2

### Changes

- Fixed the generational order related to unmounting UIRefs (in _Apply.destroyBoundary) after v1.6.1.
- Changed UISourceBoundary.qId to UISourceBoundary.uiId.

### Package

- Added more info.
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

