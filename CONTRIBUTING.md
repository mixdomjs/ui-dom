# Contributing to uiDom

---

## Disclaimer

Thank you for considering contributing to uiDom. It's an open source library and as such it's meant to start to live its own life. Here are some principles and guidelines for future development.

---

## Main principles of uiDom

### Architecture

- The core idea about architecture is 1. down cascading flow complemented by 2. quick tunnels and 3. lateral communication along the main flow. The tunnels refer to content passing as well as tunneled context assignments (by `ctxs` prop or `overrideContext` in some cases). The lateral flow refers to contexts and especially their actions (and questions).
- In comparison to React, there is an emphasis on the latter two (2. tunnels and 3. lateral), as React is based on a strict one-by-one cascading flow (with reconciliation and other _post_ processing). From uiDom's perspective, this lack of lateral bridges actually leaves a "gap" in the strictly one-by-one cascading states architecture, and accordingly the solution is integrated into the core of uiDom (2 and 3 above).

### Feature set

- The current feature set forms a "whole" as explained above: down fall with lateral & tunneled flows. This is of course coupled with features related to dom, such as UIRefs and other commonly useful helpers like UIEffects. There can of course be more features (along these lines or others), but to keep the size small, the basic feature set should not grow too much.
- Any bigger features should be implemented as "plugins" (eg. npm packages). The internal architecture can be adjusted to support them better (in general terms), of course must find ways to do so without fattening the flow too much.
- All features should be thought out well as a whole in terms of practical usage, overall flow, performance in many scales. They should add value to library as a whole, or solve some specific use cases (especially those that become "deal breakers" in some circumstances).

### Optimization

- There can be performance optimizations based on benchmarking.
- There can be refinement features to support special html attributes or other specialities. (Have not gone very deep into them: mostly just class, style, listener attributes and then all else are direct attributes.)

### Lightweight

- The library should stay small, preferably closer to 50kb minified than 100kb.
- This number is not totally arbitrary, but it reflects the amount of basic features that constitute what is uiDom - for example, Preact is about 10kb (20kb with compat), so it makes sense uiDom is a few times bigger.

----

## Contributing by GitHub issues

### Bugs

- You can report bugs into the GitHub repo issues: https://github.com/ui-dom/ui-dom/issues
- Please follow the following guidelines when reporting bugs:
  - First verify that a similar bug doesn't exist already in the issues.
  - Try to be as brief but descriptive of the bug as possible - both in the title and in the description.
  - Describe (a bit of) the context of what you're aiming to do, and how the bug prevented it.
  - Provide the steps to reproduce the problem.
  - If somehow related, provide information about the environment where you run into the bug (eg. browser, OS).
  - Often a screenshot of snippet of your code (or the error) can be very helpful.

### Feature requests

- Before requesting a feature, please read the "Main principles of uiDom" above. It describes what uiDom aims to do, and how it should grow.
- Feature requests can be made in the GitHub repo issues using the "feature" label: https://github.com/ui-dom/ui-dom/labels/feature

---

## Contributing by code guidelines

### TypeScript

- All code should be written in TypeScript.
- For advanced typing algorithms, make sure there's no excessively deep iterations. Currently the only one with semi-heavy checking is `contextApi.needsContexts`, all the others use the concept of splitting the input and then comparing it to a valid set, instead of pre-building all permutations of a valid set / structure.

### Commenting

- All routines and procedures should be commented along the way. Preferably in small chunks, so that it's easy to distinguish the aim (= comments) from the implementation (= code). The rhythm of comments also makes it easy to visually glance through the idea flow.
- For bigger routines and algorithms, should make a general explanation of the main idea behind it. This way it can be evaluated in relation to other flow when considering performance in larger scales.

### Keeping classes clean

- In uiDom, it's preferably to think of classes as "private" or "public" as a whole. Then the public ones are the ones that the programmer uses when writing UIs, and the private ones are the ones handling all technicalities. For example, UIHost, UIContext, UILive, UIMini and UIWired are all meant to be used by the end programmer so they are kept very minimal to their purpose. For the component classes most of the functionality is handled by "semi-private" UIBoundaries and the actual routines for them in the static _Apply part.
- There are a couple of examples where a class was splitted into two parts: UIHost with UIHostServices and UIContext with UIContextServices. The main reason was to keep the public part clean, but another reason was to make supporting mixins easier. This is (at least partly) because you cannot use private and protected in mixable classes, so you can't really "hide" the technical parts - so it's just easier to put them all under .services. (There was possibly also some typing related reasons why it was easier to do it this way.)

### About features - examples

- The concept of "hydration" could be implemented as it could make uiDom more flexible for certain circumstances, but it should be thought out well to fit various practical use cases at the same time, and should not fatten the flow or codes too much - as it is a special case that most will never need (but if it's a deal breaker for those rare cases, then maybe still worth it).
- Similarly some support for async loading could be implemented, but it to make most out of it, should think it through and make it very generally useful. One reason why it should _not_ be implemented, is that these sort of features serve only relatively special cases, and could be implemented simply using the other features of uiDom (or React) quite naturally (= simply change a state or context data when something is loaded).
- A final example is the concept of "Freeze". As it boils down to: `const Freeze = (props) => props.freeze ? null : uiDom.content;`, there's little sense in making that. Programmer should simply make that component if needs one like it. (This same applies to the async / Suspense above as well.)

### Code structure

- Currently the src is simply splitted into two main folders: `classes` and `static`. The `classes` folder contains all the classes and `static` contains a background library for them - either general purpose (like `_Lib`) or specific to the flow of uiDom (eg. `_Apply`).
- In addition there's the important `uidom` shortcut next to the index files.
- There are three index files for three different compiling needs:
  1. `index.ts` is the source for es module output. (Use with "import".)
  2. `index.cjs.ts` is the source for cjs output. (Use with "require".)
  3. `index.global.ts` is the source for global use that adds UIDom global. (Just directly import the script.)

### Naming

- Should use clear naming, especially in methods and members, but also in the code (the runtime variables will be minified anyway).
- However, it's not always easy, and too long names become obtrusive (and add extra size to the minified file). So just seek some balance with short but depictive names.
- The internal (more private) classes can undergo naming changes more easily, as they are not meant to be used directly. When name changes are needed, they should be clumped together in a major version update and notified about them clearly (at least in the CHANGES.md doc).

### Dev dependencies

- The project is only dependent on TypeScript and then Rollup (and a couple of plugins for it) to output the final files.
- Note that the process also copies two files: `index.module.js` and `index.module.d.ts` so that can be directly imported as a native es module (without a pre module handler) - there was some problems with `index.mjs` and `index.d.ts` if using directly.

