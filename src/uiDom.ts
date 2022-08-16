

// - Imports - //

import {
    RecordableType,
    UIGenericProps,
    UIDefTarget,
    UIRenderOutput,
    UITreeNode,
    UITreeNodeType,
    UIContextAttach,
} from "./static/_Types";
import { _Lib } from "./static/_Lib";
import { _Defs } from "./static/_Defs";
import { _Find } from "./static/_Find";
import { _Apply } from "./static/_Apply";
import { UIFragment, UIPortal, UIElement } from "./classes/UIPseudoClasses";
import { createSpread } from "./classes/UISpread";
import { createRef, UIRef, UIRefMixin } from "./classes/UIRef";
import { createMini, UIMini, UIMiniMixin } from "./classes/UIMini";
import { createWired } from "./classes/UIWired";
import { createLive, createLiveBy, UILive, UILiveMixin } from "./classes/UILive";
import { createHost, UIHost, UIHostMixin } from "./classes/UIHost";
import { createContext, createContexts, UIContext, UIContextMixin, UIContexts } from "./classes/UIContext";

// Tools.
import { createEffect, UIEffect, UIEffectMixin } from "./addons/UIEffect";
import { createDataPicker, createDataSelector } from "./addons/DataPicker";
import { UISourceBoundary } from "./classes/UIBoundary";



// - Export shortcuts - //

// Def.
export const uiDef = _Defs.createDef;

// Content.
export const uiContent = _Defs.newContentPassDef();
export const uiContentCopy = _Defs.newContentPassDef({}, true);
export const uiWithContent = (...contents: UIRenderOutput[]) =>
    _Defs.createDef(uiDom.Fragment, { needsChildren: true }, ...contents);

// Collected shortcuts and static methods.
export const uiDom = {


    // - Class & mixin shortcuts - //

    Host: UIHost,
    HostMixin: UIHostMixin,
    Live: UILive,
    LiveMixin: UILiveMixin,
    Mini: UIMini,
    MiniMixin: UIMiniMixin,
    Ref: UIRef,
    RefMixin: UIRefMixin,
    Context: UIContext,
    ContextMixin: UIContextMixin,
    /** ContextAttach flags to use with live.getAllContexts(flags: ContextAttach). */
    ContextAttach: UIContextAttach,


    // - Addons - //

    // UIEffect.
    Effect: UIEffect,
    EffectMixin: UIEffectMixin,
    createEffect,

    // DataPicker & DataSelector.
    createDataPicker,
    createDataSelector,


    // - Pseudo classes - //

    /** Allows to attach multiple contexts simultaneously.
     * Usage example: `<uiDom.Contexts cascade={{namedContexts}}><div/></uiDom.Contexts>` */
    Contexts: UIContexts,
    /** Fragment represent a list of render output instead of stuff under one root.
     * Usage example: `<uiDom.Fragment><div/><div/></uiDom.Fragment>` */
    Fragment: UIFragment,
    /** Portal allows to insert the content into a foreign dom node.
     * Usage example: `<uiDom.Portal container={myDomElement}><div/></uiDom.Portal>` */
    Portal: UIPortal,
    /** This allows to use an existing dom element as if it was part of the system.
     * So you can modify its props and such. */
    Element: UIElement,


    // - Content passing - //

    /** Generic def for passing content.
     * - Use this to include content (~ React's props.children) from the parent component.
     * - Note that in the case of multiple contentPasses the first one in tree order is the real one.
     *   .. If you deliberately want to play with which is the real one and which is a copy, use uiDom.ContentCopy or uiDom.copyContent(someKey) for the others. */
    Content: uiContent,
    /** If you want to include things only if actually will have content for uiDom.Content.
     * - Use like this: <div>{uiDom.withContent(<span class="content">{uiDom.Content}</span>)}</div>
     * - Technically this uses .getChildren() to check for Mini/Live, and so adds a children dependency.
     * - For SpreadFunctions they have their own procedure, so handled in there. */
    withContent: uiWithContent,
    /** A generic shortcut for a content copy.
     * .. We give it a unique key ({}), so that it can be widely moved around.
     * .. In the case you use multiple ContentCopy's, then reuses each widely by tree order. */
    ContentCopy: uiContentCopy,
    /** Use this method to create a copy of the content that is not swappable with the original render content.
     * - This is very rarely useful, but in the case you want to display the passed content multiple times,
     *   this allows to distinguish from the real content pass: `{ uiDom.Content }` vs. `{ uiDom.copyContent("some-key") }` */
    copyContent: _Defs.newContentCopyDef,


    // - Quick create - //

    /** Create a new UIHost to orchestrate rendering. */
    create: createHost,
    /** Create a new UIHost to orchestrate rendering. */
    createHost,

    /** Create a new context. */
    createContext,
    /** Create multiple named contexts. (Useful for tunneling.) */
    createContexts,

    /** Create ref. */
    createRef,

    /** Create a SpreadFunction - the most performant way to render things (no lifecycle, just spread out with its own pairing scope). */
    createSpread,
    /** Create a SpreadFunction - the most performant way to render things (no lifecycle, just spread out with its own pairing scope). */
    spread: createSpread,
    /** Create a LiveFunction omitting the first initProps argument. (It's actually swapped to an optional 2nd argument.) */
    createLive,
    /** Create a LiveFunction omitting the first initProps argument. (It's actually swapped to an optional 2nd argument.) */
    live: createLive,
    /** Create a LiveFunction as <Contexts, Remote, Props, State> and omitting the first initProps argument. (It's actually swapped to an optional 2nd argument.) */
    createLiveBy,
    /** Create a LiveFunction as <Contexts, Remote, Props, State> and omitting the first initProps argument. (It's actually swapped to an optional 2nd argument.) */
    liveBy: createLiveBy,
    /** Create a MiniFunction. Like uiDom.createLive you get the api as the first parameter, and props as second. */
    createMini,
    /** Create a MiniFunction. Like uiDom.createLive you get the api as the first parameter, and props as second. */
    mini: createMini,
    /** Creates a wired renderer.
     * - Technically creates a class that behaves like UILive (or actually more like UIMiniFunction as a class).
     *     1. This class serves as the common portion for all class instances that will be wrapped in their own boundaries when grounded.
     *     2. This class can then allow to set and refresh the common props, and trigger should-updates for all the instances.
     *     3. The props of the actual class instances are mixed with the wiredProps defined by this class.
     * - About builder function:
     *     * The (2nd arg) builder is a callback to build common props, it receives: (lastProps, ...passParams).
     *     * The passParams are any optional arguments after the 3rd one (mixer).
     *     * It can return the lastProps back, if there's no change. In that case won't trigger update.
     */
    createWired,
    /** Creates a wired renderer.
     * - Technically creates a class that behaves like UILive (or actually more like UIMiniFunction as a class).
     *     1. This class serves as the common portion for all class instances that will be wrapped in their own boundaries when grounded.
     *     2. This class can then allow to set and refresh the common props, and trigger should-updates for all the instances.
     *     3. The props of the actual class instances are mixed with the wiredProps defined by this class.
     * - About builder function:
     *     * The (2nd arg) builder is a callback to build common props, it receives: (lastProps, ...passParams).
     *     * The passParams are any optional arguments after the 3rd one (mixer).
     *     * It can return the lastProps back, if there's no change. In that case won't trigger update.
     */
    wired: createWired,


    // - Def shortcuts - //

    /** Create a new def, like React.createElement(). Can feed JSX input. */
    createDef: _Defs.createDef,
    /** Alias for createDef for brevity. */
    def: _Defs.createDef,

    /** Returns a single html element.
     * - If a wrapInTag given will use it as a container.
     * - Otherwise, if the string refers to multiple, returns an element containing them (with settings.renderInnerHtmlTag).
     * - Normally uses a container only as a fallback if has many children. */
    htmlDef: (innerHtml: string, wrapInTag?: keyof HTMLElementTagNameMap, props?: UIGenericProps, key?: any): UIDefTarget => {
        // Create def.
        const def: UIDefTarget = {
            _uiDefType: "content",
            tag: wrapInTag || "",
            childDefs: [],
            domContent: innerHtml,
            domHtmlMode: true
        };
        // Attach props.
        if (wrapInTag && props)
            def.props = _Lib.cleanHtmlProps(props);
        // Attach key.
        if (key != null)
            def.key = key;
        // Return def.
        return def;
    },


    // - Finding stuff - //

    findTreeNodesIn: (treeNode: UITreeNode, types: RecordableType<UITreeNodeType>, maxCount: number = 0, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: (treeNode: UITreeNode) => any): UITreeNode[] =>
        _Find.treeNodesWithin(treeNode, _Lib.buildRecordable<UITreeNodeType>(types), maxCount, allowWithinBoundaries, allowOverHosts, validator),
    findBoundariesIn: (treeNode: UITreeNode, maxCount: number = 0, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: (treeNode: UITreeNode) => any): UISourceBoundary[] =>
        _Find.treeNodesWithin(treeNode, { boundary: true }, maxCount, allowWithinBoundaries, allowOverHosts, validator).map(tNode => tNode.boundary) as UISourceBoundary[],
    findDomNodesIn: <T extends Node = Node>(treeNode: UITreeNode, maxCount: number = 0, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: (treeNode: UITreeNode) => any): T[] =>
        _Find.treeNodesWithin(treeNode, { dom: true }, maxCount, allowWithinBoundaries, allowOverHosts, validator).map(tNode => tNode.domNode) as T[],
    queryDomElementIn: <T extends Element = Element>(treeNode: UITreeNode, selector: string, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T | null =>
        _Find.domElementByQuery<T>(treeNode, selector, allowWithinBoundaries, allowOverHosts),
    queryDomElementsIn: <T extends Element = Element>(treeNode: UITreeNode, selector: string, maxCount: number = 0, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T[] =>
        _Find.domElementsByQuery<T>(treeNode, selector, maxCount, allowWithinBoundaries, allowOverHosts),


    // - Html attribute helpers - //

    // HTML attribute cleaners.
    /** Returns a string to be used as class name (with no duplicates and optional nested TypeScript verification).
     * - Each item in the classNames can be:
     *     1. ValidName (single className string),
     *     2. Array<ValidName>,
     *     3. Record<ValidName, any>.
     *     + If you want to use the validation only for Arrays and Records but not Strings, add 2nd parameter `string` to the type: `CleanClassName<ValidName, string>`
     * - Unfortunately, the name validation inputted here only works for Array and Record types, and single strings.
     * - To use concatenated class name strings (eg. "bold italic"), you should:
     *     1. Declare a validator by: `const cleanNames: ValidateNames<ValidName> = uiDom.classNames;`
     *     2. Then use it like this: `const okName = cleanNames("bold italic", ["bold"], {"italic": false, "bold": true})`;
     */
    classNames: _Lib.cleanHtmlClass,
    /** Convert a style cssText string into a dictionary with capitalized keys.
     * - For example: "background-color: #aaa" => { backgroundColor: "#aaa" }.
     * - The dictionary format is used for easy detection of changes.
     *   .. As we want to respect any external changes and just modify based on our own. (For style, class and any attributes.) */
    parseStyle: _Lib.cleanHtmlStyle,


    // - General purpose utilities - //

    /** General inlined equal with level for deepness.
     * - nDepth: 0. No depth - simple check.
     * - nDepth: 1. Shallow equal.
     * - nDepth: 2. Shallow double equal.
     * - nDepth < 0. Deep. */
    areEqual: _Lib.areEqual,
    /** Notes:
     * - With end smaller than start, will give the same result but in reverse.
     * - If you use stepSize, always give it a positive number. Or will loop forever.
     * - Works for integers and floats. Of course floats might do what they do even with simple adding / subtraction.
     * Examples:
     * - range(3) => [0, 1, 2]
     * - range(1, 3) => [1, 2]
     * - range(3, 1) => [2, 1]
     * - range(1, -2) => [0, -1, -2]
     * - range(-3) => [-1, -2, -3]
     */
    range: _Lib.range,

};
