

// - Imports - //

import { SVGAttributesBy, SVGGraphicalEventAttributes } from "./_SVGTypes";
import { UIContentBoundary, UISourceBoundary } from "../classes/UIBoundary";
import { UIContentClosure } from "../classes/UIContentClosure";
import { UIRef } from "../classes/UIRef";
import { UISpread } from "../classes/UISpread";
import { UIMini } from "../classes/UIMini";
import { UIHost } from "../classes/UIHost";
import { UILive } from "../classes/UILive";
import { UIContext, UIContexts, UIContextsProps } from "../classes/UIContext";
import { UIElement, UIFragment, UIFragmentProps, UIPortal, UIElementProps, UIPortalProps } from "../classes/UIPseudoClasses";
import { UIWiredType } from "../classes/UIWired";


// - General - //

// Helpers - almost all are related to object-likes: dictionaries / classes.
export type NullLike = null | undefined; // Equivalent to check: someVar == null.
export type ClassType<T = Object, Args extends any[] = any[]> = new (...args: Args) => T;
export type ClassMixer<TExtends extends ClassType> = <TBase extends ClassType>(Base: TBase) => TBase & TExtends;
export type ClassBaseMixer<TExtends extends object> = <TBase extends ClassType>(Base: TBase) => TBase & ClassType<TExtends>;
// <TBase extends Constructor, Live extends UILive = UILive>(Base: TBase) => (UILiveMixer as (Base: TBase) => TBase & ClassType<Live>
export type Dictionary<K extends string = string, V = any> = Record<K, V>;
export type RecordableType<K extends string> = Partial<Dictionary<K>> | Array<K> | Set<K>; // Iterable<K>;
export type NonDictionary = Array<any> | Set<any> | Map<any, any>;

// Unneeded.
// export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
// export type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;  // <-- For some reason, Typescript's Omit is not working in the environment - so here's a copied type for it.
// export type Methods<T> = { [P in keyof T as T[P] extends Function ? P : never]: T[P] };
// export type ValueOf<T> = T[keyof T];
// export type NotEmptyString<Str extends string> = Str extends "" ? never : Str;
// export type NonArrayObject<T extends object = object> = { [index: number]: never; } & T; // <-- Thanks to Zach at: https://stackoverflow.com/questions/61148466/typescript-type-that-matches-any-object-but-not-arrays
// export type PureDictionary<T> = T extends Dictionary ? (T extends NonDictionary ? never : T) : never;
// export type WithFallback<Optional, Full> = Optional extends (never | undefined) ? Optional : Full;
// export type Choose<T, ValueTrue, ValueFalse> = T extends (never | undefined) ? ValueFalse : ValueTrue;
// export type PickInData<Data, DataKey extends string | undefined> = DataKey extends never | undefined ? Data : PropType<Data, DataKey & string>;


// - Html - //

export interface CSSProperties extends Partial<Omit<CSSStyleDeclaration, "item" | "getPropertyPriority" | "getPropertyValue" | "removeProperty" | "setProperty">> {
    [index: number]: never;
}

export type HTMLTags = keyof HTMLElementTagNameMap;
export type HTMLElementType<Type extends HTMLTags = HTMLTags> = HTMLElementTagNameMap[Type];
export type SVGTags = keyof SVGElementTagNameMap;
export type SVGElementType<Type extends SVGTags = SVGTags> = SVGElementTagNameMap[Type];
export type UIDomTag = HTMLTags | SVGTags;

export type DomElement = HTMLElement | SVGElement;
export type UIDomElementProps = {
    // For anything.
    key: any;
    ref: UIRef | UIRef[];
    // Only for elements.
    data: Dictionary;
    class: string;
    className: string;
    style: string | CSSProperties;
};

export type ListenerAttributeNames = keyof ListenerAttributesAll;
export type ListenerAttributes = { [Name in keyof ListenerAttributesAll]?: ListenerAttributesAll[Name] | null; };
export type HTMLAttributes<Type extends HTMLTags = HTMLTags> = Partial<Omit<HTMLElementType<Type>, "style" | "class" | "className" | "textContent" | "innerHTML" | "outerHTML" | "outerText" | "innerText">> & Partial<ListenerAttributesAll> & Partial<UIDomElementProps>;
export type SVGAttributes<Type extends SVGTags = SVGTags> = Omit<SVGAttributesBy[Type], "style" | "class" | "className"> & Partial<ListenerAttributesAll> & Partial<UIDomElementProps>;
export type HTMLSVGAttributes<Type extends UIDomTag = UIDomTag, Other = never> = [Type] extends [HTMLTags] ? HTMLAttributes<Type> : [Type] extends [SVGTags] ? SVGAttributes<Type> : Other;
export type HTMLSVGAttributesBy = { [Tag in UIDomTag]: HTMLSVGAttributes<Tag> };

export interface ListenerAttributesAll {
    onAbort: GlobalEventHandlers["onabort"];
    onActivate: SVGGraphicalEventAttributes["onActivate"];
    onAnimationCancel: GlobalEventHandlers["onanimationcancel"];
    onAnimationEnd: GlobalEventHandlers["onanimationend"];
    onAnimationIteration: GlobalEventHandlers["onanimationiteration"];
    onAnimationStart: GlobalEventHandlers["onanimationstart"];
    onAuxClick: GlobalEventHandlers["onauxclick"];
    onBlur: GlobalEventHandlers["onblur"];
    // onCancel: Animation["oncancel"];
    onCanPlay: GlobalEventHandlers["oncanplay"];
    onCanPlayThrough: GlobalEventHandlers["oncanplaythrough"];
    onChange: GlobalEventHandlers["onchange"];
    onClick: GlobalEventHandlers["onclick"];
    onClose: GlobalEventHandlers["onclose"];
    onContextMenu: GlobalEventHandlers["oncontextmenu"];
    onCueChange: GlobalEventHandlers["oncuechange"];
    onDblClick: GlobalEventHandlers["ondblclick"];
    onDrag: GlobalEventHandlers["ondrag"];
    onDragEnd: GlobalEventHandlers["ondragend"];
    onDragEnter: GlobalEventHandlers["ondragenter"];
    // onDragExit: GlobalEventHandlers["ondragexit"];
    onDragLeave: GlobalEventHandlers["ondragleave"];
    onDragOver: GlobalEventHandlers["ondragover"];
    onDragStart: GlobalEventHandlers["ondragstart"];
    onDrop: GlobalEventHandlers["ondrop"];
    onDurationChange: GlobalEventHandlers["ondurationchange"];
    onEmptied: GlobalEventHandlers["onemptied"];
    onEnded: GlobalEventHandlers["onended"];
    onError: GlobalEventHandlers["onerror"];
    onFocus: GlobalEventHandlers["onfocus"];
    onFocusIn: SVGGraphicalEventAttributes["onFocusIn"];
    onFocusOut: SVGGraphicalEventAttributes["onFocusOut"];
    onGotPointerCapture: GlobalEventHandlers["ongotpointercapture"];
    onInput: GlobalEventHandlers["oninput"];
    onInvalid: GlobalEventHandlers["oninvalid"];
    onKeyDown: GlobalEventHandlers["onkeydown"];
    // Note, onkeypress is deprecated, but we need to support it nevertheless - for some while, at least.
    // onKeyPress: GlobalEventHandlers["onkeypress"];
    onKeyPress: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
    onKeyUp: GlobalEventHandlers["onkeyup"];
    onLoad: GlobalEventHandlers["onload"];
    onLoadedData: GlobalEventHandlers["onloadeddata"];
    onLoadedMetaData: GlobalEventHandlers["onloadedmetadata"];
    // onLoadEnd: GlobalEventHandlers["onloadend"];
    onLoadStart: GlobalEventHandlers["onloadstart"];
    onLostPointerCapture: GlobalEventHandlers["onlostpointercapture"];
    onMouseDown: GlobalEventHandlers["onmousedown"];
    onMouseEnter: GlobalEventHandlers["onmouseenter"];
    onMouseLeave: GlobalEventHandlers["onmouseleave"];
    onMouseMove: GlobalEventHandlers["onmousemove"];
    onMouseOut: GlobalEventHandlers["onmouseout"];
    onMouseOver: GlobalEventHandlers["onmouseover"];
    onMouseUp: GlobalEventHandlers["onmouseup"];
    onPause: GlobalEventHandlers["onpause"];
    onPlay: GlobalEventHandlers["onplay"];
    onPlaying: GlobalEventHandlers["onplaying"];
    onPointerCancel: GlobalEventHandlers["onpointercancel"];
    onPointerDown: GlobalEventHandlers["onpointerdown"];
    onPointerEnter: GlobalEventHandlers["onpointerenter"];
    onPointerLeave: GlobalEventHandlers["onpointerleave"];
    onPointerMove: GlobalEventHandlers["onpointermove"];
    onPointerOut: GlobalEventHandlers["onpointerout"];
    onPointerOver: GlobalEventHandlers["onpointerover"];
    onPointerUp: GlobalEventHandlers["onpointerup"];
    onProgress: GlobalEventHandlers["onprogress"];
    onRateChange: GlobalEventHandlers["onratechange"];
    onReset: GlobalEventHandlers["onreset"];
    onResize: GlobalEventHandlers["onresize"];
    onScroll: GlobalEventHandlers["onscroll"];
    onSecurityPolicyViolation: GlobalEventHandlers["onsecuritypolicyviolation"];
    onSeeked: GlobalEventHandlers["onseeked"];
    onSeeking: GlobalEventHandlers["onseeking"];
    onSelect: GlobalEventHandlers["onselect"];
    onStalled: GlobalEventHandlers["onstalled"];
    onSubmit: GlobalEventHandlers["onsubmit"];
    onSuspend: GlobalEventHandlers["onsuspend"];
    onTimeUpdate: GlobalEventHandlers["ontimeupdate"];
    onToggle: GlobalEventHandlers["ontoggle"];
    onTouchCancel: GlobalEventHandlers["ontouchcancel"];
    onTouchEnd: GlobalEventHandlers["ontouchend"];
    onTouchMove: GlobalEventHandlers["ontouchmove"];
    onTouchStart: GlobalEventHandlers["ontouchstart"];
    onTransitionCancel: GlobalEventHandlers["ontransitioncancel"];
    onTransitionEnd: GlobalEventHandlers["ontransitionend"];
    onTransitionRun: GlobalEventHandlers["ontransitionrun"];
    onTransitionStart: GlobalEventHandlers["ontransitionstart"];
    onVolumeChange: GlobalEventHandlers["onvolumechange"];
    onWaiting: GlobalEventHandlers["onwaiting"];
    onWheel: GlobalEventHandlers["onwheel"];
}


/** Type for className input.
 * - Represents what can be fed into the uiDom.classNames method with (ValidName extends string):
 *     1. ValidName (single className string),
 *     2. Array<ValidName>,
 *     3. Record<ValidName, any>.
 *     + If you want to use the validation only for Arrays and Records but not Strings, add 2nd parameter `string` to the type: `CleanClassName<ValidName, string>`
 * - Unfortunately, currently the name validation only works for Array and Record types, and single strings.
 * - To use concatenated class name strings (eg. "bold italic"), you have three options:
 *     1. Use `uiDom.classNamesWith("" as ValidName, longName);`
 *     2. Create a validator with `const getClassNames = uiDom.createNameValidator<ValidName>;` and use it with `getClassNames(longName)`.
 *     3. If you're dealing with a string type (not object), and have (or store) it as a variable, you can do: `uiDom.classNames<ValidName, typeof longName>(longName)`.
 *     +  Note that maybe later TS might support it so that can use `uiDom.classNames<ValidName>(longName)` without the second type parameter like above.
 */
export type UIPreClassName<Valid extends string = string, Single extends string = Valid> = Single | Partial<Record<Valid, any>> | Array<Valid> | Set<Valid>;
//
// <-- Let's not allow deep anymore, it also messes with arrays and the <Single>. So dropping the recursion: | Array<UIPreClassName<Valid, Single>> | Set<UIPreClassName<Valid, Single>>;


// - Component & Boundary - //

export type UIMiniFunction<Props = any> = (this: UIMini<Props>, props: Props) => UIRenderOutput | UIMiniFunction<Props>;
export type UILiveFunction<Props = any, State = any, Remote = any, AllContexts extends UIAllContexts = {}> = (props: Props, ui: UILive<Props, State, Remote, AllContexts>) => UIRenderOutput | UILiveFunction<Props, State, Remote, AllContexts>;
export type UILiveComponent<Props = any, Component extends UILive = UILive> = (props: Props, ui: Component) => UIRenderOutput | UILiveComponent<Props, Component>;
export type UISpreadFunction<Props = any> = (props: Props, childDefs: UIDefTarget[]) => UIRenderOutput;
export type UIFunction<Props = any> = UISpreadFunction<Props> | UIMiniFunction<Props> | UILiveFunction<Props>;

export type UIBoundableFunction<Props = {}> = UILiveFunction<Props> | UIMiniFunction<Props>;
/** This is a shortcut for UIDom renderers that will be have their own boundary:
 * - Either based on UILive class/mixin, or
 * - Is a function: UILiveFunction | UIMiniFunction. */
export type UIBoundable<Props = {}> = typeof UILive<Props> | typeof UIMini<Props> | UIBoundableFunction<Props>;
/** This is a shortcut for all valid UIDom renderers:
 * - Either based on UILive class/mixin (including UISpread), or UIMini (including UIWired), or
 * - Is a function: UILiveFunction | UIMiniFunction | UISpreadFunction (before conversion). */
export type UIComponent<Props = {}> = typeof UILive<Props> | typeof UIMini<Props> | UIWiredType<Props> | typeof UISpread<Props> | UIFunction<Props>; // UIBoundableFunction<Props>;

export type UIBoundary = UISourceBoundary | UIContentBoundary;
export type UISourceBoundaryId = string;


// - Tags - //

export type UIPseudoTag<Props = {}> = ([Props] extends [UIFragmentProps] ? typeof UIFragment<Props> : never) | ([Props] extends [UIContextsProps] ? typeof UIContexts<{}, Props> : never) | ([Props] extends [UIElementProps] ? typeof UIElement<HTMLTags | SVGTags, Props> : never) | ([Props] extends [UIPortalProps] ? typeof UIPortal<Props> : never);
// export type UIComponentTag<Props = {}> = UIComponent<Props>;
export type UIComponentTag<Props = {}> = typeof UILive<Props> | typeof UIMini<Props> | typeof UISpread<Props> | UIWiredType<Props> | UIPseudoTag<Props> | UIFunction<Props>;
export type UIPreTag = UIDomTag | UIPseudoTag | UIComponentTag;
export type UIPostTag = "" | "_" | UIDomTag | UIComponentTag | null;
/** This tag conversion is used for internal tag based def mapping. The UIDefTarget is the uiDom.ContentPass. */
export type UIDefKeyTag = UIPostTag | UIDefTarget | typeof UIFragment | UIHost;


// - Contextual - //

// export type UIContextData = Dictionary | null; // We we must extend something - and not any.
export type UIAction = { type?: string; payload?: any; };
export type UIQuestion<Value = any> = UIAction & { value: Value; };
export type UIQuestionary<Value = any> = UIAction & { value?: Value; values: Value[] };
export type UIActions = UIAction | UIQuestion;
export type UIAllContexts = Record<string, UIContext<any, UIActions>>;
export type UIAllContextsWithNull<AllContexts extends UIAllContexts = {}> = { [Name in keyof AllContexts]: AllContexts[Name] | null; };
export type UIAllContextsDataWithNull<AllContexts extends UIAllContexts = {}> = { [Name in keyof AllContexts]: AllContexts[Name]["data"] | null; };
export type UIAllContextsData<AllContexts extends UIAllContexts = {}> = { [Name in keyof AllContexts]: AllContexts[Name]["data"]; };
export type UIAllContextsActions<AllContexts extends UIAllContexts = {}> = { [Name in keyof AllContexts]: AllContexts[Name]["Actions"]; };
export type UIBuildRemoteParams<AllContexts extends UIAllContexts = {}> = [ UIAllContextsDataWithNull<AllContexts>, UIAllContextsWithNull<AllContexts> ];

/** Data listener. The listeners are run after the live component contextual calls are made. */
export type UIUponData<Context extends UIContext = UIContext> = (data: Context["data"], context: Context) => void;

/** Action listener. The listeners are run after the live component contextual calls are made. */
export type UIUponAction<Context extends UIContext = UIContext> = (action: Context["Actions"], context: Context) => void;

/** Action listener in the form of question answerer.
 * - Should return a valid answer to the question. */
export type UIUponQuestion<Context extends UIContext = UIContext, Question extends Context["Actions"] & UIQuestion = Context["Actions"] & UIQuestion> = (question: Question & { value?: Question["value"]}, context: Context) => Question["value"];

/** Action pre-listener - run immediately on sending an action / asking a question.
 * - If returns false, the action will be cancelled from the normal flow (just pre-listeners).
 * - If returns true, the action will be marked as a post action, and called after the update-n-render cycle.
 * - Note that the return value is ignored for questions: if called with askQuestion or askQuestionary.
 *   .. This is because the questions are always asked. But in case you need to log the questions, so uses the same route.
 * - Note that if many assigned and many answer, the importance hierarchy is: "cancel" > "post" > "quick" (and likewise in regards to settings). */
export type UIUponPreAction<Context extends UIContext = UIContext> = (action: Context["Actions"], context: Context) => "cancel" | "post" | "quick" | "" | void;

/** The flags for checking what kind of context change happened. */
export enum UIContextRefresh {
    // Flags.
    Data = 1 << 0,
    Actions = 1 << 1,
    Otherwise = 1 << 2,
    DoRefresh = 1 << 3,
    NoRefresh = 1 << 4,
    // Shortcuts.
    Contextual = Data | Actions,
    All = Contextual | Otherwise
}

/** The flags for each way to attach contexts. */
export enum UIContextAttach {
    // Flags.
    /** The contexts that are inserted somewhere up the TreeNode structure cascading down to us. */
    Cascading = 1 << 0,
    /** The contexts attached by the parent using the `contexts` prop. */
    Parent = 1 << 1,
    /** The contexts manually overridden by `live.overrideContext()` or alike. */
    Overridden = 1 << 2,
    // Shortcuts.
    /** Shortcut for all types. */
    All = Cascading | Parent | Overridden
}


// - Helper - //

/** For quick getting modes to depth for certain uses (UIEffect and DataPicker).
 * - Positive values can go however deep.
 * - Note that -1 means deep, but below -2 means will not check. */
export enum UICompareDepthByMode {
    always = -2,
    deep = -1,
    changed = 0,
    shallow = 1,
    double = 2,
};

// - Props - //

export type UIProps<T = {}> = {
    key?: any;
    /** Attach one or many forwarded refs. */
    ref?: UIRef | UIRef[];
} & T;
export type UIComponentProps<T = {}> = UIProps<T> & {
    /** Attach named contexts on a child - will not cascade down. */
    contexts?: Record<string, UIContext | null>;
}
export type UIDomProps<T = {}> = UIProps<T> & {
    class?: string;
    className?: string;
    style?: CSSProperties | string;
    data?: Dictionary;
} & T;
export type UIGenericProps<Type extends UIDomTag = UIDomTag, T = {}> = UIDomProps & HTMLSVGAttributes<Type, {}> & ListenerAttributes & T;
/** Post props don't contain key, ref. In addition className and class have been merged, and style processed to a dictionary. */
export type UIGenericPostProps<Props = {}> = Props & { className?: string; style?: CSSProperties; data?: Dictionary; };


// - Render output types - //

export type UIContentNull = NullLike;
export type UIContentValue = string | number;
export type UIContentSimple = UIContentValue | Node;
export type UIRenderOutputSingle = UIDefTarget | UIContentSimple | UIContentNull | UIHost;
export interface UIRenderOutputMulti extends Array<UIRenderOutputSingle | UIRenderOutputMulti> {} // This is a recursive type, might be nested array.
export type UIRenderOutput = UIRenderOutputSingle | UIRenderOutputMulti;


// - Update related - //

export interface UILiveUpdates<Props = {}, State = {}, Context = {}> {
    props?: Props;
    state?: State;
    remote?: Context;
    children?: UIDefTarget[];
}
export interface UILiveNewUpdates<Props = {}, State = {}> {
    props?: Props;
    state?: State;
    children?: UIDefTarget[];
    contextual?: boolean;
    force?: boolean | "all";
}

/** Defines how often UILives should render (how uiShouldUpdate works).
 * .. "always" means they will always re-render. You should use this only for debugging.
 * .. "changed" means they will render if the reference has changed.
 * .. "shallow" means they will render if any prop (of an object/array) has changed. This is the default for most.
 * .. "double" is like "shallow" but any prop value that is object or array will do a further shallow comparison to determine if it has changed.
 * .. "deep" compares all the way down recursively. Only use this if you it's really what you want - never use it with recursive objects (= with direct or indirect self references).
 */
export type UIUpdateCompareMode = "always" | "changed" | "shallow" | "double" | "deep";
/** Defines how often UILives should update for each updatable type: props, state, context.
 * .. If type not defined, uses the default value for it.
 * .. Note that the pure checks only check those types that have just been changed.
 */
export interface UIUpdateCompareModesBy {
    props: UIUpdateCompareMode | number;
    state: UIUpdateCompareMode | number;
    remote: UIUpdateCompareMode | number;
    children: UIUpdateCompareMode | number;
}


// - Html diffs - //

/** Differences made to a dom element. Note that this never includes tag changes, because it requires creating a new element. */
export interface UIHTMLDiffs {
    /** If no attributes, no changes in general attributes. If value in the dictionary is undefined means removed. */
    attributes?: Dictionary;
    /** If no listeners, no changes in listeners. If value in the dictionary is undefined means removed. */
    listeners?: Dictionary;
    /** If no style, no changes in styles. If value in the dictionary is undefined means removed. */
    style?: CSSProperties;
    /** If no data, no changes in data attribute. If value in the dictionary is undefined means removed. */
    data?: Dictionary;
    /** If no classNames, no changes in class names. The keys are class names: for each, if true class name was added, if false name was removed. */
    classNames?: Record<string, boolean>;
}


// - Change & render infos - //

/** This info is used for executing rendering changes to dom for a given appliedDef (which is modified during the process).
 * - If props is given it modifies the class, style and attributes of the element. This modifies the .domProps in the appliedDef.
 * - If create info is provided, creates a new dom element.
 * - If move info is provided, moves the given element to the new location.
 * - If hide is provided, removes the element from dom (and from appliedDef.domElement) and inserts in its place <noscript> (= appliedDef.hiddenDomRefElement).
 * - If destroy is provided, removes the element from dom and from appliedDef.domElement.
 */
interface UIDomRenderInfoBase {
    treeNode: UITreeNode;
    remove?: boolean;
    create?: boolean;
    move?: boolean;
    emptyMove?: boolean;
    update?: boolean;
    content?: boolean;
    swap?: boolean;
    refresh?: boolean | "read";
}
interface UIDomRenderInfoBoundary extends UIDomRenderInfoBase {
    treeNode: UITreeNodeBoundary | UITreeNodePass;
    remove?: true;
    create?: false;
    update?: false;
    content?: false;
    move?: false | never;
    swap?: false;
}
interface UIDomRenderInfoDomLike extends UIDomRenderInfoBase {
    treeNode: UITreeNodeDom | UITreeNodePortal;
    swap?: boolean;
    remove?: true;
    create?: true;
    move?: true;
    update?: true;
    content?: true;
}
interface UIDomRenderInfoUIDom extends UIDomRenderInfoBase {
    treeNode: UITreeNodeHost;
    remove?: boolean;
    create?: boolean;
    move?: boolean;
    update?: false;
    content?: false;
    swap?: false;
}
export type UIDomRenderInfo = UIDomRenderInfoBoundary | UIDomRenderInfoDomLike | UIDomRenderInfoUIDom;

/** This only includes the calls that can be made after the fact: uiWillUnmount is called before (so not here). */
export type UISourceBoundaryChangeType = "mounted" | "updated" | "moved" | "updated-n-moved"; // | "unmounted";  // <-- MOVING IMPLIES UPDATING.. ?  NO..!
export type UISourceBoundaryChange = [ UISourceBoundary, UISourceBoundaryChangeType, (UILiveUpdates | null)?, (UILiveUpdates | null)? ];
export type UIChangeInfos = [ UIDomRenderInfo[], UISourceBoundaryChange[] ];



// - Defs - //

/** Describes what kind of def it is.
 * - Compared to treeNode.type, we have extra: "content" | "element" | "fragment". But don't have "root" (or ""). */
export type UIDefType = "dom" | "content" | "element" | "portal" | "boundary" | "pass" | "contexts" | "fragment" | "host";

interface UIDefBase<Props extends UIGenericPostProps = UIGenericPostProps> {

    // Mandatory.
    /** This is to distinguish from other objects as well as to define the type both in the same.
     * - That's why it's name so strangely (to distinguish from objects), but still somewhat sensibly to be readible.
     * - In earlier quick tests, it seemed (almost 2x) faster to use { _isUIDef: true} as opposed to creating a new class instance (without _isUIDef member). */
    _uiDefType: UIDefType;
    tag: UIPostTag;
    childDefs: UIDefApplied[] | UIDefTarget[];

    // Common optional.
    // /** This is used for spread functions.
    //  * - Because they are spread out, we need to distinguish their defs from main render scope.
    //  * - Preferably the are distinguished from other spreads, too, but it's technically difficult.
    //  *   .. However, if gives a key to the spread function (when uses it), then it's used for this purpose. */
    // keyScope?: any;
    key?: any;
    attachedRefs?: UIRef[];
    attachedContexts?: Record<string, UIContext | null>;

    // Common to types: "dom" | "element" | "boundary".
    props?: Props;

    // Others - only for specific types.
    // .. Fragment.
    isArray?: boolean;
    withContent?: boolean;
    scopeType?: "spread" | "spread-pass" | "spread-copy";
    scopeMap?: Map<UIDefKeyTag, UIDefApplied[]>;
    // .. Content.
    domContent?: UIContentSimple | null;
    domHtmlMode?: boolean;
    // .. Element.
    domElement?: HTMLElement | SVGElement | null;
    domCloneMode?: UICloneNodeBehaviour | "" | null;
    // .. Portal.
    domPortal?: Node | null;
    // .. Pass.
    contentPass?: UIContentClosure | null;
    contentPassType?: "pass" | "copy";
    // .. Context.
    contexts?: Record<string, UIContext | null> | null;
    // .. Host.
    host?: UIHost;

    // Other.
    treeNode?: UITreeNode;

}
export interface UIDefDom<Props extends UIGenericPostProps = UIGenericPostProps> extends UIDefBase<Props> {
    _uiDefType: "dom";
    tag: UIDomTag;
    props: Props;
}
export interface UIDefContent extends UIDefBase {
    _uiDefType: "content";
    tag: "" | UIDomTag;
    domContent: UIContentSimple;
    domHtmlMode?: false;
    props?: never;
}
export interface UIDefContentInner<Props extends UIGenericPostProps = UIGenericPostProps> extends UIDefBase {
    _uiDefType: "content";
    tag: "" | UIDomTag;
    domContent: UIContentSimple;
    /** If true, sets the content as innerHTML. */
    domHtmlMode: true;
    props?: Props;
}
export interface UIDefElement<Props extends UIGenericPostProps = UIGenericPostProps> extends UIDefBase<Props> {
    _uiDefType: "element";
    tag: "_";
    props: Props;
    domElement: HTMLElement | SVGElement | null;
    domCloneMode?: UICloneNodeBehaviour | "" | null;
}
export interface UIDefPortal<Props extends UIGenericPostProps = UIGenericPostProps> extends UIDefBase<Props> {
    _uiDefType: "portal";
    tag: null;
    domPortal: Node | null;
    props?: never;
}
export interface UIDefBoundary<Props extends UIGenericPostProps = UIGenericPostProps> extends UIDefBase<Props> {
    _uiDefType: "boundary";
    tag: UIComponentTag;
    props: Props;
}
export interface UIDefFragment extends UIDefBase {
    _uiDefType: "fragment";
    tag: null;
    isArray?: boolean;
    withContent?: boolean;
    scopeType?: "spread" | "spread-pass" | "spread-copy";
    /** Scope map is used only on the applied def side.
     * - This is used to isolate the scopes for the pairing process.
     * - For example, any spread function outputs, and any content pass copies in them, should be isolated.
     * - This means, that when the root of the isolation is paired with a new target, the inner pairing will use this scope only - and nothing else can use it. */
    scopeMap?: Map<UIDefKeyTag, UIDefApplied[]>;
}
export interface UIDefPass extends UIDefBase {
    _uiDefType: "pass";
    tag: null;
    contentPass?: UIContentClosure | null;
    contentPassType?: "pass" | "copy";
    props?: never;
}
export interface UIDefContexts extends UIDefBase {
    _uiDefType: "contexts";
    tag: null;
    contexts: Record<string, UIContext | null> | null;
    props?: never;
}
export interface UIDefHost extends UIDefBase {
    _uiDefType: "host";
    tag: null;
    host: UIHost;
    props?: never;
}
export type UIDefTypesAll = UIDefDom | UIDefContent | UIDefContentInner | UIDefElement | UIDefPortal | UIDefBoundary | UIDefPass | UIDefContexts | UIDefFragment | UIDefHost;

export interface UIDefAppliedBase extends UIDefBase {
    childDefs: UIDefApplied[];
    action: "mounted" | "moved" | "updated";
    treeNode?: UITreeNode;
}
export interface UIDefTargetBase extends UIDefBase {
    childDefs: UIDefTarget[];
    treeNode?: never;
    action?: never;
}

export type UIDefApplied = UIDefAppliedBase & UIDefTypesAll;
export type UIDefTarget = UIDefTargetBase & UIDefTypesAll;



// - Grounded tree - //
export type UITreeNodeType = "dom" | "portal" | "boundary" | "pass" | "contexts" | "host" | "root";
interface UITreeNodeBase {

    // - Mandatory - //

    /** The main type of the treeNode that defines how it should behave and what it contains.
     * The type "" is only used temporarily - it can only end up in treeNodes if there's an error. */
    type: UITreeNodeType | "";
    /** Normally, only the root has no parent, but all others do.
     * However, if we are talking about a treeNode that is no longer in the tree (= a dead branch),
     * .. then the parent is null, or one of the parents in the chain is null even though it's not a real root node. */
    parent: UITreeNode | null;
    /** The treeNodes inside - for navigation. */
    children: UITreeNode[];
    /** Every treeNode has a domNode reference.
     * For boundaries, the domNode (and domProps) are updated flows up on create / remove / move until meets a dom tag parent. */
    domNode: DomElement | Node | null;
    /** The boundary that produced this tree node - might be passed through content closures. */
    sourceBoundary: UISourceBoundary | null;

    // - Optional - //

    /** If refers to a boundary - either a custom class / functino or then a content passing boundary. */
    boundary?: UIBoundary | null;
    /** The def tied to this particular treeNode. */
    def?: UIDefApplied;

};
interface UITreeNodeBaseWithDef extends UITreeNodeBase {
    def: UIDefApplied;
}
export interface UITreeNodeEmpty extends UITreeNodeBase {
    type: "";
};
export interface UITreeNodeRoot extends UITreeNodeBase {
    type: "root";
    def?: never;
};
export interface UITreeNodeDom extends UITreeNodeBaseWithDef {
    type: "dom";
    /** This exists only for treeNodes referring to dom elements (typeof appliedDef.tag === "string").
     * To avoid ever missing diffs, it's best to hold a memory for the props that were actually applied to a dom element.
     * Note. Like React, we do not want to read the state of the dom element due to 2 reasons:
     *   1. Reading from dom element is relatively slow (in comparison to reading property of an object).
     *   2. It's actually better for outside purposes that we only take care of our own changes to dom - not forcing things there (except create / destroy our own). */
    domProps: UIGenericPostProps;
};
export interface UITreeNodePortal extends UITreeNodeBaseWithDef {
    type: "portal";
    /** For portals, the domNode refers to the external container. */
    domNode: UITreeNodeBase["domNode"];
};
export interface UITreeNodeContexts extends UITreeNodeBaseWithDef {
    type: "contexts";
};
export interface UITreeNodeBoundary extends UITreeNodeBaseWithDef {
    type: "boundary";
    /** This will be set to the treeNode right after instancing the source boundary. */
    boundary: UISourceBoundary;
};
export interface UITreeNodePass extends UITreeNodeBaseWithDef {
    type: "pass";
    /** This will be set to the treeNode right after instancing the content boundary.
     * - It's null only if there's no content, otherwise there's a content boundary.*/
    boundary: UIContentBoundary | null;
};
export interface UITreeNodeHost extends UITreeNodeBaseWithDef {
    type: "host";
};
export type UITreeNode = UITreeNodeEmpty | UITreeNodeDom | UITreeNodePortal | UITreeNodeContexts | UITreeNodeBoundary | UITreeNodePass | UITreeNodeHost | UITreeNodeRoot;


interface UIDefPseudo {
    _uiDefType?: "";
    childDefs: UIDefApplied[] | UIDefTarget[];
    type?: UIDefType | "";
    tag?: any;
    isArray?: boolean;
    props?: Dictionary | UIGenericPostProps;
    domElement?: HTMLElement | SVGElement | null;
}
export interface UIDefAppliedPseudo extends UIDefPseudo { childDefs: UIDefApplied[]; scopeType?: UIDefFragment["scopeType"]; scopeMap?: UIDefFragment["scopeMap"]; };
export interface UIDefTargetPseudo extends UIDefPseudo { childDefs: UIDefTarget[]; scopeType?: UIDefFragment["scopeType"]; scopeMap?: UIDefFragment["scopeMap"]; };


// - Content envelope - //

export interface UIContentEnvelope {
    appliedDef: UIDefApplied;
    targetDef: UIDefTarget;
}


// - Settings - //

/** The basic dom node cloning modes - either deep or shallow: element.clone(mode === "deep").
 * - If in "always" then is deep, and will never use the original. */
export type UICloneNodeBehaviour = "deep" | "shallow" | "always";
export type UIRenderTextTagCallback = (text: string | number) => Node | null;
export type UIRenderTextContentCallback = (text: string | number) => string | number;
export type UIRenderTextTag = UIDomTag | "" | UIRenderTextTagCallback;
export interface UIHostSettingsUpdate extends Partial<Omit<UIHostSettings, "updateLiveModes">> {
    updateLiveModes?: Partial<UIHostSettings["updateLiveModes"]>;
}

/** Settings for UIDom behaviour for all inside a uiHost instance.
 * The settings can be modified in real time: by uiHost.updateSettings(someSettings) or manually, eg. uiHost.settings.updateTimeout = null. */
export interface UIHostSettings {

	/** If is null, then is synchronous. Otherwise uses the given timeout in ms. Defaults to 0ms.
     * - This timeout delays the beginning of the update process.
     *   * After the timeout has elapsed, .render() is called on components and a new structure is received.
     *   * The structure is then applied to the component, and for any nested components similarly .render() is called and then the defs applied recursively.
     *   * Finally, the process outputs a list of render callbacks to apply the related dom changes. Executing the changes can be delayed with the 2nd timeout: settings.renderTimeout.
     * - Note. Generally this helps to combine multiple updates together and thus prevent unnecessary updates.
     *   * This is useful if (due to complex app setup) you sometimes end up calling update multiple times for the same component.
     *     .. Without this, the update procedure would go through each time (and if rendering set to null, it as well).
     *     .. But with this, the updates get clumped together. For example, updating immediately after startup will not result in uiDidUpdate, but only one uiDidMount.
     * - Recommended usage for updateTimeout & renderTimeout:
     *   * For most cases, use updateTimeout: 0 and renderTimeout: 0 or null. Your main code line will run first, and rendering runs after (sync or async).
     *   * If you want synchronous updates on your components, use updateTimeout: null, renderTimeout: 0 - so updates are done before your main code line continues, but dom rendering is done after.
     *     .. In this case also consider putting uiDidImmediateCalls to true.
     *   * If you want everything to be synchronous (including the dom), put both to null. */
    updateTimeout: number | null;

    /** If is null, then is synchronous. Otherwise uses the given timeout in ms. Defaults to 0ms.
     * - This timeout delays the actual dom rendering part of the component update process.
     * - It's useful to have a tiny delay to save from unnecessary rendering, when update gets called multiple times - even 0ms can help.
     * - Only use null renderTimeout (= synchronous rendering after updateTimeout) if you really want rendering to happen immediately after update.
     *     * Typically, you then also want the updateTimeout to be null (synchronous), so you get access to your dom elements synchronously.
     * - Note that renderTimeout happens after updateTimeout, so they both affect how fast rendering happens - see settings.updateTimeout for details. */
    renderTimeout: number | null;

    /** The uiDid-calls are collected (together with render infos) and called after the recursive update process has finished.
     * - This option controls whether the calls are made immediately after the update process or only after the (potentially delayed) rendering.
     * - Keep this as false, if you want the components to have their dom elements available upon uiDidMount - like in React. (Defaults to false.)
     * - Put this to true, only if you really want the calls to be executed before the rendering happens.
     *     * If you combine this with updateTimeout: null, then you get synchronously updated state, with only rendering delayed.
     *     * However, you won't have dom elements on mount. To know when that happens should use refs and .domDidMount and .domWillUnmount callbacks. */
    uiDidImmediateCalls: boolean;

    /** Whether should call .domDidMove in the case, that didn't need to actually move the element, although index was changed. */
    callRefMoveEvenIfNoDomMove: boolean;

    /** If the internal should update check is called without any types to update with, this decides whether should update or not. Defaults to false. */
    shouldUpdateWithNothing: boolean;

    /** Defines what UILive components should look at when doing uiShouldUpdate check.
     * By default looks in all 4 places for change: 1. Props, 2. State, 3. Context, 4. Children.
     * .. However, most of them will be empty, and Context and Children will only be there if specifically asked for by needsChildren or needsData. */
    updateLiveModes: UIUpdateCompareModesBy;

    /** Defines how mini functional components should update. See UIUpdateCompareMode for details, or use number to define the depth (-1 for deep). */
    updateMiniMode: UIUpdateCompareMode | number;

    /** Whether does a equalDomProps check on the updating process.
     * - If true: Only adds render info (for updating dom props) if there's a need for it.
     * - If false: Always adds render info for updating dom elements. They will be diffed anyhow.
     * - If "if-needed": Then marks to be updated if had other rendering needs (move or content), if didn't then does equalDomProps check. (So that if no need, don't mark render updates at all.)
     * Note that there is always a diffing check before applying dom changes, and the process only applies changes from last set.
     * .. In other words, this does not change at all what gets applied to the dom.
     * .. The only thing this changes, is whether includes an extra equalDomProps -> boolean run during the update process.
     * .. In terms of assumed performance:
     * .... Even though equalDomProps is an extra process, it's a bit faster to run than collecting diffs and in addition it can stop short - never add render info.
     * .... However, the only time it stops short is for not-equal, in which case it also means that we will anyway do the diff collection run later on.
     * .... In other words, it's in practice a matter of taste: if you want clean renderinfos (for debugging) use true. The default is "if-needed". */
    preEqualCheckDomProps: boolean | "if-needed";

    /** The maximum number of times a boundary is allowed to be render during an update due to update calls during the render func.
     * .. If negative, then there's no limit. If 0, then doesn't allow to re-render. The default is 1: allow to re-render once (so can render twice in a row).
     * .. If reaches the limit, stops re-rendering and logs a warning if devLogToConsole has .Warnings on. */
    maxReRenders: number;

    /** Which element (tag) to wrap texts (from props.children) into.
     * - By default, no wrapping is applied: treats texts as textNodes (instanceof Node).
     * - You can also pass in a callback to do custom rendering - should return a Node, or then falls back to textNode. */
    renderTextTag: UIRenderTextTag;

    /** Tag to use for as a fallback when using the uiDom.htmlDef feature (that uses .innerHTML on a dummy element). Defaults to "span".
     * - It only has meaning, if the output contains multiple elements and didn't specifically define the container tag to use. */
    renderHtmlDefTag: UIDomTag;

    /** If you want to process the simple content text, assign a callback here. */
    renderTextContent: UIRenderTextContentCallback | null;

    /** This defines how UIDom will treat "simple content". The options are:
     *     1. When set to false (default), renders everything except null and undefined. (Other values are stringified.)
     *     2. When set to true, renders only values that doesn't amount to !!false. So skips: false and 0 as well.
     *     3. Third option is to give an array of values that should never be rendered.
     * Technical notes:
     *     - Regardless of the setting, UIDom will always skip simple content of `null` and `undefined` (already at the static def creation level).
     *     - This setting applies as early as possible in the non-static side of process (in pairDefs routine).
     *     - How it works is that it will actually go and modify the target def by removing any unwanted child, before it would be paired.
     */
    noRenderValuesMode: boolean | any[];

    /** For svg content, the namespaceURI argument to be passed into createElementNS(namespaceURI, tag).
     * If none given, hard coded default is: "http://www.w3.org/2000/svg" */
    renderSvgNamespaceURI: string;

    /** When using uiDom.Element to insert nodes, and swaps them, whether should apply (true), and if so whether should read first ("read").
     * Defaults to true, which means will apply based on scratch, but not read before it. */
    renderDomPropsOnSwap: boolean | "read";

    /** This is useful for nesting uiHosts.
     * - Put this to true to make nested but not currently grounded qDosts be unmounted internally.
     * - When they are grounded again, they will mount and rebuild their internal structure from the rootBoundary up. */
    onlyRunInContainer: boolean;

    /** Whether allows contexts to cascade down from host to host.
     * - Specifically sets whether this host accepts contexts above its root.
     * - If false, will be independent of the parent host's contexts. Defaults to true. */
    welcomeContextsUpRoot: boolean;

    /** When pairing defs for reusing, any arrays are dealt as if their own key scope by default.
     * - By setting this to true, wide key pairing is allowed for arrays as well.
     * - Note that you can always use {...myArray} instead of {myArray} to avoid this behaviour (even wideKeysInArrays: false).
     *   .. In other words, if you do not want the keys in the array contents to mix widely, keep it as an array - don't spread it. */
    wideKeysInArrays: boolean;

    /** For defs with no key defined, whether allows to reuse sibling tags or not.
     * - Put to `true` to reuse both boundaries and dom elements. This is default and recommended if you don't care about having a fresh lifecycle for similar boundaries.
     * - Put to `false` to never reuse if no key defined. (Not recommended.)
     * - Put to `dom` to reuse only for dom, while all boundaries get a new life cycle.
     * - Put to `dom-mini` to reuse for dom and mini renderers, while all class and live boundaries get a new life cycle. */
    reuseSiblingTags: boolean | "dom" | "dom-mini";

    /** For weird behaviour. */
    devLogWarnings: boolean;
    /** This log can be useful when testing how UIDom behaves (in small tests, not for huge apps) - eg. to optimize using keys.
     * To get nice results, set preEqualCheckDomProps setting to `true`. */
    devLogRenderInfos: boolean;
    /** To see what was cleaned up on each run (defs / treeNodes). */
    devLogCleanUp: boolean;

    /** Default behaviour for handling duplicated instances of dom nodes.
     * - The duplication can happen due to manually inserting many, or due to multiple content passes, copies, or .getChildren().
     * - The detection is uiHost based and simply based on whether the element to create was already grounded or not. */
    duplicateDomNodeBehaviour: UICloneNodeBehaviour | "";
    /** Custom handler for the duplicateDomNode behaviour. */
    duplicateDomNodeHandler: ((domNode: Node, treeNode: UITreeNodeDom) => Node | null) | null;

}



// - - - - - - - //
// - Algoritms - //
// - - - - - - - //


// - Algoritm: Get nested value & join & split - //
//
// These are thanks to: https://github.com/microsoft/TypeScript/pull/40336

// export type Join<T extends unknown[], D extends string> =
//     T extends [] ? '' :
//     T extends [string | number | boolean | bigint] ? `${T[0]}` :
//     T extends [string | number | boolean | bigint, ...infer U] ? `${T[0]}${D}${Join<U, D>}` :
//     string;

/** Split a string into a typed array.
 * - Use with PropType to validate and get deep value types with, say, dotted strings. */
export type Split<S extends string, D extends string> =
    string extends S ? string[] :
    S extends '' ? [] :
    S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] :
    [S];

/** Get deep value type. If puts 3rd param to never, then triggers error with incorrect path. */
export type PropType<T, Path extends string, Unknown = unknown> =
    string extends Path ? Unknown :
    Path extends keyof T ? T[Path] :
    Path extends `${infer K}.${infer R}` ? K extends keyof T ? PropType<T[K], R, Unknown> : Unknown :
    Unknown;

// Other useful:
//
// export declare function getPropValue<T, P extends string>(obj: T, path: P): PropType<T, P>;
// type MatchPair<S extends string> = S extends `${infer A}.${infer B}` ? [A, B] : unknown;


// - Algoritm: Class name validation - //

/** Typing tool for class name validation. The input can be:
 *    1. A string, either single or concatenated: "bold", "bold italic".
 *    2. An array of strings, similarly either single or concatenated: ["bold", "bold italic"].
 *    3. A record of string keys (where values are non-important for typing). Similarly short or long: { "bold": false, "bold italic": true }
 *    4. Anything else is accepted including "". This is to allow usage like: doHighlight && "highlight" (for strings or arrays). For objects used like: { "highlight": doHighlight }.
 * - Note that this returns either `string` (for valid strings), `Valid[]` or `any` (for valid objects & arrays), or `never` type (for failure).
 *   .. This is mostly because of whatever happens to work in practice in all the required scenarios.
 *   .. It's also because more detail is not required, and can then support mangling more flexible (while avoiding problems like circular constraints).
 * - Note that this functionality is paired with a javascript function's inner workings. (It will collect a valid class name out of the same input.)
 */
export type NameValidator<Valid extends string, Input> =
    // String - split with " " and check if the collection extends Valid[].
    [Input] extends [string] ? Split<Input, " "> extends Valid[] ? string : never :
    // Array - check each STRING VALUE inside and split it and check if extends Valid[]. (Other types are ignored.)
    [Input] extends [Array<any> | Readonly<Array<any>>] ? Input extends Valid[] ? Valid[] : Split<Input[number] & string, " "> extends Valid[] ? any : never :
    // Object - check each STRING KEY inside and split it and check if extends Valid[].
    [Input] extends [object] ? keyof Input extends Valid ? any : Split<keyof Input & string, " "> extends Valid[] ? any : never :
    // Otherwise allow anything.
    any;

/** Helper to validate class names (paired with a javascript function that actually supports handling: (...params: any[]) => string;
 * 1. First create a type for valid names, eg.: `type ValidNames = "bold" | "italic" | "underline" | "dimmed";
 * 2. Then define a shortcut for the validator with the ValidNames type: `const cleanNames: ValidateNames<ValidNames> = uiDom.classNames;`.
 * 3. Then reuse the function for validation:
 *     a. For strings: `const okName = cleanNames("bold", "underline italic", false, "");` // => "bold underline italic"
 *     b. For arrays: `const okName = cleanNames(["underline", "dimmed italic", false, ""], [], undefined, ["bold"]);` // => "underline dimmed italic bold"
 *     c. For objects: `const okName = cleanNames({"bold": false, "dimmed italic": true}, null, {"underline": true });` // => "dimmed italic underline"
 * - You can also mix these freely: `const okName = cleanNames("bold", ["italic"], {"underline": false});`
 * - Note however, that the typing support is made for 10 arguments max. Anything after that uses a common type ...T[], so it will get buggy in various ways.
 */
export type ValidateNames<Valid extends string> = <
    T1 extends NameValidator<Valid, T1>,
    T2 extends NameValidator<Valid, T2>,
    T3 extends NameValidator<Valid, T3>,
    T4 extends NameValidator<Valid, T4>,
    T5 extends NameValidator<Valid, T5>,
    T6 extends NameValidator<Valid, T6>,
    T7 extends NameValidator<Valid, T7>,
    T8 extends NameValidator<Valid, T8>,
    T9 extends NameValidator<Valid, T9>,
    T10 extends NameValidator<Valid, T10>,
    Tn extends NameValidator<Valid, Tn>>
    (t1?: T1, t2?: T2, t3?: T3, t4?: T4, t5?: T5, t6?: T6, t7?: T7, t8?: T8, t9?: T9, t10?: T10, ...tn: Tn[]) => string;

// // - Testing - //
//
// // Prepare.
// type ValidNames = "a" | "b";
// const validate: ValidateNames<ValidNames> = uiDom.classNames;
//
// // Do tests.
// // .. These should not produce errors.
// validate(["a"]);
// validate(["a", "b", ""]);
// validate(["a", "b", "a b", "b a"]);
// validate(["a", false, undefined, "b"]);
// validate(["a", false, undefined, "b"] as const);
// validate({"a": true, "b a": false});
// validate({"a": true, "b a": false} as const);
// validate("a", "a b", false, ["a"], ["b a", ""], undefined, {"a": true, "b a": false});
// // .. These should fail each, because "FAIL" is not part of ValidNames.
// validate("FAIL");
// validate(["FAIL"]);
// validate({"FAIL": false});
// validate("a", "a b", undefined, "FAIL", ["a", false]);
// validate("a", "a b", undefined, ["a", "FAIL", false]);
// validate(["a", "b", "a b", "FAIL", false]);
// validate("a", "a b", false, ["a"], ["b a", ""], undefined, {"a": true, "b a": false, "FAIL": true});
// validate("a", "FAIL", "a b", false, ["a"], ["b a", ""], undefined, {"a": true, "b a": false});
// validate("a", "a b", false, ["a", "FAIL"], ["b a", ""], undefined, {"a": true, "b a": false});


// - Algoritm alternative: Get dotted keys - //
//
// These are thanks to jcalz at: https://stackoverflow.com/questions/58434389/typescript-deep-keyof-of-a-nested-object
//
// export type SafeIteratorDepth = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
// export type SafeIteratorDepthDefault = 10;
//
// type NestedJoin<K, P> = K extends string | number ?
//     P extends string | number ?
//         `${K}${"" extends P ? "" : "."}${P}`
//         : never
//     : never
// ;
//
// // Max 20, if gives higher, it's 0.
// // .. This works by having an offset of 1: the first item is never, then 0, 1, 2, ...
// // .. So each time we get with a number, we get one smaller, until we hit never.
// type NestedPrev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];
//
// /** Get nested paths and leaves from data, eg. "themes" | "themes.color" | "themes.style" */
// export type NestedPathsBy<T, NotAllowed = never, D extends SafeIteratorDepth = SafeIteratorDepthDefault> = [D] extends [never] ? never : T extends object ?
//     { [K in keyof T]-?: K extends string | number ?
//         T[K] extends NotAllowed ?
//             never
//             : K | NestedJoin<K, NestedPathsBy<T[K], NotAllowed, NestedPrev[D]>>
//         : never
//     }[keyof T] : ""
// ;
// export type NestedPaths<T> = NestedPathsBy<T, NonDictionary, SafeIteratorDepthDefault>;
//
// /** Get nested leaves only from data, eg. "themes.color" | "themes.style" - but not "themes" as it's not a leaf. */
// export type NestedLeaves<T, NotAllowed = never, D extends SafeIteratorDepth = SafeIteratorDepthDefault> = [D] extends [never] ? never : T extends object ?
//     { [K in keyof T]-?: T[K] extends NotAllowed ? {} : NestedJoin<K, NestedLeaves<T[K], NotAllowed, NestedPrev[D]>> }[keyof T]
//     : ""
// ;
//
// <-- Unfortunately this is too heavy. It gets heavy when extending a class using this, or in mixin use.


// - More algoritm alternatives - //
//
// Example 1: https://stackoverflow.com/questions/47057649/typescript-string-dot-notation-of-nested-object
//
// Example 2: https://dev.to/pffigueiredo/typescript-utility-keyof-nested-object-2pa3
// export type DottedKeysOf<ObjectType> =
// 	ObjectType extends PureDictionary<ObjectType> ?
// 		{[Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
// 		// @ts-ignore - TypeScript tells us that it's excessively deep and possibly infinite - luckily we can ignore just the warning, but keep functionality.
// 		? Key | `${Key}.${DottedKeysOf<ObjectType[Key]>}`
// 		: Key
// 		}[keyof ObjectType & (string | number)]
// 	: never
// ;
