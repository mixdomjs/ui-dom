

// - Imports - //

import {
    UIActions,
    UIQuestion,
    UIQuestionary,
    UIContextRefresh
} from "../static/_Types";
import { _Apply } from "../static/_Apply";
import { _Lib } from "../static/_Lib";
import { UILiveBoundary, UISourceBoundary } from "./UIBoundary";
import { UIHost } from "./UIHost";
import { UILive } from "./UILive";
import { UIContext } from "./UIContext";


// - UIContextServices - //

export class UIContextServices {


    // - Members & construct - //

    // The UIContext instance we serve.
    private uiContext: UIContext;

    // Private refreshing info.
    private pendingTimer: number | null;
    private pendingKeys: string[] | true | null;
    private mainActions: UIActions[] | null;
    private postActions: UIActions[] | null;
    private dirtyOrder: UIContextRefresh;
    /** Actions delayed by host refreshes. */
    private delayedActions?: [ Set<UIHost>, UIActions[] ][];

    constructor(uiContext: UIContext) {
        this.uiContext = uiContext;
        // Private.
        this.pendingTimer = null;
        this.pendingKeys = null;
        this.mainActions = null;
        this.postActions = null;
        this.dirtyOrder = 0;
    }


    // - Main api - //

    /** Sends the given action through the context by default timeout.
     * - Before the action goes further, any actionHandlers can cancel it or mark it as a post action (= happens after update-n-render cycle).
     * - If asPostAction given, will ignore what .postActions and .actionHandlers would say about whether is postAction or not.
     * - Note that this should not be used for questions. */
    public sendAction(action: UIActions & { value?: never; }, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void {
        // Invalid.
        if (!action.type)
            return;
        // Call pre listeners and allow any of them to cancel or postpone the action.
        let didMod = this.preHandleAction(action);
        // Handle.
        const s = this.uiContext.settings;
        if (didMod !== "cancel") {
            // Prepare.
            if (asAction)
                didMod = asAction;
            // Add to post actions.
            if (didMod === "post" || s.postActions && s.postActions.has(action.type)) {
                if (!this.postActions)
                    this.postActions = [];
                this.postActions.push(action);
            }
            // Run immediately as a quick action.
            else if (didMod === "quick" || (s.quickActions === true || s.quickActions && s.quickActions.has(action.type)))
                this.runAction(action);
            // Normal - run on the refresh cycle.
            else {
                if (!this.mainActions)
                    this.mainActions = [];
                this.mainActions.push(action);
            }
        }
        // Trigger refreshing (even if for nothing) in any case. (It might be expected externally.)
        this.applyRefresh(s.refreshTimeout, forceTimeout);
    }

    /** Ask a question. The answer will be added into the question with "value" key. */
    public askQuestion(que: UIActions & (UIQuestion | UIQuestionary), maxCount: number = 0): void {
        // For logging.
        this.preHandleAction(que, true);
        // Run the question.
        this.runAction(que, null, true, maxCount);
    }

    /** Refresh the context. Uses the default timing unless specified. */
    public applyRefresh(defaultTimeout: number | null, forceTimeout?: number | null): void {
        this.pendingTimer = _Lib.refreshWithTimeout(this, this.refreshPending, this.pendingTimer, defaultTimeout, forceTimeout);
    }

    /** This refreshes the context immediately.
     * - This is assumed to be called only by the .refresh function above.
     * - So it will mark the timer as cleared, without using window.clearTimeout for it. */
    private refreshPending(): void {
        // Get and clear.
        let mainActions = this.mainActions;
        let postActions = this.postActions;
        const refreshKeys = this.pendingKeys;
        this.pendingTimer = null;
        this.pendingKeys = null;
        this.mainActions = null;
        this.postActions = null;
        // Prepare post action hosts.
        const postHosts: Set<UIHost> = new Set();
        const pHosts = postActions ? postHosts : null;
        // Call actions on boundaries.
        if (mainActions) {
            for (const action of mainActions)
                this.runAction(action, pHosts);
        }
        // Call refresh on boundaries.
        if (refreshKeys)
            this.runData(refreshKeys, pHosts);
        // Trigger updates for post hosts.
        if (postActions) {
            for (const host of [...postHosts]) {
                // If has anything pending, wait until rendered out.
                if (host.services.hasPending()) {
                    const args = [ host ];
                    const listener = this.onHostRender.bind(this, args);
                    args.push(listener);
                    host.services.addListener("render", listener);
                }
                // Otherwise no need.
                else
                    postHosts.delete(host);
            }
            // Add to pending.
            if (!this.delayedActions)
                this.delayedActions = [];
            this.delayedActions.push([postHosts, postActions]);
            // Run immediately.
            if (!postHosts.size)
                this.onHostRender();
        }
    }

    public onHostRender(byHostInfo?: [host: UIHost, listener: () => void] ): void {
        // Remove listener - it's one shot only.
        let host: UIHost | null = null;
        if (byHostInfo) {
            host = byHostInfo[0];
            host.services.removeListener("render", byHostInfo[1]);
        }
        // Stored .delayedActions are required.
        const all = this.delayedActions;
        if (!all)
            return;
        // Loop each set, and run and remove if finished.
        let iSet = -1;
        for (const [ hosts, actions ] of [...all]) {
            // Next.
            iSet++;
            // Remove.
            if (host)
                hosts.delete(host);
            // Finished totally.
            // .. Note that might have been 0 all along, if no host had pending updates.
            if (!hosts.size) {
                all.splice(iSet--, 1);
                for (const action of actions)
                    this.runAction(action);
            }
        }
        // Remove if all finished.
        if (!all[0])
            delete this.delayedActions;
    }

    /** Note that this only adds the refresh keys but will not refresh. If you also want to refresh use .refresh(refreshKeys) instead. */
    public addRefreshKeys(refreshKeys?: string | string[] | boolean): void {
        // Set to all.
        if (refreshKeys === true)
            this.pendingKeys = true;
        // Add given.
        else if (refreshKeys && (this.pendingKeys !== true)) {
            // Into array.
            if (typeof refreshKeys === "string")
                refreshKeys = [ refreshKeys ];
            // Set.
            if (!this.pendingKeys)
                this.pendingKeys = [...refreshKeys];
            // Add if weren't there already.
            else {
                for (const key of refreshKeys)
                    if (this.pendingKeys.indexOf(key) === -1)
                        this.pendingKeys.push(key);
            }
        }
    }


    // - Internal - //

    /** Run the data about for given boundaries and listeners. */
    private runData(refreshKeys: string[] | true, collectPostHosts?: Set<UIHost> | null): void {
        // Sort.
        const ctx = this.uiContext;
        let dataBoundaries = ctx.dataBoundaries;
        if ((this.dirtyOrder & UIContextRefresh.Data) && dataBoundaries.size > 1)
            ctx.dataBoundaries = dataBoundaries = UIContextServices.sortCollection(dataBoundaries);
        this.dirtyOrder &= ~UIContextRefresh.Data;
        // Loop all boundaries.
        for (const [b, ctxNames] of dataBoundaries) {
            // Add to hosts for post actions.
            if (collectPostHosts)
                collectPostHosts.add(b.uiHost);
            // Loop the ctxNames the context occupies (typically only one - but for flexible support).
            for (const name of ctxNames) {
                // If either side has refreshKeys === true, then no need to check the key matches.
                let doesNeed = refreshKeys === true;
                if (!doesNeed) {
                    // Check if needs.
                    const ctxNeeds = b.contextApi.contextNeeds.get(name);
                    if (ctxNeeds === true)
                        doesNeed = true;
                    else if (ctxNeeds) {
                        // Check by keywords. For large contexts, this can often cull out most.
                        for (const key of refreshKeys as string[]) {
                            if (ctxNeeds.some(need => need === key || need.startsWith(key + "."))) {
                                doesNeed = true;
                                break;
                            }
                        }
                    }
                }
                // Needs.
                if (doesNeed) {
                    b.uiHost.services.absorbUpdates(b as UISourceBoundary, { contextual: true });
                    break;
                }
            }
        }
        // External listeners.
        if (ctx.dataListeners.size) {
            for (const [func, needs] of ctx.dataListeners) {
                let doesNeed = false;
                if (needs === true || refreshKeys === true)
                    doesNeed = true;
                else {
                    const needsArr = [...needs];
                    for (const key of refreshKeys) {
                        if (needsArr.some(need => need === key || need.startsWith(key + "."))) {
                            doesNeed = true;
                            break;
                        }
                    }
                }
                if (doesNeed)
                    func(ctx.data, ctx);
            }
        }
    }

    /** Run the action / question for given boundaries and listeners. */
    private runAction<Action extends UIActions>(action: Action, collectPostHosts?: Set<UIHost> | null, isQuestion?: boolean | false | never, maxAnswers?: number): void;
    private runAction<Action extends UIActions & (UIQuestion | UIQuestionary)>(action: Action, collectPostHosts: null, isQuestion: true, maxAnswers?: number): void;
    private runAction<Action extends (UIActions | UIActions & (UIQuestion | UIQuestionary))>(action: Action, collectPostHosts?: Set<UIHost> | null, isQuestion?: boolean, maxAnswers?: number): void {
        // Invalid.
        if (!action.type)
            return;
        // Sort.
        const ctx = this.uiContext;
        let aBoundaries = ctx.actionBoundaries;
        if (this.dirtyOrder & UIContextRefresh.Actions) {
            if (aBoundaries.size > 1)
                ctx.actionBoundaries = aBoundaries = UIContextServices.sortCollection(aBoundaries);
            this.dirtyOrder &= ~UIContextRefresh.Actions;
        }
        // Loop all boundaries.
        const que = action as (Action & UIQuestion & UIQuestionary); // Just for TypeScript.
        for (const [boundary, ctxNames] of aBoundaries) {
            // Parse.
            const aNeeds = boundary.contextApi.actionNeeds;
            const live = boundary.live as UILive<{}, {}, {}, {[name: string]: UIContext<any, UIActions>}>;
            // Add to hosts for post actions.
            if (collectPostHosts)
                collectPostHosts.add(boundary.uiHost);
            // Loop the ctxNames the context occupies (typically only one - but for flexible support).
            // .. In that case, will actually call it through all those contexts - because how are we to determine which one to call reliably.
            for (const name of ctxNames) {
                // Skip.
                const needs = aNeeds.get(name);
                if (!needs || needs !== true && !needs.has(action.type))
                    continue;
                // Collect answers.
                if (isQuestion) {
                    if (live.uponQuestion) {
                        // Override, and add to collection.
                        que.value = live.uponQuestion(que, ctx, name);
                        // Only one.
                        if (!que.values)
                            return;
                        // Stop by count limit.
                        const count = que.values.push(que.value);
                        if (maxAnswers && count >= maxAnswers)
                            return;
                    }
                }
                // Normal.
                else if (live.uponAction)
                    live.uponAction(action, ctx, name);
            }
        }

        // Listeners.
        for (const [func, needs] of ctx.actionListeners) {
            if (!needs || needs !== true && !needs.has(action.type))
                continue;
            if (isQuestion) {
                // Override, and add to collection.
                que.value = func(que, ctx);
                // Only one.
                if (!que.values)
                    return;
                // Stop by count limit.
                const count = que.values.push(que.value);
                if (maxAnswers && count >= maxAnswers)
                    return;
            }
            else
                func(action as Action & { value: never; }, ctx);
        }
    }

    /** This calls each action handler and returns what they decide with importance of "cancel" > "post" > "quick". */
    private preHandleAction(action: UIActions, isQuestion: boolean = false): "" | "cancel" | "post" | "quick" {
        let did: "" | "cancel" | "post" | "quick" = "";
        const ctx = this.uiContext;
        for (const [func, needs] of ctx.actionHandlers) {
            if (needs === true || needs.has(action.type || "")) {
                if (isQuestion)
                    func(action, ctx);
                else {
                    const talkback = func(action, ctx);
                    if (talkback && (!did || did !== "cancel" && (did !== "post" || talkback === "cancel")))
                        did = talkback;
                }
            }
        }
        return did;
    }


    // - Helpers - //

    public static flagActions(settings: UIContext["settings"], prop: "quickActions" | "postActions", actionTypes: true | null | string | string[] | Set<string>, extend: boolean = true): void {
        if (actionTypes === null || actionTypes === true)
            settings[prop] = actionTypes as null | Set<string>; // We allow true, but only for quick.
        else {
            const types = typeof actionTypes === "string" ? [actionTypes] : actionTypes;
            const set = settings[prop];
            if (extend && set && set !== true) {
                for (const type of types)
                    set.add(type);
            }
            else
                settings[prop] = new Set(types);
        }
    }

    public onInterest(side: "data" | "actions", boundary: UILiveBoundary, ctxName: string): void {
        // Modify.
        const isData = side === "data";
        const collection: Map<UILiveBoundary, Set<string>> = isData ? this.uiContext.dataBoundaries : this.uiContext.actionBoundaries;
        const current = collection.get(boundary);
        current ? current.add(ctxName) : collection.set(boundary, new Set([ctxName]));
        this.dirtyOrder |= isData ? UIContextRefresh.Data : UIContextRefresh.Actions;
        // Callback.
        const method = isData ? "onDataInterests" : "onActionInterests";
        if (this.uiContext[method])
            (this.uiContext[method] as NonNullable<UIContext[typeof method]>)(boundary, ctxName, true);
    }

    public onDisInterest(side: "data" | "actions", boundary: UILiveBoundary, ctxName: string): void {
        // Callback.
        const isData = side === "data";
        const method = isData ? "onDataInterests" : "onActionInterests";
        if (this.uiContext[method])
            (this.uiContext[method] as NonNullable<UIContext[typeof method]>)(boundary, ctxName, false);
        // Modify.
        const collection: Map<UILiveBoundary, Set<string>> = isData ? this.uiContext.dataBoundaries : this.uiContext.actionBoundaries;
        const current = collection.get(boundary);
        if (current) {
            current.delete(ctxName);
            if (!current.size)
                collection.delete(boundary);
        }
    }

    public onBoundaryMove(boundary: UILiveBoundary, ctxName: string): void {
        const cApi = boundary.contextApi;
        this.dirtyOrder |= (cApi.actionNeeds.get(ctxName) && UIContextRefresh.Actions || 0) | (cApi.contextNeeds.get(ctxName) && UIContextRefresh.Data || 0);
    }


    // - Static helpers - //

    public static sortCollection(collection: Map<UILiveBoundary, Set<string>>): Map<UILiveBoundary, Set<string>> {
        // Sort.
        const sorted = [ ...collection.keys() ];
        _Apply.sortBoundaries(sorted);
        // Build a new map.
        return new Map(sorted.map(b => [b, collection.get(b)] as [UILiveBoundary, Set<string>]));
    }
}
