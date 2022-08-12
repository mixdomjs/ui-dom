

// - Imports - //

import {
    Dictionary,
    RecordableType,
    UIAllContexts,
    UIAllContextsDataWithNull,
    UIAllContextsWithNull,
    UIContextAttach,
    UIContextRefresh
} from "../static/_Types";
import { _Lib } from "../static/_Lib";
import { _Apply } from "../static/_Apply";
import { UILiveSource } from "./UIBoundary";
import { UIContext } from "./UIContext";


// - Boundary context api - //

export class UIContextApi<AllContexts extends UIAllContexts = {}, ContextData extends Dictionary = {}> {

    boundary: UILiveSource<AllContexts, ContextData>;

    contextNeeds: Map<string, string[] | boolean>;
    actionNeeds: Map<string, Set<string> | boolean>;

    /** The contexts the component has overridden itself.
     * .. This is typically used for tunneling purposes, when the component wants to be part of the context it created.
     * .. This is optional because, it's quite rarely used.
     * .... But when using contexts for tunneling, sometimes wants to talkback to parent with actions or share part of the context. */
    overriddenContexts?: Record<string, UIContext | null>;

    constructor(boundary: UILiveSource<AllContexts, ContextData>) {
        this.boundary = boundary;
        this.actionNeeds = new Map();
        this.contextNeeds = new Map();
    }

    // - Actions - //

    /** Set whether a specific action is needed or not. If has put actionNeeds to true for the whole context, makes no difference. */
    public needsAction(contextName: keyof AllContexts & string, actionType: string, needs: boolean = true): void {
        // All actions forced at full for this context.
        // .. So makes no difference what sets to a single action.
        const myNeeds = this.actionNeeds.get(contextName);
        if (myNeeds === true)
            return;
        // Add need.
        const ctx = this.getContext(contextName);
        if (needs) {
            // Local.
            myNeeds ? myNeeds.add(actionType) : this.actionNeeds.set(contextName, new Set([actionType]));
            // Context.
            if (ctx)
                ctx.services.onInterest("actions", this.boundary, contextName);
        }
        // Remove need.
        else if (myNeeds && myNeeds.has(actionType)) {
            // Local.
            myNeeds.delete(actionType);
            if (!myNeeds.size) {
                this.actionNeeds.delete(contextName);
                // Context.
                if (ctx)
                    ctx.services.onDisInterest("actions", this.boundary, contextName);
            }
        }
    }

    /** Set action needs as a whole.
     * - If actionTypes is a boolean, functions in reset mode regardless of the extend setting.
     * - Otherwise modifies the actionNeeds by adding new entries into it. (Cannot be used to remove many.)
     *     * If extend is false, resets the actionNeeds to the given set. (This way can remove others.)
     * - Note that this never modifies the other contexts.
     */
    public needsActions(contextName: keyof AllContexts & string, actionTypes: string[] | boolean = [], extend: boolean = true): void {
        // Boolean reset.
        const myNeeds = this.actionNeeds.get(contextName);
        if (typeof actionTypes === "boolean")
            actionTypes ? this.actionNeeds.set(contextName, true) : this.actionNeeds.delete(contextName);
        // Reset.
        else if (!extend || !this.actionNeeds.size)
            actionTypes.length ? this.actionNeeds.set(contextName, new Set(actionTypes)) : this.actionNeeds.delete(contextName);
        // Extend - if has something to add.
        else if (actionTypes.length) {
            // From scratch.
            if (!myNeeds)
                this.actionNeeds.set(contextName, new Set(actionTypes));
            // Extend.
            else if (myNeeds !== true)
                for (const type of actionTypes)
                    myNeeds.add(type);
        }
        // Trigger change - note that if extended a set, there's no change.
        if (!actionTypes !== !myNeeds) {
            const ctx = this.getContext(contextName);
            if (ctx)
                actionTypes ? ctx.services.onInterest("actions", this.boundary, contextName) : ctx.services.onDisInterest("actions", this.boundary, contextName);
        }
    }

    /** Set actions for multiple contexts in one go.
     * - If extendForAll is true (is by default), then keeps other contexts intact. Otherwise removes those not found in namedNeeds.
     * - If extendWithinContext is true (is by default), then keeps the other actions defined in the same context. Otherwise resets the action needs in that context. */
    needsActionsBy(namedNeeds: Record<keyof AllContexts & string, boolean | string[]>, extendWithinContext?: boolean, extendForAll: boolean = true) {
        // If false, then removes action needs from all other contexts.
        if (!extendForAll) {
            const needsWere = this.boundary.contextApi.actionNeeds;
            // Loop each and if not found in the new set, remove.
            for (const name of needsWere.keys())
                if (namedNeeds[name] === undefined)
                    needsWere.delete(name);
        }
        // Set for each given.
        for (const name in namedNeeds)
            this.boundary.contextApi.needsActions(name, namedNeeds[name], extendWithinContext);
    }


    // - Context - //

    /** Use this to set the optional data refresh keys - resets the current keys for that context.
     * - There can be one or many keywords, or true to allow anything (default). If false, then removes needs.
     * - Will match with the given refresh keys or if is nested deeper - ie. starts with the key + "."
     * - Returns boolean to indicate whether did change or not. Useful for custom refreshing purposes. */
    public needsData(name: string, needs: boolean | string | string[] = true, refreshIfChanged: boolean = true): boolean {
        // Reset nedes for this context.
        const didNeed = !!this.contextNeeds.get(name);
        needs === false ? this.contextNeeds.delete(name) : this.contextNeeds.set(name, typeof needs === "string" ? [ needs ] : needs);
        // No change in basic needs (in terms of on/off).
        if (didNeed !== !needs)
            return false;
        // Update context collection.
        const ctx = this.getContext(name) || null;
        if (ctx)
            needs ? ctx.services.onInterest("data", this.boundary, name) : ctx.services.onDisInterest("data", this.boundary, name);
        // Refresh.
        if (refreshIfChanged)
            this.updateRemote();
        return true;
    }
    /** This extends the needs by the given record, or if extend is false resets the whole needs.
     * - Note that if you want to remove all needs, call with `.needsDataBy({}, false)`
     * - Returns boolean to indicate whether did change or not. Useful for custom refreshing purposes. */
    public needsDataBy(needs: Record<string, boolean | string | string[]>, extend: boolean = true, refreshIfChanged: boolean = true): boolean {
        // Remove data needs in other contexts.
        if (!extend && this.contextNeeds.size) {
            // Shallow copy - we don't want to mess with external input.
            needs = { ...needs };
            // Loop each to mark for removing.
            for (const name of this.contextNeeds.keys())
                // If has no defined needs, add to be removed. (Otherwise, whatever the needs are, they are handled below.)
                if (needs[name] === undefined)
                    needs[name] = false;
        }
        // Update the given ones.
        let didChange = false;
        for (const name in needs)
            if (this.needsData(name, needs[name], false))
                didChange = true;
        // Refresh.
        if (didChange && refreshIfChanged)
            this.updateRemote();
        // Return whether did change for external refreshing.
        return didChange;
    }

    /** If undefined, will remove the overridden state. Returns flags for whether contextual refresh should be made. */
    public overrideContext(name: string, context: UIContext | null | undefined, refresh: boolean = true): UIContextRefresh {
        // Detect change.
        const oldContext = this.getContext(name);
        const newContext = context !== undefined ? context : this.getContext(name, UIContextAttach.Parent | UIContextAttach.Cascading);
        let overridden = this.overriddenContexts;
        // Remove earlier override.
        if (context === undefined) {
            if (overridden) {
                delete overridden[name];
                if (!Object.keys(overridden).length)
                    delete this.overriddenContexts;
            }
        }
        // Override.
        else {
            if (!overridden)
                overridden = this.overriddenContexts = {};
            overridden[name] = context;
        }
        // Did change.
        const didChange: UIContextRefresh = oldContext !== newContext ? _Apply.helpUpdateContext(this.boundary, name, newContext || null, oldContext || null) : 0;
        // Refresh.
        if (refresh && _Apply.shouldUpdateContextually(didChange))
            this.updateRemote();
        return didChange;
    }

    /** Override multiple contexts in one go. Returns flags for whether contextual refresh should be made. */
    public overrideContexts(contexts: Record<string, UIContext | null | undefined>, refresh: boolean = true): UIContextRefresh {
        // Override each - don't refresh.
        let didChange: UIContextRefresh = 0;
        for (const name in contexts)
            didChange |= this.overrideContext(name, contexts[name], false);
        // Refresh.
        if (refresh && _Apply.shouldUpdateContextually(didChange))
            this.updateRemote();
        // Contextual changes.
        return didChange;
    }

    /** Returns undefined if not found, otherwise UIContext | null. */
    public getContext(name: string, onlyTypes: UIContextAttach = UIContextAttach.All): UIContext | null | undefined {
        // Overridden.
        if (onlyTypes & UIContextAttach.Overridden) {
            const tunnels = this.overriddenContexts;
            if (tunnels && tunnels[name] !== undefined)
                return tunnels[name];
        }
        // Attached by tunneling.
        if (onlyTypes & UIContextAttach.Parent) {
            const tunnels = this.boundary._outerDef.attachedContexts;
            if (tunnels && tunnels[name] !== undefined)
                return tunnels[name];
        }
        // From outer contexts.
        if (onlyTypes & UIContextAttach.Cascading)
            return this.boundary.outerContexts[name];
        // Not found.
        return undefined;
    }

    /** Get contexts by types. Give flags to allow only certain types, see UIContextAttach flags. */
    public getContexts(onlyNames?: RecordableType<keyof AllContexts & string> | null, onlyTypes: UIContextAttach = UIContextAttach.All): Record<string, UIContext | null> {
        // Base.
        const okNames = onlyNames ? _Lib.buildRecordable(onlyNames) : null;
        const tunnels: Record<string, UIContext | null> = {};
        if (onlyTypes & UIContextAttach.Cascading)
            for (const name in this.boundary.outerContexts)
                if (!okNames || okNames[name])
                    tunnels[name] = this.boundary.outerContexts[name];
        // Attached.
        if (onlyTypes & UIContextAttach.Parent) {
            const attached = this.boundary._outerDef.attachedContexts;
            if (attached)
                for (const name in attached)
                    if (!okNames || okNames[name])
                        tunnels[name] = attached[name];
        }
        // Overridden.
        if (onlyTypes & UIContextAttach.Overridden) {
            const overridden = this.overriddenContexts;
            if (overridden)
                for (const name in overridden)
                    if (!okNames || okNames[name])
                        tunnels[name] = overridden[name];
        }
        // Mixed.
        return tunnels;
    }

    public updateRemote(forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
        // On mount run, allow to build the context immediately.
        if (!this.boundary.isMounted) {
            if (this.contextNeeds.size)
                this.rebuildRemote();
        }
        // Add to updates.
        else
            this.boundary.uiHost.services.absorbUpdates(this.boundary, { contextual: true }, forceUpdateTimeout, forceRenderTimeout);
    }

    public rebuildRemote(): void {
        // Prepare updating.
        const data: Dictionary = {};
        const ctxs: Record<string, UIContext | null> = {};
        const overridden = this.boundary.contextApi.overriddenContexts;
        const tunnels = this.boundary._outerDef.attachedContexts;
        // Loop the needs.
        for (const name of this.contextNeeds.keys()) {
            // Get context.
            let ctx: UIContext | null | undefined = overridden ? overridden[name] : undefined;
            if (tunnels && ctx === undefined)
                ctx = tunnels[name];
            if (ctx === undefined)
                ctx = this.boundary.outerContexts[name];
            // Assign for callback.
            ctxs[name] = ctx || null;
            data[name] = ctx ? ctx.data : null;
        }
        // Rebuild.
        const live = this.boundary.live;
        if (live.buildRemote)
            live.remote = live.buildRemote(data as UIAllContextsDataWithNull<AllContexts>, ctxs as UIAllContextsWithNull<AllContexts>);
    }

}
