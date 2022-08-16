

// - Imports - //

import {
    ClassType,
    ClassBaseMixer,
    RecordableType,
    UITreeNode,
    UIDomRenderInfo,
    UIRenderOutput,
    UIHostSettingsUpdate,
    UITreeNodeType,
    UIHostSettings,
    UITreeNodeDom,
    UITreeNodeBoundary,
} from "../static/_Types";
import { _Lib } from "../static/_Lib";
import { _Defs } from "../static/_Defs";
import { _Find } from "../static/_Find";
import { UISourceBoundary } from "./UIBoundary";
import { UIHostServices } from "./UIHostServices";


// - uiDom.Host - //

function _UIHostMixin(Base: ClassType) {

    return class _UIHost extends Base {

        // Static.
        public static UI_DOM_TYPE = "Host";

        // Public.
        public groundedTree: UITreeNode;
        public rootBoundary: UISourceBoundary;
        public settings: UIHostSettings;

        // Semi private.
        services: UIHostServices;


        // - Init - //

        constructor(content?: UIRenderOutput, domContainer?: Node | null, settings?: UIHostSettingsUpdate | null) {

            // - Initialize - //

            // This is a mixin.
            super();

            // Initialize.
            this.settings = UIHost.getDefaultSettings(settings);
            this.services = new UIHostServices(this);
            this.groundedTree = {
                type: "root",
                parent: null,
                children: [],
                domNode: domContainer || null,
                sourceBoundary: null
            };

            // - Start up - //

            // Create root boundary with the first content.
            const Root = this.services.createRoot(content);
            // Create base tree node for the root boundary.
            const sourceDef = _Defs.newAppliedDefBy({ _uiDefType: "boundary", tag: Root, props: {}, childDefs: [] }, null);
            const treeNode: UITreeNodeBoundary = {
                type: "boundary",
                def: sourceDef,
                sourceBoundary: null,
                // For type clarity, we define (for typescript) that treeNode always has a boundary.
                // .. However, we always instance it with the treeNode, so it's impossible.
                // .. But it will be set right after instancing (here and in _Apply). Hence, the weird typescripting here.
                boundary: null as unknown as UISourceBoundary,
                parent: this.groundedTree,
                children: [],
                domNode: null
            };
            this.groundedTree.children.push(treeNode);
            // Create boundary.
            this.rootBoundary = new UISourceBoundary(this, sourceDef, treeNode);
            if (this.rootBoundary.mini)
                this.rootBoundary.mini.updateMode = "always";
            treeNode.boundary = this.rootBoundary;
            this.rootBoundary.reattach(false);
            // Run updates.
            this.services.absorbUpdates(this.rootBoundary, {});
        }

        // - Listeners - //

        public addListener(type: "update" | "render", callback: () => void): void {
            this.services.addListener(type, callback);
        }
        public removeListener(type: "update" | "render", callback: () => void): void {
            this.services.removeListener(type, callback);
        }

        // - Basic api - //

        public clear(update: boolean = true, updateTimeout?: number | null, renderTimeout?: number | null): void {
            // Clear.
            this.services.clearRoot(true);
            // Update.
            if (update)
                this.rootBoundary.update(true, updateTimeout, renderTimeout);
        }

        public update(content: UIRenderOutput, updateTimeout?: number | null, renderTimeout?: number | null): void {
            this.services.updateRoot(content, updateTimeout, renderTimeout);
        }

        // - Refresh - //

        public refresh(forceUpdate: boolean = false, updateTimeout?: number | null, renderTimeout?: number | null): void {
            this.services.refreshRoot(forceUpdate, updateTimeout, renderTimeout);
        }

        public refreshRender(forceDomRead: boolean = false, forceRenderTimeout?: number | null) {
            // Go through the UITreeNode structure and refresh each.
            const refresh = forceDomRead ? "read" : true;
            const renderInfos: UIDomRenderInfo[] = [];
            let nextNodes = [...this.groundedTree.children] as UITreeNodeDom[];
            let treeNode: UITreeNodeDom | undefined;
            let i = 0;
            while (treeNode = nextNodes[i]) {
                // Next.
                i += 1;
                // If describes a dom node.
                if (treeNode.domProps) {
                    treeNode
                    renderInfos.push({
                        treeNode,
                        refresh,
                    });
                }
                // Add to loop.
                if (treeNode.children[0]) {
                    nextNodes = treeNode.children.concat(nextNodes.slice(i)) as UITreeNodeDom[];
                    i = 0;
                }
            }
            // Render.
            this.services.absorbChanges(renderInfos, null, forceRenderTimeout);
        }

        // - Move - //

        public moveInto(parent: Node | null, forceRenderTimeout?: number | null) {
            // Already there.
            if (this.groundedTree.domNode === parent)
                return;
            // Update.
            this.groundedTree.domNode = parent;
            // Create render infos.
            const renderInfos = _Find.rootDomTreeNodes(this.rootBoundary.treeNode, true).map(treeNode => ({ treeNode, move: true }) as UIDomRenderInfo);
            // Trigger render.
            if (renderInfos[0] || (forceRenderTimeout !== undefined))
                this.services.absorbChanges(renderInfos, null, forceRenderTimeout);
        }

        // - Settings - //

        public modifySettings(settings: UIHostSettingsUpdate): void {
            // Collect state before.
            const onlyRunWas = this.settings.onlyRunInContainer;
            const welcomeCtxsWas = this.settings.welcomeContextsUpRoot;
            // Do changes.
            UIHost.modifySettings(this.settings, settings);
            // Detect special changes.
            // .. Recheck contexts from host to host.
            if (welcomeCtxsWas !== undefined && welcomeCtxsWas !== settings.welcomeContextsUpRoot) {
                const pHost = this.groundedTree.parent && this.groundedTree.parent.sourceBoundary && this.groundedTree.parent.sourceBoundary.uiHost;
                const pCtxs = pHost && this.settings.welcomeContextsUpRoot ? pHost.rootBoundary.outerContexts : {};
                this.services.onContextPass(pCtxs);
            }
            // .. Run the update immediately.
            if (settings.onlyRunInContainer !== undefined && settings.onlyRunInContainer !== onlyRunWas)
                this.refresh(false, null, null);
        }


        // - Getters - //

        public getRootDomNode(): Node | null {
            return this.rootBoundary && this.rootBoundary.treeNode.domNode;
        }

        public getRootDomNodes(inNestedBoundaries: boolean = true): Node[] {
            return this.rootBoundary ? _Find.rootDomTreeNodes(this.rootBoundary.treeNode, inNestedBoundaries, false).map(treeNode => treeNode.domNode) as Node[] : [];
        }

        public queryDomElement<T extends Element = Element>(selectors: string, allowOverHosts: boolean = false): T | null {
            return _Find.domElementByQuery<T>(this.groundedTree, selectors, true, allowOverHosts);
        }

        public queryDomElements<T extends Element = Element>(selectors: string, maxCount: number = 0, allowOverHosts: boolean = false): T[] {
            return _Find.domElementsByQuery<T>(this.groundedTree, selectors, maxCount, true, allowOverHosts);
        }

        public findDomNodes<T extends Node = Node>(maxCount: number = 0, allowOverHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): T[] {
            return _Find.treeNodesWithin(this.groundedTree, { dom: true }, maxCount, true, allowOverHosts, validator).map(tNode => tNode.domNode) as T[];
        }

        public findBoundaries(maxCount: number = 0, allowOverHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): UISourceBoundary[] {
            return _Find.treeNodesWithin(this.groundedTree, { boundary: true }, maxCount, true, allowOverHosts, validator).map(tNode => tNode.boundary) as UISourceBoundary[];
        }

        public findTreeNodes(types?: RecordableType<UITreeNodeType>, maxCount: number = 0, allowOverHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): UITreeNode[] {
            return _Find.treeNodesWithin(this.groundedTree, types && _Lib.buildRecordable<UITreeNodeType>(types), maxCount, true, allowOverHosts, validator);
        }


        // - Static - //

        public static modifySettings(baseSettings: UIHostSettings, updates: UIHostSettingsUpdate): void {
            // Special case.
            if (updates.updateLiveModes) {
                for (const prop in updates.updateLiveModes) {
                    const val = updates.updateLiveModes[prop];
                    if (typeof val === "string")
                        baseSettings.updateLiveModes[prop] = val;
                }
            }
            // Update simple values.
            for (const prop in updates) {
                const val = updates[prop];
                const type = typeof val;
                if ((val === null) || (type === "boolean") || (type === "string") || (type === "number"))
                    baseSettings[prop] = val;
            }
        }

        public static getDefaultSettings(settings?: UIHostSettingsUpdate | null): UIHostSettings {
            // Default.
            const dSettings: UIHostSettings = {
                // Timing.
                updateTimeout: 0,
                renderTimeout: 0,
                // Calling.
                uiDidImmediateCalls: false,
                callRefMoveEvenIfNoDomMove: false,
                // Updating.
                shouldUpdateWithNothing: false,
                updateMiniMode: "shallow",
                updateLiveModes: {
                    props: "shallow",
                    state: "shallow",
                    remote: "shallow",
                    children: "changed"
                },
                preEqualCheckDomProps: true,
                // Behaviour.
                onlyRunInContainer: false,
                welcomeContextsUpRoot: true,
                wideKeysInArrays: false,
                reuseSiblingTags: true,
                noRenderValuesMode: false,
                // Rendering.
                maxReRenders: 1,
                renderTextTag: "",
                renderHtmlDefTag: "span",
                renderTextContent: null,
                renderSvgNamespaceURI: "http://www.w3.org/2000/svg",
                renderDomPropsOnSwap: true,
                duplicateDomNodeBehaviour: "deep",
                duplicateDomNodeHandler: null,
                // - DEVLOG - //
                // Dev log.
                devLogWarnings: false,
                devLogRenderInfos: false,
                devLogCleanUp: false,
            };
            // Apply custom.
            if (settings) {
                for (const prop in settings)
                    dSettings[prop] = settings[prop];
            }
            // Return combined.
            return dSettings;
        }
    }
}

export interface UIHost {

    /** This represents abstractly what the final outcome looks like in dom. */
    groundedTree: UITreeNode;
    /** The root boundary that renders whatever is fed to the host on .update or initial creation. */
    rootBoundary: UISourceBoundary;
    /** Internal services to keep the whole thing together and synchronized.
     * They are the semi-private internal part of UIHost, so separated into its own class. */
    services: UIHostServices;
    /** The general settings for this uiHost instance.
     * - Do not modify directly, use the .modifySettings method instead.
     * - Otherwise rendering might have old settings, or setting.onlyRunInContainer might be uncaptured. */
    settings: UIHostSettings;

    // Basic methods.
    /** Add a listener to the update or render cycle. Will be called after the processing is done. */
    addListener(type: "update" | "render", callback: () => void): void;
    /** Remove a previously added update or render listener. */
    removeListener(type: "update" | "render", callback: () => void): void;
    /** Clear whatever has been previously rendered - destroys all boundaries inside the rootBoundary. */
    clear(update?: boolean, updateTimeout?: number | null, renderTimeout?: number | null): void;
    /** Update the previously render content with new render output definitions. */
    update(content: UIRenderOutput, updateTimeout?: number | null, renderTimeout?: number | null): void;
    /** Triggers an update, optionally forces it. This is useful for refreshing the container. */
    refresh(forceUpdate?: boolean, updateTimeout?: number | null, renderTimeout?: number | null): void;
    /** Triggers a process that refreshes the dom nodes based on the current state.
     * - In case forceDomRead is on will actually read from dom to look for real changes to be done.
     * - Otherwise just reapplies the situation - as if some updates had not been done.
     * - Note. This is a partly experimental feature - it's not assumed to be used in normal usage. */
    refreshRender(forceDomRead?: boolean, renderTimeout?: number | null): void;
    /** Move the host into another dom container. */
    moveInto(parent: Node | null, renderTimeout?: number | null): void;
    /** Modify previously given settings - supporting handling the related special cases:
     *     1. welcomeContextsUpRoot: Immediately updates whether now has a context on the host or not.
     *     2. onlyRunInContainer: Refreshes whether is visible or not (might destroy all / create all, if needed). */
    modifySettings(settings: UIHostSettingsUpdate): void;

    // Getters.
    /** Get the root dom node (ours or by a nested boundary) - if has many, the first one (useful for insertion). */
    getRootDomNode(): Node | null;
    /** Get all the root dom nodes - might be many if used with a fragment.
     * - Optionally define whether to search in nested boundaries or not (by default does). */
    getRootDomNodes(inNestedBoundaries?: boolean): Node[];
    /** Get the first dom element by a selectors within the host (like document.querySelector). Should rarely be used, but it's here if needed. */
    queryDomElement<T extends Element = Element>(selectors: string, allowOverHosts?: boolean): T | null;
    /** Get dom elements by a selectors within the host (like document.querySelectorAll). Should rarely be used, but it's here if needed. */
    queryDomElements<T extends Element = Element>(selectors: string, maxCount?: number, allowOverHosts?: boolean): T[];
    /** Find all dom nodes by an optional validator. */
    findDomNodes<T extends Node = Node>(maxCount?: number, allowOverHosts?: boolean, validator?: (treeNode: UITreeNode) => any): T[];
    /** Find all boundaries by an optional validator. */
    findBoundaries(maxCount?: number, allowOverHosts?: boolean, validator?: (treeNode: UITreeNode) => any): UISourceBoundary[];
    /** Find all treeNodes by given types and an optional validator. */
    findTreeNodes(types: RecordableType<UITreeNodeType>, maxCount?: number, allowOverHosts?: boolean, validator?: (treeNode: UITreeNode) => any): UITreeNode[];

}
/** This is the main class to orchestrate and start rendering. */
export class UIHost extends _UIHostMixin(Object) { }

/** Create a new host and start rendering into it. */
export const createHost = (
    content?: UIRenderOutput,
    container?: HTMLElement | null,
    settings?: UIHostSettingsUpdate | null,
) => new UIHost(content, container, settings);

/** Call this to give basic UIHost features.
 * - For example: `class MyMix extends UIHostMixin(MyBase) {}`
 */
export const UIHostMixin = _UIHostMixin as ClassBaseMixer<UIHost>;
