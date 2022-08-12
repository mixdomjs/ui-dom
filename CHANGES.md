## v2.0.0

### Why new main version?

- Main reason is to reorganize the naming all throughout. (Most importantly for UILive but all around at the same time.)
  - Before v2.0.0, in the members and methods of UILive, the term "context" is sometimes synonymous for "context data" and sometimes for "context" and sometimes for the "locally built context" - it's unnecessarily confusing. In addition some names are (unnecessarily) long related to using contexts (especially from a live component).
  - This also made respective calls for actions look a bit strange (they are contextual, too). For example, calling `.needsContexts` might sound as if something you'd need to do before calling `.needsActions` in that context - whereas it means that needs DATA in that contexts. Furthermore, it was confusing that `.needsActions` and `.needsContexts` actually function in different "scale": `.needsActions` is for one context while `.needsContexts` is for many contexts.
  - Also the naming of "dispatch" in `UIContext` is changed to shorted and more friendly "send" and "ask" respectively (see details below).

- Another change is that from v2.0.0 onwards, uiDom uses no heavy-typing at all. This means that extending `UILive` or other classes or mixins should cause no TypeScript problems further on. The only heavy one remaining before v2.0.0 was the old `needsContexts` method (now `needsDataBy`).
- There were also some tinier things to reorganize, so clumped together into here.

### Naming changes

- **UILive** : The naming in relation to 1. context data, 2. context actions, 3. local data built from many contexts. Respectively the naming is changed in the contextApi as well.  (Basically all naming of all related methods changed.)
- **UILive**, **UIContext**, **UIContextApi**, **UIContextServces**: "Dispatching" actions and questions has been changed to "send" (instead of "dispatch") for actions and "ask" for questions and questionaries.  This is simply for brevity and a bit easier to understand for non-English speakers.
- **UIHost**: Changed `.renderWith` to  `.update` and `clearContents` to `clear`. Added `addListener` and `removeListener` to the interface (where in the mixin base class but not in the type). In settings changed the special value of "contextual" in `preEqualCheckDomProps` to be "if-needed" - because has nothing to do with contexts (and "if-needed" describes better what it does).
- **UIHostServices**: Reorganized internal member and method naming.
- **UIContext**: Renamed `addAsPostActions` and `addAsQuickActions` to `flagPostActions` and `flagQuickActions`. Also renamed the `roots` to `inTree`. Also removed `.refresh` and renamed `.refreshBy` to `.refresh`. It's not named to `refreshData` because it also refreshes the actions - it's the common call for both.
- **UIContextServices**: Reorganized internal member and method naming.
- **UIContext** / **UIContextServices**`: Moved and renamed the static class `UIContext.addToSettingsActions` to `UIContextServices.addActionSettings`.
- **UISourceBoundary**: Renamed temporary values `_isVirgin` to `_notRendered` and `_renderingState` to `_renderState` and `contentClosure` to `closure` and `sourceBoundary` to `source`.
- **UIRef**: Renamed `attachedTo` to `treeNodes`.
- **UIWired**: Changed `instanced` to `boundaries`. Also changed `getWiredProps` to `getAddedProps` to clarify that "wired" refers to the wired targets (as it does elsewhere) - not the commonly added props by the source of wiring. Also changed `updateWired` to `update` for brevity and similarity of `.update` usage elsewhere (eg. on `UISourceBoundary`).

### Fixes

- Fixed in `.hasPending` method on `UIHostServices` to correctly check the render side pending (was checking update side then too).
- Fixed `roots`(or now `inTree`) to correctly support the rare case of the same context being inserted with multiple names (in a single `uiDom.contexts` insertion).

### Additions

- Couple of extra methods added for clarity and symmetry: for example `.needsActionsBy` and `.refreshDataBy`.
- Also added a `UILiveBy` type and `createLiveBy` method for typing purposes, where there's context (especially just actions) needs but no need for state (or even props). The order is: `<AllContexts, Remote, Props, State>`.
  -  Of course sometimes you need actions and props, but not Remote, so then just use: `<AllContexts, {}, Props>`. It's short enough and better than using `<Props, {}, {}, AllContexts>` - or using  `<{}, {}, {}, AllContexts>` for actions.

### Minor enhancements

- Refined typing for `UIContext` settings in `createContext` helper and `.modifySettings(settings)`. And made the general type for `UIContextSettingsUpdate` be generic with inputtable `<ActionTypes extends string = string>`.

### Minor changes 

- Changed needsActions the default value for `needsActions` optional 3rd arg: `extend`. Now it's `true` similarly to the new `.needsData` definition (see below). 
  - This is to reflect that the singular forms (`.needsAction` and `.needsData`) always function as if extend mode - they don't go resetting other needs. (This is similarly in `.needsDataBy` though in a larger scale - across many contexts. For this too it's clearer if the extending principle the same all the way through.)
  - Dev point: Of course, resetting is faster than extending. So to account for this, checks in `UIContentApi` if has no previous actionNeeds defined (`!this.actionNeeds.size`), then is in reset mode. (It's relatively rare to modify the action needs after the initializing procedures - but can be useful and is of course supported.)
- Changed the `.needsData` method arguments on `UILive`.
  - Removed totally the `...contextNames[]` form of input. It encourages non-performant usage and prevents from giving other arguments.
  - Now instead only the dictionary form of input is supported (keys are context names and values are boolean, dotted-dataKey-string or an array of dotted-dataKey-strings).
  - In addition, added two extra arguments, so as a whole we have: `(needs: Dictionary, extend: boolean = true, refreshIfChanged: boolean = true)`. 
  - The extend part functions and defaults similarly to `.needsActions`: it allows to keep the needs for contexts not found in the given dictionary. The refresh argument is like in `.needsContext`, so putting it to false does not mark the component for updates.
  - Importantly for TypeScript usage, remade the typing for the dictionary in a non-heavy way. As a result, there's zero heavy typescript operations in `UILive` (or the whole `uiDom` library). So, for example, mixins can require `UILive` base class without warnings about excessively deep iterations when combining many.
  - The only draw back (compared to older heavy-way typing) is that you need to use `as const` for each array. For example: `{ settings: ["themes.selected", "typescript"] as const, navigation: "page" }`. Otherwise TypeScript will convert the array to `string[]` form which of course is meaningless for our typing purposes.
- In relation to both above, cleared up defaults from `UILive` component: the defaults (extend, refresh) are in the `UIContentApi` methods. Modified the comments accordingly in all.

---

## v1.7.1

### Enhancements

- Refined that using `.getDomNodes(true)` for refs will include multiple root nodes if has multiple roots - not just the first one. So for example, if refers to a boundary and it returns a fragment, will get all the root dom nodes.
- Improved and clarified the mixin TypeScript support.
  - For all 3 basic use cases: use, extend and create combos.
  - Also refined that built-in mixins (like `UILiveMixin`) use types from interface (vs. the programmatically created class).


### Optimizations

- Optimized that adjacent string content are joined together in the createDef process - there's no need to create a textNode (or wrap a tag) around each. So for example: `<span>hello: {someName}!</span>` results in `uiDom.def("span", null, "name :", someName, "!")`, and so we can just join "name :", someName and "!" together (if all are strings). (As this is in the static part, we can't include a setting for this (at least currently).)

### Changes (in JavaScript)

- In the processing, refactored `needsChildren` from `UIFragment`'s props to the def - so fragment has no props after being handled as a def.
- Changed uiDom.Fragment's `needsChildren` prop to `withContent` to avoid confusion with how `contentApi.needsChildren` behaves. Also matches with `uiDom.withContent` which clarifies the feature.
- Removed `.initContext` method on `UILive`. It's just confusing, and if needs to init the local context can do it like state: `live.context = {...}`.
- Removed unused getHostsFromTreeNodes static method from UIContextServices.

### Changes in TypeScript & Comments

- Changed internal typing name from `GroundedTreeNode*` to `UITreeNode*`.
- Cleared up some comments. Especially the confusing old comments from `.refreshNow` method in `UIContextServices`. (It explained the earlier slower way to get the nodes in the tree - they are now based on direct interests.)
- Removed the `UISomeClassType` from all related, as the type didn't work correctly. Simply use `typeof UISomeClass` or `ClassType<UISomeClass>` - depending on specifics of the situation. The only exception is `UIWiredType` as it needs to have generics inside a static class. It's also just clearer to have its as own type because of its special half-static-like functionality.

---

## v1.7.0

### Features

- Supported inserting multiple contexts with a single `uiDom.Contexts` def: `<uiDom.Contexts cascade={namedContexts}>...</uiDom.Contexts>`

### Changes

- Removed inserting context by `<uiDom.Context name="themes" context={themesContext}>`. Instead all are inserted by `<uiDom.Contexts cascade={namedContexts}>`.
- In relation to above, changed that `UIContext` class / mixin does not care for props anymore, and can accept data and settings instead.
- Changed the def type detection to use `UI_DOM_TYPE` static member in all cases and added it to the pseudo classes.

### Fixes

- Fixed recognizing mixin versions of `UIContext` and `UIHost`.

### Package

- Fixed log in `CHANGES.md` (v1.6.2): src not included in the npm package. Instead, the source files can be found at the GitHub repo: https://github.com/ui-dom/ui-dom.git

### GitHub

- Included the src folder and dev stuff into the GitHub repo.
- Added CONTRIBUTING.md.

---

## v1.6.2

### Changes

- Fixed the generational order related to unmounting `UIRef`s (in `_Apply.destroyBoundary`) after v1.6.1.
- Changed `.qId` to `.uiId` on `UISourceBoundary`.

### Package

- Added more info.
- Included `LICENSE` and `CHANGES.md` (this file) into the package.
- Renamed `dist/index*` to `dist/ui-dom*`.
- Renamed the global file to be `UIDom.js` while `ui-dom.js` is the file for common-js require usage.

### Dev

- Cleaned up the dev build process and dev. depencies, so can share the source.
- Refactored a couple of more classes into their own files.

---

## v1.6.1

### Features

- Feature for fragments to be conditional based on whether has content or not (otherwise it's an empty fragment). Implemented as `<uiDom.Fragment needsChildren={true}>` and with a shortcut `uiDom.withContent(...contents)`.
- Provided `UIMini` as a class / mixin, and made children support for it. Refactored `contentApi` as its own part (away from `contextApi`). 

### Changes

- Changed the unmounting order in destroying boundaries to use tree order (not reverse). This is to mirror the `UIRef`'s unmounting process which is in tree order - because then can "salvage" all dom nodes inside a salvaged node (otherwise they would have been unmounted already, so the salvage feature would be of little practical use). Finally, the conclusion was that it's too incoherent to have refs unmount in tree order while components unmount in reverse order. (It's debatable, though.)
- Reorganized naming related to `UIMini`, `UILive` and `UIComponent`. So now the term "component" simply means any renderer source: function or class/mixin. And "Live" means the fully featured component, while "Mini" is the smaller one - both regardless of whether is function or class/mixin. Mostly affects typing but also some internal class members.

### Dev

- Refactored the `UIClasses.ts` file into multiple smaller classes and provided the basic folder structure: `classes` and `static`.

