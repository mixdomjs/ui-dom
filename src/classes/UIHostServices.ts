

// - Imports - //

import {
    UITreeNode,
    UISourceBoundaryChange,
    UIDomRenderInfo,
    UISourceBoundaryId,
    UILiveNewUpdates,
    UILiveUpdates,
    UIChangeInfos,
} from "../static/_Types";
import { _Apply } from "../static/_Apply";
import { UIRender } from "./UIRender";
import { UILiveSource, UISourceBoundary } from "./UIBoundary";
import { UIMini } from "./UIMini";
import { UIWiredType } from "./UIWired";
import { UIContext } from "./UIContext";
import { UIHost } from "./UIHost";


// - UIHostServices (the technical part) for UIHost  - //

export class UIHostServices {

    /** Ref up. This whole class could be in uiHost, but for internal clarity the more private and technical side is here. */
    private uiHost: UIHost;
    /** Dedicated rendering server. */
    private uiRender: UIRender;

    /** To create unique id (per uiHost) for each boundary, a simple counter is used. */
    private idCounter: number;

    // Update flow.
    private updateTimer: number | null;
    private delayedUpdates: Set<UISourceBoundary>;
    private _forceRenderTimeout?: number | null;
    private _isUpdating?: boolean;

    // Listeners.
    private listeners: Record<"update" | "render", (() => void)[]>;

    // Related to pending render infos and boundary calls (like uiDidMount and uiDidUpdate).
    private pendingTimer: number | null;
    private pendingBoundaryCalls: UISourceBoundaryChange[][];
    private pendingRenderInfos: UIDomRenderInfo[][];

    constructor(uiHost: UIHost) {
        this.uiHost = uiHost;
        this.uiRender = new UIRender(uiHost.settings);
        this.idCounter = 0;
        this.updateTimer = null;
        this.pendingTimer = null;
        this.pendingRenderInfos = [];
        this.pendingBoundaryCalls = [];
        this.delayedUpdates = new Set();
        this.listeners = {
            update: [],
            render: []
        };
    }


    // - Id & timers - //

    public createBoundaryId(): UISourceBoundaryId {
        const idCount = this.idCounter;
        this.idCounter++;
        return "q-" + idCount.toString();
    }

    public clearTimers(forgetPending: boolean = false): void {
        // Unless we are destroying the whole thing, it's best to (update and) render the pending changes into dom.
        if (!forgetPending)
            this.applyUpdates(null);
        // Clear update timer.
        if (this.updateTimer !== null) {
            window.clearTimeout(this.updateTimer);
            this.updateTimer = null;
        }
        // Clear render timer.
        if (this.pendingTimer !== null) {
            window.clearTimeout(this.pendingTimer);
            this.pendingTimer = null;
        }
    }

    // - Listeners - //

    public addListener(type: "update" | "render", callback: () => void): void {
        const listeners = this.listeners[type];
        const i = listeners.indexOf(callback);
        if (i !== -1)
            listeners[i] = callback;
        else
            listeners.push(callback)
    }

    public removeListener(type: "update" | "render", callback: () => void): void {
        const listeners = this.listeners[type];
        const i = listeners.indexOf(callback);
        if (i !== -1)
            listeners.splice(i, 1);
    }

    // - Context pass (host to host) - //

    public onContextPass(outerContexts: Record<string, UIContext | null>): void {
        // Prepare.
        const root = this.uiHost.rootBoundary;
        if (!root._outerContextsWere)
            root._outerContextsWere = root.outerContexts;
        root.outerContexts = { ...outerContexts };
        // Update contexts down.
        const collected = _Apply.afterOuterContexts(root);
        // Handle changes.
        for (const thruBoundary of collected) {
            // Was already updated.
            if (!thruBoundary._preUpdates)
                continue;
            // Update and collect.
            this.addToUpdates(thruBoundary, { contextual: true });
        }
        // Flush.
        this.applyUpdates();
    }

    // - Pending updates - //

    public removeFromUpdates(boundary: UISourceBoundary): void {
        this.delayedUpdates.delete(boundary);
    }

    public hasPending(updateSide: boolean = true, renderSide: boolean = true): boolean {
        return updateSide && this.updateTimer !== null || renderSide && this.updateTimer !== null || false;
    }

    /** This is the main method to update a boundary.
     * - It applies the updates to bookkeeping immediately.
     * - The actual update procedure is either timed out or immediate according to settings.
     *   .. It's recommended to use a tiny update timeout (eg. 0ms) to group multiple updates together. */
    public addToUpdates(boundary: UISourceBoundary, updates: UILiveNewUpdates, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {

        // Dead.
        if (boundary.isMounted === null)
            return;

        // Update temporary time out if given a tighter time.
        if (forceRenderTimeout !== undefined) {
            if ((forceRenderTimeout === null) || (this._forceRenderTimeout === undefined) || (this._forceRenderTimeout !== null) && (forceRenderTimeout < this._forceRenderTimeout) )
                this._forceRenderTimeout = forceRenderTimeout;
        }

        // Update the bookkeeping.
        _Apply.preSetUpdates(boundary, updates);

        // Is rendering, re-render immediately, and go no further.
        if (boundary._renderingState) {
            boundary._renderingState = "re-updated";
            return;
        }

        // Already was pending - nothing more to do.
        if (this.delayedUpdates.has(boundary))
            return;

        // Add to collection.
        this.delayedUpdates.add(boundary);

        // If is updating, just wait.
        if (this._isUpdating)
            return;

        // Refresh.
        this.refreshWithTimeout("update", forceUpdateTimeout);
    }

    /** This method should always be used when executing updates within a uiHost - it's the main orchestrator of updates.
     * To add to pending updates use the .addToUpdates() method above. */
    private applyUpdates(renderTimeout?: number | null) {

        // Set flags.
        this.updateTimer = null;
        this._isUpdating = true;
        // Get render timeout.
        renderTimeout = renderTimeout !== undefined ? renderTimeout : (this._forceRenderTimeout !== undefined ? this._forceRenderTimeout : this.uiHost.settings.renderTimeout);
        delete this._forceRenderTimeout;

        // Update again immediately, if new ones collected.
        while (this.delayedUpdates.size) {

            // Copy and clear delayed, so can add new during.
            let sortedUpdates = [...this.delayedUpdates];
            this.delayedUpdates.clear();

            // Do smart sorting here if has at least 2 boundaries.
            if (sortedUpdates[1])
                _Apply.sortBoundaries(sortedUpdates);

            // Collect output.
            let renderInfos: UIDomRenderInfo[] = [];
            let boundaryUpdates: UISourceBoundaryChange[] = [];

            // Run update for each.
            for (const boundary of sortedUpdates) {
                const updates = this.updateSourceBoundary(boundary);
                if (updates) {
                    renderInfos = renderInfos.concat(updates[0]);
                    boundaryUpdates = boundaryUpdates.concat(updates[1]);
                }
            }

            // Add to post pending.
            if (renderInfos[0])
                this.pendingRenderInfos.push(renderInfos);
            if (boundaryUpdates[0]) {
                if (this.uiHost.settings.uiDidImmediateCalls)
                    _Apply.callBoundaryChanges(boundaryUpdates);
                else
                    this.pendingBoundaryCalls.push(boundaryUpdates);
            }
        }

        // Call listeners.
        if (this.listeners.update[0])
            for (const listener of this.listeners.update)
                listener();

        // Render.
        this.refreshWithTimeout("render", renderTimeout);

        // Finished.
        delete this._isUpdating;
    }

    /** This is the core whole command to update a source boundary including checking if it should update and if has already been updated.
     * - It handles the _preUpdates bookkeeping and should update checking and return infos for changes.
     * - It should only be called from a few places: 1. applyUpdates flow above, 2. within _Apply.applyDefPairs for updating nested, 3. _Apply.updateInterested for updating indirectly interested sub boundaries. */
    public updateSourceBoundary(boundary: UISourceBoundary, forceUpdate: boolean | "all" = false, movedNodes?: UITreeNode[], bInterested?: UISourceBoundary[]): UIChangeInfos | null {

        // Parse.
        let shouldUpdate = !!forceUpdate;
        let forceNested = forceUpdate === "all";
        let renderInfos: UIDomRenderInfo[] = [];
        let boundaryChanges: UISourceBoundaryChange[] = [];
        const cApi = boundary.contextApi;
        const doLocalInterests = !bInterested;
        if (!bInterested)
            bInterested = [];

        // Prepare mount run.
        if (!boundary.isMounted) {
            // Has been destroyed - shouldn't happen.
            if (boundary.isMounted === null)
                return null;
            // On mount.
            boundaryChanges.push( [boundary, "mounted"] );
            shouldUpdate = true;
        }

        // Prepare update run.
        else {
            // Has already been updated.
            let _preUpdates = boundary._preUpdates;
            if (!_preUpdates) {
                if (!forceUpdate)
                    return null;
                _preUpdates = {};
            }
            // Prepare.
            const preUpdates: UILiveUpdates = {};
            const newUpdates: UILiveUpdates = {};
            // Handle props.
            if (_preUpdates.props) {
                preUpdates.props = _preUpdates.props;
                newUpdates.props = boundary._outerDef.props;
            }
            // Live component.
            const live = boundary.live;
            if (live && cApi) {
                // State.
                if (_preUpdates.state) {
                    preUpdates.state = _preUpdates.state;
                    newUpdates.state = live.state;
                }
                // Context.
                if (_preUpdates.contextual) {
                    // Set to pre updates.
                    preUpdates.context = live.context;
                    // Rebuild live context.
                    cApi.rebuildContext();
                    // Set to new updates.
                    newUpdates.context = live.context;
                }
            }
            // Update flags.
            if (_preUpdates.force) {
                shouldUpdate = true;
                if (_preUpdates.force === "all")
                    forceNested = true;
            }
            // Check if should update.
            else if (!shouldUpdate) {
                // Run shouldUpdate check for live / mini.
                let preShould: boolean | null = null;
                if (live) {
                    if (live.uiShouldUpdate)
                        preShould = live.uiShouldUpdate( preUpdates, newUpdates );
                }
                else if (boundary.mini) {
                    // If has children changed, always for mini.
                    if (preUpdates.children && preUpdates.children !== newUpdates.children)
                        preShould = true;
                    // Otherwise check by the optional callback - supporting MiniWired special case.
                    else {
                        const mini = boundary.mini.shouldUpdate ? boundary.mini as UIMini : boundary.type === "mini" && boundary.mini.constructor as (UIWiredType | null);
                        if (mini && mini.shouldUpdate)
                            preShould = mini.shouldUpdate( preUpdates.props || null, newUpdates.props || null );
                    }
                }
                // Run by background system.
                if (preShould === true || preShould === null && _Apply.shouldUpdateBy(boundary, preUpdates, newUpdates))
                    shouldUpdate = true;
            }
            // Set call mode.
            const wasMoved = boundary._outerDef.action === "moved";
            const mode = wasMoved ? (shouldUpdate ? "updated-n-moved" : "moved") : (shouldUpdate ? "updated" : "");
            if (mode)
                boundaryChanges.push([boundary, mode, preUpdates, newUpdates]);
            // Was moved.
            if (wasMoved) {
                // Mark to any contexts that should refresh order.
                if (cApi) {
                    const contexts = cApi.getContexts();
                    for (const name in contexts) {
                        const ctx = contexts[name];
                        if (ctx)
                            ctx.services.onBoundaryMove(boundary as UILiveSource, name);
                    }
                }
                // For clarity and robustness, we collect the render infos here for move, as we collect the boundary for move here, too.
                // .. However, to support the flow of .applyDefPairs we also support an optional .movedNodes array to prevent doubles.
                for (const node of _Apply.getTreeNodesForDomRootsUnder(boundary.baseTreeNode, true, true)) {
                    if (movedNodes) {
                        if (movedNodes.indexOf(node) !== -1)
                            continue;
                        movedNodes.push(node);
                    }
                    renderInfos.push({ treeNode: node, move: true });
                }
            }
            // Clear.
            delete boundary._preUpdates;

            // Pre mark wired updates.
            const allWired: Set<UIWiredType> | null = boundary.live && boundary.live.wired || null;
            if (allWired) {
                for (const Wired of allWired) {
                    // Build new props - without doing the refresh (we'll do it below, if needed).
                    const propsWere = Wired.props;
                    Wired.refresh(false);
                    // Skip if stays the same - the builder has returned the lastProps on purpose.
                    if (propsWere === Wired.props)
                        continue;
                    // Collect interested.
                    for (const b of Wired.instanced) {
                        // Mark forced pre-interests.
                        // .. It's as if there's a "black box" inside the wired renderer, we don't know how it'll react - so we must force update.
                        if (!b._preUpdates)
                            b._preUpdates = {};
                        if (!b._preUpdates.force)
                            b._preUpdates.force = true;
                        // Add to interested.
                        if (bInterested.indexOf(b) === -1)
                            bInterested.push(b);
                    }
                }
            }

            // Call uiBeforeUpdate.
            if (live)
                live.uiBeforeUpdate && live.uiBeforeUpdate(preUpdates, newUpdates, shouldUpdate);
            // else if (boundary.mini) {
            //     const mini = boundary.mini.beforeUpdate ? boundary.mini as UIMini : boundary.type === "mini" && boundary.mini.constructor as (UIWiredType || null);
            //     if (mini && mini.beforeUpdate)
            //         mini.beforeUpdate(preUpdates.props || null, newUpdates.props || null, shouldUpdate);
            // }
        }

        // Run the update routine.
        if (shouldUpdate) {
            const [rInfos, bUpdates] = _Apply.runBoundaryUpdate(boundary, forceNested);
            renderInfos = renderInfos.concat(rInfos);
            boundaryChanges = boundaryChanges.concat(bUpdates);
        }

        // Update interests wirings.
        if (doLocalInterests && bInterested[0]) {
            const uInfos = _Apply.updateInterested(bInterested, true); // Do sort - the tree order of wired instances is unknown and might change.
            renderInfos = renderInfos.concat(uInfos[0]);
            boundaryChanges = boundaryChanges.concat(uInfos[1]);
        }

        // Return infos.
        return (renderInfos[0] || boundaryChanges[0]) ? [ renderInfos, boundaryChanges ] : null;

    }


    // - Post pending - //

    public addToPostPending(renderInfos: UIDomRenderInfo[] | null, boundaryChanges?: UISourceBoundaryChange[] | null, forceRenderTimeout?: number | null) {
        // Add rendering to pending.
        if (renderInfos)
            this.pendingRenderInfos.push(renderInfos);
        // Add boundary calls.
        if (boundaryChanges) {
            // Immediately.
            if (this.uiHost.settings.uiDidImmediateCalls)
                _Apply.callBoundaryChanges(boundaryChanges);
            // After rendering.
            else
                this.pendingBoundaryCalls.push(boundaryChanges);
        }
        // Refresh.
        this.refreshWithTimeout("render", forceRenderTimeout);
    }

    private applyPostPending() {
        // Clear timer ref.
        this.pendingTimer = null;
        // Render infos.
        for (const renderInfos of this.pendingRenderInfos)
            if (renderInfos[0])
                this.uiRender.applyToDom(renderInfos);
        this.pendingRenderInfos = [];
        // Boundary changes.
        for (const boundaryChanges of this.pendingBoundaryCalls)
            if (boundaryChanges[0])
                _Apply.callBoundaryChanges(boundaryChanges);
        this.pendingBoundaryCalls = [];
        // Call listeners.
        if (this.listeners.render[0])
            for (const listener of this.listeners.render)
                listener();
    }

    private refreshWithTimeout(side: "update" | "render", forceTimeout?: number | null) {
        if (side === "update")
            this.updateTimer = _Apply.refreshWithTimeout(this, this.applyUpdates, this.updateTimer, this.uiHost.settings.updateTimeout, forceTimeout);
        else
            this.pendingTimer = _Apply.refreshWithTimeout(this, this.applyPostPending, this.pendingTimer, this.uiHost.settings.renderTimeout, forceTimeout);
    }

}
