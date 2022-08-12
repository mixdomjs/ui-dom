

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

    // Listeners.
    private listeners: Record<"update" | "render", (() => void)[]>;

    // Update flow.
    private updateTimer: number | null;
    private updatesPending: Set<UISourceBoundary>;
    private _isUpdating?: boolean;
    private _forcePostTimeout?: number | null;

    // Post flow: execute render infos and boundary calls (eg. uiDidMount and uiDidUpdate).
    private renderTimer: number | null;
    private postBoundaryCalls: UISourceBoundaryChange[][];
    private postRenderInfos: UIDomRenderInfo[][];

    constructor(uiHost: UIHost) {
        this.uiHost = uiHost;
        this.uiRender = new UIRender(uiHost.settings);
        this.idCounter = 0;
        this.updateTimer = null;
        this.renderTimer = null;
        this.updatesPending = new Set();
        this.postRenderInfos = [];
        this.postBoundaryCalls = [];
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
        // Unless we are destroying the whole thing, it's best to (update and) render the post changes into dom.
        if (!forgetPending)
            this.runUpdates(null);
        // Clear update timer.
        if (this.updateTimer !== null) {
            window.clearTimeout(this.updateTimer);
            this.updateTimer = null;
        }
        // Clear render timer.
        if (this.renderTimer !== null) {
            window.clearTimeout(this.renderTimer);
            this.renderTimer = null;
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
            this.absorbUpdates(thruBoundary, { contextual: true });
        }
        // Flush.
        this.runUpdates();
    }

    // - Has pending updates or post process - //

    public hasPending(updateSide: boolean = true, postSide: boolean = true): boolean {
        return updateSide && this.updateTimer !== null || postSide && this.renderTimer !== null || false;
    }

    // - 1. Update flow - //

    public cancelUpdates(boundary: UISourceBoundary): void {
        this.updatesPending.delete(boundary);
    }

    /** This is the main method to update a boundary.
     * - It applies the updates to bookkeeping immediately.
     * - The actual update procedure is either timed out or immediate according to settings.
     *   .. It's recommended to use a tiny update timeout (eg. 0ms) to group multiple updates together. */
    public absorbUpdates(boundary: UISourceBoundary, updates: UILiveNewUpdates, forceUpdateTimeout?: number | null, forcePostTimeout?: number | null): void {

        // Dead.
        if (boundary.isMounted === null)
            return;

        // Update temporary time out if given a tighter time.
        if (forcePostTimeout !== undefined) {
            if ((forcePostTimeout === null) || (this._forcePostTimeout === undefined) || (this._forcePostTimeout !== null) && (forcePostTimeout < this._forcePostTimeout) )
                this._forcePostTimeout = forcePostTimeout;
        }

        // Update the bookkeeping.
        _Apply.preSetUpdates(boundary, updates);

        // Is rendering, re-render immediately, and go no further.
        if (boundary._renderState) {
            boundary._renderState = "re-updated";
            return;
        }

        // Already was post - nothing more to do.
        if (this.updatesPending.has(boundary))
            return;

        // Add to collection.
        this.updatesPending.add(boundary);

        // If is updating, just wait.
        if (this._isUpdating)
            return;

        // Refresh.
        this.refreshWithTimeout("update", forceUpdateTimeout);
    }

    /** This method should always be used when executing updates within a uiHost - it's the main orchestrator of updates.
     * To add to post updates use the .absorbUpdates() method above. */
    private runUpdates(postTimeout?: number | null) {

        // Set flags.
        this.updateTimer = null;
        this._isUpdating = true;
        // Get render timeout.
        postTimeout = postTimeout !== undefined ? postTimeout : (this._forcePostTimeout !== undefined ? this._forcePostTimeout : this.uiHost.settings.renderTimeout);
        delete this._forcePostTimeout;

        // Update again immediately, if new ones collected.
        while (this.updatesPending.size) {

            // Copy and clear delayed, so can add new during.
            let sortedUpdates = [...this.updatesPending];
            this.updatesPending.clear();

            // Do smart sorting here if has at least 2 boundaries.
            if (sortedUpdates[1])
                _Apply.sortBoundaries(sortedUpdates);

            // Collect output.
            let renderInfos: UIDomRenderInfo[] = [];
            let boundaryUpdates: UISourceBoundaryChange[] = [];

            // Run update for each.
            for (const boundary of sortedUpdates) {
                const updates = this.updateBoundary(boundary);
                if (updates) {
                    renderInfos = renderInfos.concat(updates[0]);
                    boundaryUpdates = boundaryUpdates.concat(updates[1]);
                }
            }

            // Add to post post.
            if (renderInfos[0])
                this.postRenderInfos.push(renderInfos);
            if (boundaryUpdates[0]) {
                if (this.uiHost.settings.uiDidImmediateCalls)
                    _Apply.callBoundaryChanges(boundaryUpdates);
                else
                    this.postBoundaryCalls.push(boundaryUpdates);
            }
        }

        // Call listeners.
        if (this.listeners.update[0])
            for (const listener of this.listeners.update)
                listener();

        // Render.
        this.refreshWithTimeout("render", postTimeout);

        // Finished.
        delete this._isUpdating;
    }

    /** This is the core whole command to update a source boundary including checking if it should update and if has already been updated.
     * - It handles the _preUpdates bookkeeping and should update checking and return infos for changes.
     * - It should only be called from a few places: 1. runUpdates flow above, 2. within _Apply.applyDefPairs for updating nested, 3. _Apply.updateInterested for updating indirectly interested sub boundaries. */
    public updateBoundary(boundary: UISourceBoundary, forceUpdate: boolean | "all" = false, movedNodes?: UITreeNode[], bInterested?: UISourceBoundary[]): UIChangeInfos | null {

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
                // Remote.
                if (_preUpdates.contextual) {
                    // Set to pre updates.
                    preUpdates.remote = live.remote;
                    // Rebuild live context.
                    cApi.rebuildRemote();
                    // Set to new updates.
                    newUpdates.remote = live.remote;
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
                    for (const b of Wired.boundaries) {
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


    // - 2. Post process flow - //

    public absorbChanges(renderInfos: UIDomRenderInfo[] | null, boundaryChanges?: UISourceBoundaryChange[] | null, forcePostTimeout?: number | null) {
        // Add rendering to post.
        if (renderInfos)
            this.postRenderInfos.push(renderInfos);
        // Add boundary calls.
        if (boundaryChanges) {
            // Immediately.
            if (this.uiHost.settings.uiDidImmediateCalls)
                _Apply.callBoundaryChanges(boundaryChanges);
            // After rendering.
            else
                this.postBoundaryCalls.push(boundaryChanges);
        }
        // Refresh.
        this.refreshWithTimeout("render", forcePostTimeout);
    }

    private flushRender() {
        // Clear timer ref.
        this.renderTimer = null;
        // Render infos.
        for (const renderInfos of this.postRenderInfos)
            if (renderInfos[0])
                this.uiRender.applyToDom(renderInfos);
        this.postRenderInfos = [];
        // Boundary changes.
        for (const boundaryChanges of this.postBoundaryCalls)
            if (boundaryChanges[0])
                _Apply.callBoundaryChanges(boundaryChanges);
        this.postBoundaryCalls = [];
        // Call listeners.
        if (this.listeners.render[0])
            for (const listener of this.listeners.render)
                listener();
    }


    // - Helper - //

    private refreshWithTimeout(side: "update" | "render", forceTimeout?: number | null) {
        if (side === "update")
            this.updateTimer = _Apply.refreshWithTimeout(this, this.runUpdates, this.updateTimer, this.uiHost.settings.updateTimeout, forceTimeout);
        else
            this.renderTimer = _Apply.refreshWithTimeout(this, this.flushRender, this.renderTimer, this.uiHost.settings.renderTimeout, forceTimeout);
    }

}
