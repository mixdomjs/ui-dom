

// - Imports - //

import {
    ClassType,
    Dictionary,
    UITreeNode,
    UITreeNodeDom,
    UIAllContexts,
    UIDefApplied,
    UIDefTarget,
    UILiveFunction,
    UILiveNewUpdates,
    UIMiniFunction,
    UIRenderOutput,
    UISourceBoundaryId,
} from "../static/_Types";
import { _Defs } from "../static/_Defs";
import { _Apply } from "../static/_Apply";
import { UIMini } from "./UIMini";
import { UIWired, UIWiredType } from "./UIWired";
import { UILive } from "./UILive";
import { UIHost } from "./UIHost";
import { UIContext } from "./UIContext";
import { UIContextApi } from "./UIContextApi";
import { UIContentApi } from "./UIContentApi";
import { UIContentClosure } from "./UIContentClosure";


// - Boundary - //

class UIBaseBoundary {


    // - Defs - //

    /** The def that defined this boundary to be included. This also means it contains our last applied props. */
    _outerDef: UIDefApplied;
    /** The _innerDef is the root def for what the boundary renders inside - or passes inside for content boundaries.
     * - Note that the _innerDef is only null when the boundary renders null. For content boundaries it's never (they'll be destroyed instead). */
    _innerDef: UIDefApplied | null;


    // - uiHost, treeNode and mounted - //

    /** The reference for containing uiHost for many technical things as well as general settings. */
    uiHost: UIHost;
    /** Whether the boundary is mounted. This is set to true right before uiDidMount is called and false after uiWillUnmount. */
    isMounted: boolean | null;
    /** The baseTreeNode is a very important (concept and) reference for technical reasons.
     * - It allows to keep the separate portions of the GroundedTree structure together by tying parent and child boundary to each other.
     *   .. So, ultimately it allows us to keep a clear bookkeeping of the dom tree and makes it easy, flexible and performant to apply changes to it.
     * - The node is given by the host boundary (or uiHost for root) and the reference always stays the same (even when mangling stuff around).
     *   1. The first host is the uiHost instance: it creates the root treeNode and its first child, and passes the child for the first boundary.
     *   2. The boundary then simply adds add kids to this baseTreeNode.
     *   3. If the boundary has a sub-boundary in it, it similarly gives it a baseTreeNode to work with.
     *   4. When the boundary re-renders, it will reuse the applied defs and if did for any sub-boundary,
     *      will then reuse the same baseTreeNode and just modify its parent accordingly. So the sub-boundary doesn't even need to know about it.
     */
    baseTreeNode: UITreeNode;


    // - Boundary refs - //

    /** The sourceBoundary refers to the original UISourceBoundary who defined us.
     * - Due to content passing, it's not necessarily our .parentBoundary, who is the one who grounded us to the tree.
     * - For the rootBoundary of a uiHost, there's no .sourceBoundary, but for all nested, there always is. */
    sourceBoundary: UISourceBoundary | null;
    /** The parentBoundary ref is very useful for going quickly up the boundary tree - the opposite of .innerBoundaries. */
    parentBoundary: UISourceBoundary | UIContentBoundary | null;
    /** Any source or content boundaries inside that we have directly grounded in tree order - updated during every update run (don't use during). */
    innerBoundaries: (UISourceBoundary | UIContentBoundary)[];


    // - Contextual - //

    /** These are contexts inherited from the parent. */
    outerContexts: Record<string, UIContext | null>;
    _outerContextsWere?: Record<string, UIContext | null>;


    constructor(uiHost: UIHost, outerDef: UIDefApplied, baseTreeNode: UITreeNode) {
        // Init.
        this.uiHost = uiHost;
        this.baseTreeNode = baseTreeNode;
        this._outerDef = outerDef;
        this._innerDef = null;
        this.isMounted = false;
        this.sourceBoundary = null;
        this.parentBoundary = null;
        this.innerBoundaries = [];
        this.outerContexts = {};
    }

    // - Getters - //

    public getRootTreeNodes(): UITreeNode[] {
        return [...this.baseTreeNode.children];
    }

    public getTreeNodesForDomRoots(inNestedBoundaries: boolean = false, includeEmpty: boolean = false): UITreeNodeDom[] {
        return _Apply.getTreeNodesForDomRootsUnder(this.baseTreeNode, inNestedBoundaries, includeEmpty);
    }

    /** This gets the first rooted dom element. */
    public getRootDomNode(): Node | null {
        return this.baseTreeNode.domNode;
    }

    /** This gets the dom elements that are rooted. Typically it's just one, but due to fragments (with nested components), it might be several.
     * .. So for example when inserting the component into dom, we must get them all. (On unmounting, it's happens more naturally.)
     * .. For most technical purposes, you want to include the hidden <noscript/> elements.
     * .. For end user purposes, they are more often interested in what is actually visible, so includeHidden is defaulted to false. */
    public getRootDomNodes(inNestedBoundaries: boolean = false): Node[] {
        return _Apply.getTreeNodesForDomRootsUnder(this.baseTreeNode, inNestedBoundaries, false).map(treeNode => treeNode.domNode) as Node[];
    }

    /** This gets all dom nodes that belong to this boundary. */
    public getAllDomNodes(includeOurPassFurther: boolean = true, includePassedToUs: boolean = false): Node[] {
        // Prepare.
        if (!this._innerDef)
            return [];
        const list: Node[] = [];
        let appliedDefsLeft: UIDefApplied[] = [this._innerDef];
        let appliedDef: UIDefApplied | undefined;
        let i = 0;
        // Loop recursively in tree order.
        while (appliedDef = appliedDefsLeft[i]) {
            // Next.
            i++;
            // Skips based on type.
            if (appliedDef.treeNode) {
                const type = appliedDef.treeNode.type;
                // Skip nested uiHosts.
                if (type === "host")
                    continue;
                // Skip parts where we pass content into other boundaries.
                if (!includeOurPassFurther && type === "boundary")
                    continue;
                // Skip parts where we insert content pass.
                if (!includePassedToUs && type === "pass")
                    continue;
            }
            // Add child defs to top of queue.
            if (appliedDef.childDefs[0]) {
                appliedDefsLeft = appliedDef.childDefs.concat(appliedDefsLeft.slice(i));
                i = 0;
            }
            // Add dom nodes.
            if (appliedDef.treeNode && (appliedDef.treeNode.type === "dom") && appliedDef.treeNode.domNode)
                list.push(appliedDef.treeNode.domNode);
        }
        return list;
    }
}

export class UIContentBoundary extends UIBaseBoundary {


    // - Additions - //

    /** The def whose children define our content - we are a fragment-like container. */
    targetDef: UIDefTarget;


    // - Alternative - //
    //
    // /** This is the content closure that defines our content.
    //  * - The target def is accessed by sourceClosure.envelope.targetDef.
    //  * - Because the envelope might be null, the targetDef could theoretically be null.
    //  *   .. However, it will never be null for us, because in that case we will be destroyed / were never born. */
    // sourceClosure: UIContentClosure;
    //
    // It is a bit ridiculous in a way, but we don't need reference to the closure, if we just have our targetDef.
    // .. And if we have our targetDef instead, there are three good things:
    //    1. We can access it directly and we know that it exists - it's never null, in which case we wouldn't exist anyway.
    //    2. Because we get our targetDef in constructor, we can store it and build _innerDef from it.
    //       .. And it just seems so logically safe and nice that we maintain our own _innerDef, while _outerDef comes from outside.
    //       .. Of course, we could just do this from the closure too: sourceClosure.envelope.targetDef.
    //    3. In a way, it's nice that closure just defines us and we don't have a ref for it.
    //       .. That means, we don't need to know (from UIContentBoundary's point of view) how closure works.
    //       .. However, we do have .sourceBoundary, .parentBoundary and .innerBoundaries, so in comparison seems strange.


    // - Redefinitions - //

    /** Redefine that we always have it. It's based on the targetDef. */
    _innerDef: UIDefApplied;
    /** Redefine that we always have a host for content boundaries - for us, it's the original source of our rendering.
     * Note that the content might get passed through many boundaries, but now we have landed it. */
    sourceBoundary: UISourceBoundary;
    /** Redefine that we always have a boundary that grounded us to the tree - we are alive because of it.
     * - Note that it gets assigned (externally) immediately after constructor is called.
     * - The parentBoundary ref is very useful for going quickly up the boundary tree - the opposite of .innerBoundaries. */
    parentBoundary: UISourceBoundary | UIContentBoundary;


    // - For TypeScript - //

    /** Just for typescript: UIContentBoundary never has a contextApi - it's just a pass-through boundary. */
    contextApi?: never;
    /** Just for typescript: UIContentBoundary never has a contentApi - it's just a pass-through boundary. */
    contentApi?: never;
    live?: never;
    mini?: never;
    /** Content boundaries will never feature this. So can be used for checks to know if is a source. */
    uiId?: never;


    // This is the moment we open up our personal copy of the envelop. It has been just opened and reclosed with treeNode appropriate for us.
    // .. Note. We use the basis of UIBaseBoundary, so we can use the same _Apply methods for UISourceBoundary and UIContentBoundary.
    //
    constructor(outerDef: UIDefApplied, targetDef: UIDefTarget, treeNode: UITreeNode, sourceBoundary: UISourceBoundary) {
        // Base boundary.
        super(sourceBoundary.uiHost, outerDef, treeNode);
        // Assign.
        this.sourceBoundary = sourceBoundary;
        this.targetDef = targetDef;
        this._innerDef = _Defs.newAppliedDefBy(targetDef, sourceBoundary.closure);
    }

    updateEnvelope(targetDef: UIDefTarget, truePassDef?: UIDefApplied | null) {
        this.targetDef = targetDef;
        if (truePassDef)
            this._innerDef.childDefs = truePassDef.childDefs;
    }

}

/** This is what "contains" a component (= a uiDom class instance or a uiDom render function).
 * .. It's the common interface for technical as well as advanced API interfacing. */
export class UISourceBoundary extends UIBaseBoundary {


    // - Private-like temporary states - //

    /** If true means that has not ever rendered yet.
     * .. Needed for LiveFunctions to know if should call .onContextChange right after first render.
     * .. Because with the double render function, it's the first render call where things are initialized. */
    _notRendered?: true;
    /** Temporary rendering state indicator. */
    _renderState?: "active" | "re-updated";
    /** Temporary collection of preUpdates - as the update data are always executed immediately. */
    _preUpdates?: UILiveNewUpdates;


    // - uiHost related - //

    /** Our uiHost based quick id. It's mainly used for sorting, and sometimes to detect whether is content or source boundary, helps in debugging too. */
    uiId: UISourceBoundaryId;


    // - Type and main features - //

    type: "live" | "mini" | "class-live" | "class-mini" | "class-wired" | "";


    /** Contextual api to handle needs for contexts (data and actions). */
    contextApi?: UIContextApi;
    /** Children api to handle needs for children. */
    contentApi?: UIContentApi;

    /** The mounted live component that was assigned based on the .tag (pointing to a UILive).
     * - If assigned, the component is always a UILive class instance, either user defined or for live components the generic one. */
    live?: UILive;

    /** Mini api for mini render components. It gets assigned as the "this" keyword for the function.
     * - Contains only 3 members: .props, .isMounted and .updateMode.
     *   .. Having the .props is the main reason for the existence of this api - very practical with the double render function pattern.
     *   .. This is by declaring your callbacks once (in the initializer), and being able to use this.props for fresh props.
     * - Contains one callable method .setUpdateMode and one optional overrideable .shouldUpdate(prevProps, nextProps) */
    mini?: UIMini | UIWired;


    // - Boundary, closure & children - //

    /** Has a closure if there were any content passed to us. */
    closure: UIContentClosure;



    // - Init & destroy - //

    constructor(uiHost: UIHost, outerDef: UIDefApplied, baseTreeNode: UITreeNode, sourceBoundary?: UISourceBoundary) {
        // Init.
        super(uiHost, outerDef, baseTreeNode);
        this._notRendered = true;
        this.uiId = uiHost.services.createBoundaryId();
        this.sourceBoundary = sourceBoundary || null;
        this.closure = new UIContentClosure(this, sourceBoundary);
        this.reattach(false);
    }

    reattach(clear: boolean = true) {
        // Nullify.
        if (clear) {
            delete this.contextApi;
            delete this.contentApi;
            delete this.live;
            delete this.mini;
        }
        this.type = "";
        // Setup the rendering.
        let tag = this._outerDef.tag;
        if (typeof tag === "function") {
            // We must assign contentApi and contextApi before we construct the classes.
            let Mini: ClassType<UIMini> | null = null;
            let Live: ClassType<UILive> | null = null;
            let renderer: UIMiniFunction | UILiveFunction | UILive["render"] | null = null;
            // Handle by type.
            switch(tag["UI_DOM_TYPE"]) {
                // Is a functional renderer.
                case undefined:
                    // Mini.
                    if (tag.length < 2) {
                        this.type = "mini";
                        Mini = UIMini;
                        renderer = this._outerDef.tag as UIMiniFunction;
                    }
                    // Live.
                    else {
                        this.type = "live";
                        Live = UILive;
                        renderer = this._outerDef.tag as UILive["render"];
                    }
                    break;
                // Class type.
                case "Live":
                    this.type = "class-live";
                    Live = tag as ClassType<UILive>;
                    break;
                case "Mini":
                    this.type = "class-mini";
                    Mini = tag as ClassType<UIMini>;
                    renderer = this._outerDef.tag as UIMiniFunction;
                    break;
                case "Wired":
                    this.type = "class-wired";
                    Mini = tag as UIWiredType;
                    break;
            }
            // Prepare for contentApi.
            const readChildren = Live || Mini ? (shallowCopy: boolean = true): UIDefTarget[] | null => {
                const defs = this.closure.envelope?.targetDef.childDefs || null;
                return defs && (shallowCopy ? defs.slice() : defs);
            } : null;
            // For live.
            if (Live) {
                // Content and context api.
                this.contentApi = new UIContentApi(readChildren);
                this.contextApi = new UIContextApi(this as UILiveSource);
                // Constructor and assign renderer.
                this.live = new Live(this._outerDef.props || {}, this);
                if (renderer)
                    this.live.render = renderer as UILive["render"];
            }
            // Assign one way reading for mini.
            if (Mini) {
                // Content api.
                this.contentApi = new UIContentApi(readChildren);
                // Constructor and assign renderer.
                this.mini = new Mini(this._outerDef.props || {}, this);
                if (renderer)
                    this.mini.render = renderer as UIMiniFunction;
                // Handle Wired.
                if (this.type === "class-wired") {
                    const Wired = Mini as UIWiredType;
                    Wired.boundaries.add(this);
                    if (Wired.uiWillMount)
                        Wired.uiWillMount(this as UIMiniSource);
                }
            }
        }
    }


    // - Update & render - //

    update(forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null) {
        this.uiHost.services.absorbUpdates(this, { force: !this.isMounted ? "all" : forceUpdate || false }, forceUpdateTimeout, forceRenderTimeout);
    }

    updateBy(updates: UILiveNewUpdates, forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null) {
        this.uiHost.services.absorbUpdates(this, { ...updates, force: !this.isMounted ? "all" : forceUpdate || false }, forceUpdateTimeout, forceRenderTimeout);
    }

    render(iRecursion: number = 0): UIRenderOutput {
        // Rendering state.
        if (!iRecursion)
            this._renderState = "active";
        // Remove temporary children needs marker.
        if (this.contentApi && this.contentApi.childrenNeeds === "temp")
            delete this.contentApi.childrenNeeds;
        // Get props.
        let content: UIRenderOutput | UIMiniFunction | UILiveFunction;
        const props = this._outerDef.props || {};
        // Mini.
        if (this.mini)
            content = this.mini.render(props);
        // Live / Class.
        else if (this.live)
            content = this.type === "live" ? this.live.render(props, this.live) : this.live.render();
        // Reassign and render again.
        if (typeof content === "function") {
            if (this.mini)
                this.mini.render = content as UIMiniFunction;
            else if (this.live)
                this.live.render = content as UILive["render"];
            return this.render(iRecursion);
        }
        // Run context updates (and other similar that have been executed before could declare the callback).
        // .. This feature is only for Live Functions - because their initializer is run on first render call. (Note for MiniFuncs as they have no context.)
        // .. For class components, they are either already defined by the class or then at constructor. (In either case, early enough.)
        if (this._notRendered) {
            delete this._notRendered;
            const live: UILive<{}, {}, {}, {[name: string]: UIContext }> | undefined = this.live;
            if (live && live.onContextChange && live.render.length > 1) {
                const allContexts = live.getContexts();
                for (const name in allContexts)
                    live.onContextChange(name, allContexts[name] as UIContext, null);
            }
        }
        // Run again and return the new ones instead.
        if (this._renderState === "re-updated") {
            const nMax = this.uiHost.settings.maxReRenders;
            if (nMax < 0 || iRecursion < nMax) {
                iRecursion++;
                this._renderState = "active";
                return this.render(iRecursion);
            }
            // - DEVLOG - //
            else {
                if (this.uiHost.settings.devLogWarnings) {
                    console.warn("__UISourceBoundary.render: Warning: The boundary tried to render for over " + ((iRecursion + 1).toString()) + " times.",
                        this.type === "class-live" && this.live && this.live.constructor || (this.type === "class-wired" || this.type === "class-mini") && this.mini && this.mini.constructor || this._outerDef.tag,
                        this
                    );
                }
            }
        }
        // Finish up.
        delete this._renderState;
        // Return content.
        return content;
    }

}

export interface UILiveSource<AllContexts extends UIAllContexts = {}, Remote extends Dictionary = {}, Props extends Dictionary = {}, State extends Dictionary = {}> extends UISourceBoundary {
    contentApi: UIContentApi;
    contextApi: UIContextApi<AllContexts, Remote>;
    live: UILive<Props, State, Remote, AllContexts, {}>;
}

export interface UIMiniSource<Props extends Dictionary = {}> extends UISourceBoundary {
    contentApi: UIContentApi;
    mini: UIMini<Props>;
}
