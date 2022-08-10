

// - Imports - //

import {
    GroundedTreeNode,
    UIDomRenderInfo,
    UIRenderOutput,
    UIHostSettingsUpdate,
    RecordableType,
    GroundedTreeNodeType,
    UIHostSettings,
    UIDefTarget,
    GroundedTreeNodeDom,
    GroundedTreeNodeBoundary,
    ClassType,
} from "../static/_Types";
import { _Lib } from "../static/_Lib";
import { _Defs } from "../static/_Defs";
import { _Apply } from "../static/_Apply";
import { UISourceBoundary } from "./UIBoundary";
import { UILive } from "./UILive";
import { UIHostServices } from "./UIHostServices";


// - uiDom.Host - //

export function UIHostMixin(Base: ClassType) {

    return class _UIHost extends Base {

        public static UI_DOM_TYPE = "Host";

        /** This represents abstractly what the final outcome looks like in dom.
         * .. Each GroundedTreeNode represents a domNode in the final dom.
         * .. So if you gNode.domNode.parentNode === gNode.parent?.domNode.
         */
        public groundedTree: GroundedTreeNode;
        public rootBoundary: UISourceBoundary;
        /** The general settings for this uiHost instance.
         * - Do not modify directly, use the .modifySettings method instead.
         * - Otherwise rendering might have old settings, or setting.onlyRunInContainer might be uncaptured. */
        public settings: UIHostSettings;

        /** Internal services to keep the whole thing together and synchronized.
         * They are the semi-private internal part of UIHost, so separated into its own class. */
        services: UIHostServices;

        // State.
        targetDef: UIDefTarget | null;
        isDisabled?: true;


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

            // Create first def.
            this.targetDef = _Defs.createDefFromContent(content);
            // Create a root boundary that will render our targetDef or null if disabled.
            const Root = () => this.isDisabled ? null : this.targetDef;
            // Create base tree node for the root boundary.
            const sourceDef = _Defs.newAppliedDefBy({ _uiDefType: "boundary", tag: Root, props: {}, childDefs: [] }, null);
            const baseTreeNode: GroundedTreeNodeBoundary = {
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
            this.groundedTree.children.push(baseTreeNode);
            // Create boundary.
            this.rootBoundary = new UISourceBoundary(this, sourceDef, baseTreeNode);
            if (this.rootBoundary.mini)
                this.rootBoundary.mini.updateMode = "always";
            baseTreeNode.boundary = this.rootBoundary;
            // Run updates.
            this.services.addToUpdates(this.rootBoundary, {});
        }

        // - Listeners - //

        public addListener(type: "render" | "update", callback: () => void): void {
            this.services.addListener(type, callback);
        }
        public removeListener(type: "render" | "update", callback: () => void): void {
            this.services.removeListener(type, callback);
        }

        // - Basic api - //

        public renderWith(content: UIRenderOutput, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
            // Create a def for the root class with given props and contents.
            // .. We have a class, so we know won't be empty.
            this.targetDef = _Defs.createDefFromContent(content);
            // Restart.
            this.rootBoundary.update(true, forceUpdateTimeout, forceRenderTimeout);
        }

        public clearContents(update: boolean = true, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
            // Clear timers.
            this.services.clearTimers(true);
            // Clear target.
            this.targetDef = null;
            // Update.
            if (update)
                this.rootBoundary.update(true, forceUpdateTimeout, forceRenderTimeout);
        }

        public modifySettings(settings: UIHostSettingsUpdate) {
            // Collect state before.
            const onlyRunWas = this.settings.onlyRunInContainer;
            const welcomeCtxsWas = this.settings.welcomeContextsUpRoot;
            // Do changes.
            UIHost.modifySettings(this.settings, settings);
            // For special changes.
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


        // - Refresh - //

        /** This is useful for refreshing the container. */
        public refresh(forceUpdate: boolean = false, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null) {
            // Update state.
            const wasEnabled = !this.isDisabled;
            const shouldRun = !(this.settings.onlyRunInContainer && !this.groundedTree.domNode && !this.groundedTree.parent);
            shouldRun ? delete this.isDisabled : this.isDisabled = true;
            // Force update: create / destroy.
            if (forceUpdate || !shouldRun || !wasEnabled)
                this.rootBoundary.update(true, forceUpdateTimeout, forceRenderTimeout);
            // Do moving.
            else if (shouldRun && wasEnabled) {
                // Get its root nodes.
                const rHostInfos = this.rootBoundary ? this.rootBoundary.getTreeNodesForDomRoots(true).map(treeNode => ({ treeNode, move: true }) as UIDomRenderInfo) : [];
                // Trigger render immediately - and regardless of whether had info (it's needed for a potential hosting host).
                this.services.addToPostPending(rHostInfos, null, forceRenderTimeout);
            }
        }

        /** This performs a "refresh-render".
         * .. In case forceDomRead is on will actually read from dom to look for real changes to be done. */
        public refreshRender(forceDomRead: boolean = false, forceRenderTimeout?: number | null) {
            // Go through the GroundedTreeNode structure and refresh each.
            const refresh = forceDomRead ? "read" : true;
            const renderInfos: UIDomRenderInfo[] = [];
            let nextNodes = [...this.groundedTree.children] as GroundedTreeNodeDom[];
            let treeNode: GroundedTreeNodeDom | undefined;
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
                    nextNodes = treeNode.children.concat(nextNodes.slice(i)) as GroundedTreeNodeDom[];
                    i = 0;
                }
            }
            // Render.
            this.services.addToPostPending(renderInfos, null, forceRenderTimeout);
        }

        public moveInto(parent: Node | null, forceRenderTimeout?: number | null) {
            // Already there.
            if (this.groundedTree.domNode === parent)
                return;
            // Update.
            this.groundedTree.domNode = parent;
            // Create render infos.
            const renderInfos = this.rootBoundary.getTreeNodesForDomRoots(true).map(treeNode => ({ treeNode, move: true }) as UIDomRenderInfo);
            // Trigger render.
            if (renderInfos[0] || (forceRenderTimeout !== undefined))
                this.services.addToPostPending(renderInfos, null, forceRenderTimeout);
        }


        // - Getters - //

        public getRootDomNode(): Node | null {
            return this.rootBoundary && this.rootBoundary.baseTreeNode.domNode;
        }

        public getRootDomNodes(inNestedBoundaries: boolean = true): Node[] {
            return this.rootBoundary ? _Apply.getTreeNodesForDomRootsUnder(this.rootBoundary.baseTreeNode, inNestedBoundaries, false).map(treeNode => treeNode.domNode) as Node[] : [];
        }

        public queryDomElement<T extends Element = Element>(selector: string, allowOverHosts: boolean = false): T | null {
            return UILive.queryDomElement<T>(this.groundedTree, selector, true, allowOverHosts);
        }

        public queryDomElements<T extends Element = Element>(selector: string, maxCount: number = 0, allowOverHosts: boolean = false): T[] {
            return UILive.queryDomElements<T>(this.groundedTree, selector, maxCount, true, allowOverHosts);
        }

        public findDomNodes<T extends Node = Node>(maxCount: number = 0, allowOverHosts: boolean = false, validator?: (treeNode: GroundedTreeNode) => any): T[] {
            return _Apply.findTreeNodesWithin(this.groundedTree, { dom: true }, maxCount, true, allowOverHosts, validator).map(tNode => tNode.domNode) as T[];
        }

        public findBoundaries(maxCount: number = 0, allowOverHosts: boolean = false, validator?: (treeNode: GroundedTreeNode) => any): UISourceBoundary[] {
            return _Apply.findTreeNodesWithin(this.groundedTree, { boundary: true }, maxCount, true, allowOverHosts, validator).map(tNode => tNode.boundary) as UISourceBoundary[];
        }

        public findTreeNodes(types: RecordableType<GroundedTreeNodeType>, maxCount: number = 0, allowOverHosts: boolean = false, validator?: (treeNode: GroundedTreeNode) => any): GroundedTreeNode[] {
            return _Apply.findTreeNodesWithin(this.groundedTree, _Lib.buildRecordable<GroundedTreeNodeType>(types), maxCount, true, allowOverHosts, validator);
        }


        // - Static - //

        static modifySettings(baseSettings: UIHostSettings, updates: UIHostSettingsUpdate): boolean {
            let didChange = false;
            // Special case.
            if (updates.updateLiveModes) {
                for (const prop in updates.updateLiveModes) {
                    const val = updates.updateLiveModes[prop];
                    if (typeof val === "string") {
                        baseSettings.updateLiveModes[prop] = val;
                        didChange = true;
                    }
                }
            }
            // Update simple values.
            for (const prop in updates) {
                const val = updates[prop];
                const type = typeof val;
                if ((val === null) || (type === "boolean") || (type === "string") || (type === "number")) {
                    baseSettings[prop] = val;
                    didChange = true;
                }
            }
            return didChange;
        }

        static getDefaultSettings(settings?: UIHostSettingsUpdate | null): UIHostSettings {
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
                    context: "shallow",
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
                renderInnerHtmlTag: "span",
                renderTextContent: null,
                renderSvgNamespaceUri: "http://www.w3.org/2000/svg",
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

    /** This represents abstractly what the final outcome looks like in dom.
     * .. Each GroundedTreeNode represents a domNode in the final dom.
     * .. So if you gNode.domNode.parentNode === gNode.parent?.domNode. */
    groundedTree: GroundedTreeNode;
    rootBoundary: UISourceBoundary;
    /** Internal services to keep the whole thing together and synchronized.
     * They are the private internal part of uiHost, so separated into its own class. */
    services: UIHostServices;
    settings: UIHostSettings;

    // State.
    targetDef: UIDefTarget | null;
    isDisabled?: true;

    // Basic methods.
    modifySettings(settings: UIHostSettingsUpdate): void;
    renderWith(...contents: UIRenderOutput[]): void;
    clearContents(update?: boolean, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    refresh(forceUpdate?: boolean, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    refreshRender(forceDomRead?: boolean, forceRenderTimeout?: number | null): void;
    moveInto(parent: Node | null, forceRenderTimeout?: number | null): void;

    // Getters.
    getRootDomNode(): Node | null;
    getRootDomNodes(inNestedBoundaries?: boolean): Node[];
    queryDomElement<T extends Element = Element>(selector: string, allowOverHosts?: boolean): T | null;
    queryDomElements<T extends Element = Element>(selector: string, maxCount?: number, allowOverHosts?: boolean): T[];
    findDomNodes<T extends Node = Node>(maxCount?: number, allowOverHosts?: boolean, validator?: (treeNode: GroundedTreeNode) => any): T[];
    findBoundaries(maxCount?: number, allowOverHosts?: boolean, validator?: (treeNode: GroundedTreeNode) => any): UISourceBoundary[];
    findTreeNodes(types: RecordableType<GroundedTreeNodeType>, maxCount?: number, allowOverHosts?: boolean, validator?: (treeNode: GroundedTreeNode) => any): GroundedTreeNode[];

}
/** This is the main class to orchestrate and start rendering. */
export class UIHost extends UIHostMixin(Object) { }
export type UIHostType = {
    new (content?: UIRenderOutput, domContainer?: Node | null, settings?: UIHostSettingsUpdate | null): UIHost;
    readonly UI_DOM_TYPE: "Host";
    modifySettings(baseSettings: UIHostSettings, updates: UIHostSettingsUpdate): boolean;
    getDefaultSettings(settings?: UIHostSettingsUpdate | null): UIHostSettings;
}

export const createHost = (
    content?: UIRenderOutput,
    container?: HTMLElement | null,
    settings?: UIHostSettingsUpdate | null,
) => new UIHost(content, container, settings);
