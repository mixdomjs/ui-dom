

// - Imports - //

import {
    Dictionary,
    RecordableType,
    ClassType,
    ClassBaseMixer,
    PropType,
    UITreeNode,
    UITreeNodeType,
    UIActions,
    UIAllContexts,
    UIAllContextsDataWithNull,
    UIAllContextsWithNull,
    UIDefTarget,
    UILiveFunction,
    UILiveUpdates,
    UIQuestion,
    UIQuestionary,
    UIComponent,
    UIRenderOutput,
    UIUpdateCompareModesBy,
    UIContextAttach,
    UIContextData,
    NestedPaths,
} from "../static/_Types";
import { _Lib } from "../static/_Lib";
import { _Apply } from "../static/_Apply";
import { UILiveSource, UISourceBoundary } from "./UIBoundary";
import { uiDom } from "../uiDom";
import { UIWiredType } from "./UIWired";
import { UIContext } from "./UIContext";


// - UILive base mixin - //

function _UILiveMixin<Props extends Dictionary = {}, State extends Dictionary = {}, ContextData extends Dictionary = {}, AllContexts extends UIAllContexts = {}>(Base: ClassType) {

    return class _UILive extends Base {


        // - Static & types - //

        public static UI_DOM_TYPE = "Live";

        // Props, state & context.
        public readonly props: Props;
        public state: State;
        public context: ContextData;

        // Internal but public.
        public readonly wired: Set<UIWiredType> | null;
        /** The boundary enveloping us - basically we just provide render function for it, and have slots for callbacks. */
        public readonly boundary: UILiveSource<AllContexts>;

        public updateModes: Partial<UIUpdateCompareModesBy>;

        // Private-like.
        _timers?: Map<any, number>;


        // - Init & Destroy - //

        constructor(props: Props, ...args: any[]) {
            // Call.
            super(...args);
            // Init.
            this.props = props;
            this.updateModes = {};
            this.wired = null;
            // Note.
            // - _timers will be assigned if used.
            // - State is applied by the extending class.
            // - The .boundary is applied externally right after. We just want to keep the constructor very React like.
        }


        // - Updating - //

        public update(forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
            this.boundary.uiHost.services.addToUpdates(this.boundary, { force: forceUpdate || false }, forceUpdateTimeout, forceRenderTimeout);
        }

        public setState(newState: Pick<State, keyof State> | State, forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
            // Combine state.
            const state = { ...this.state, ...newState } as State;
            // Update.
            this.boundary.updateBy({ state }, forceUpdate, forceUpdateTimeout, forceRenderTimeout);
        }

        public setInState(property: keyof State, value: any, forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
            // Get new state.
            const state = { ...(this.state || {}), [property]: value } as State;
            // Update.
            this.boundary.updateBy({ state }, forceUpdate, forceUpdateTimeout, forceRenderTimeout);
        }


        // - Timer service - automatically cleared upon unmounting - //

        public addTimer(timerId: any, callback: () => void, timeout: number, bindThis: boolean = true): void {
            // Clear old.
            if (!this._timers)
                this._timers = new Map();
            else if (this._timers.has(timerId))
                this.clearTimer(timerId);
            // Assign.
            this._timers.set(timerId, window.setTimeout(() => {
                this.clearTimer(timerId);
                if (bindThis)
                    callback.call(this);
                else
                    callback();
            }, timeout));
        }
        public hasTimer(timerId: any): boolean {
            return this._timers ? this._timers.has(timerId) : false;
        }
        public clearTimer(timerId: any): void {
            if (!this._timers)
                return;
            const timer = this._timers.get(timerId);
            if (timer != null) {
                window.clearTimeout(timer);
                this._timers.delete(timerId);
            }
        }
        public clearTimers(onlyTimerIds: any[]): void {
            if (!this._timers)
                return;
            if (onlyTimerIds) {
                for (const timerId of onlyTimerIds)
                    this.clearTimer(timerId);
            }
            else {
                this._timers.forEach(timer => window.clearTimeout(timer));
                this._timers.clear();
            }
        }


        // - Getters - //


        public isMounted(): boolean {
            return this.boundary.isMounted === true;
        }

        public queryDomElement(selector: string, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false): Element | null {
            return _Apply.queryDomElement(this.boundary.baseTreeNode, selector, allowWithinBoundaries, allowOverHosts);
        }

        public queryDomElements(selector: string, maxCount: number = 0, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false): Element[] {
            return _Apply.queryDomElements(this.boundary.baseTreeNode, selector, maxCount, allowWithinBoundaries, allowOverHosts);
        }

        public findDomNodes(maxCount: number = 0, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): Node[] {
            return _Apply.findTreeNodesWithin(this.boundary.baseTreeNode, { dom: true }, maxCount, allowWithinBoundaries, allowOverHosts, validator).map(tNode => tNode.domNode) as Node[];
        }

        public findBoundaries(maxCount: number = 0, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): UISourceBoundary[] {
            return _Apply.findTreeNodesWithin(this.boundary.baseTreeNode, { boundary: true }, maxCount, allowWithinBoundaries, allowOverHosts, validator).map(tNode => tNode.boundary) as UISourceBoundary[];
        }

        public findTreeNodes(types: RecordableType<UITreeNodeType>, maxCount: number = 0, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): UITreeNode[] {
            return _Apply.findTreeNodesWithin(this.boundary.baseTreeNode, _Lib.buildRecordable<UITreeNodeType>(types), maxCount, allowWithinBoundaries, allowOverHosts, validator);
        }


        // - Children - //

        /** Get the actual contentPass childDefs. If used will mark needsChildren temporarily (until next render).
         *   .. When used, reads the children from the content pass.
         *   .. Also marks that the function "needs children", so will be re-rendered if children change.
         * - Note that for just passing the content, always use uiDom.Content.
         *   .. Only use .getChildren() if you really need it. For example, to wrap each individually or read info from their defs.
         */
        public getChildren(skipNeeds: boolean = false, shallowCopy: boolean = true): Readonly<UIDefTarget[]> {
            return this.boundary.contentApi && this.boundary.contentApi.getChildren(skipNeeds, shallowCopy) || [];
        }

        /** Define for the remaining lifecycle if should update when content closure updates.
         * - If boolean given it forces the mode.
         * - If null | undefined or "temp", then clears on each render start, and sets to "temp" on using .getChildren(). */
        public needsChildren(needs?: boolean | "temp" | null): void {
            this.boundary.contentApi && this.boundary.contentApi.needsChildren(needs);
        }


        // - Contextual - //

        // Needs in contexts.

        public needsContext(contextName: AllContexts & string, needs: boolean | any | any[] = true, refresh: boolean = true): void {
            this.boundary.contextApi.needsContext(contextName, needs, refresh);
        }

        public needsContexts(...names: (keyof AllContexts & string | Record<keyof AllContexts & string, boolean | string | string[]>)[]): void {
            // Clean the arguments into a clean collection.
            const needs: Record<string, boolean | string | string[]> = {};
            for (const nameOrRec of names) {
                if (typeof nameOrRec === "string")
                    needs[nameOrRec] = true;
                else
                    for (const name in nameOrRec)
                        needs[name] = nameOrRec[name];
            }
            // Set needs - even if needs are empty.
            this.boundary.contextApi.needsContexts(needs);
        }

        public needsAction(contextName: AllContexts & string, actionType: string, needs?: boolean): void {
            this.boundary.contextApi.needsAction(contextName, actionType, needs);
        }
        public needsActions(contextName: AllContexts & string, actionTypes: string[] | boolean = [], extend?: boolean): void {
            this.boundary.contextApi.needsActions(contextName, actionTypes as string[] | boolean, extend);
        }

        // Do stuff with contexts.

        public setContextData(contextName: keyof AllContexts & string, data: any, extend: boolean = false, refresh: boolean = true, forceTimeout?: number | null): void {
            const context = this.boundary.contextApi.getContext(contextName);
            if (context)
                context.setData(data, extend, refresh, forceTimeout);
        }

        public setInContextData(contextName: keyof AllContexts & string, dataKey: string, data: any, extend: boolean = false, refresh: boolean = true, forceTimeout?: number | null): void {
            const context = this.boundary.contextApi.getContext(contextName);
            if (context)
                context.setInData(dataKey, data as never, extend, refresh, forceTimeout);
        }

        public getContextData(contextName: keyof AllContexts & string, noContextFallback: any = undefined): any {
            const context = this.boundary.contextApi.getContext(contextName);
            return context ? context.data : noContextFallback;
        }

        public getInContextData(contextName: keyof AllContexts & string, dataKey: string, noContextFallback: any = undefined): any {
            const context = this.boundary.contextApi.getContext(contextName);
            return context ? context.getInData(dataKey as never) : noContextFallback;
        }

        public refreshInContext(contextName: keyof AllContexts & string, refreshKeys: boolean | string | string[] = true, forceTimeout?: number | null): void {
            const context = this.boundary.contextApi.getContext(contextName);
            if (context)
                context.refreshBy(refreshKeys as never, forceTimeout);
        }

        public dispatchAction(contextName: keyof AllContexts & string, action: UIActions & { value?: never; }, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void {
            const context = this.boundary.contextApi.getContext(contextName);
            if (context)
                context.dispatchAction(action, asAction, forceTimeout);
        }

        public dispatchActionWith(contextName: keyof AllContexts & string, actionType: string, payload: any, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void {
            const context = this.boundary.contextApi.getContext(contextName);
            if (context)
                context.dispatchAction({ type: actionType, payload } as UIActions & { value?: never; }, asAction, forceTimeout);
        }

        public dispatchQuestion(contextName: keyof AllContexts & string, question: UIActions & UIQuestion, defaultValue?: any): any {
            const context = this.boundary.contextApi.getContext(contextName);
            return context ? context.dispatchQuestion(question, defaultValue) : (defaultValue === undefined ? question.value : defaultValue);
        }
        public dispatchQuestionWith(contextName: keyof AllContexts & string, type: string, payload: any, defaultValue?: any, maxAnswers: number = 0): any {
            const context = this.boundary.contextApi.getContext(contextName);
            return context ? context.dispatchQuestion({ type, payload, value: defaultValue } as UIActions & UIQuestion, maxAnswers) : [];
        }

        public dispatchQuestionary(contextName: keyof AllContexts & string, question: UIActions & UIQuestionary, maxAnswers: number = 0): any[] {
            const context = this.boundary.contextApi.getContext(contextName);
            return context ? context.dispatchQuestionary(question, maxAnswers) : (question as UIQuestionary).values || [];
        }

        public dispatchQuestionaryWith(contextName: keyof AllContexts & string, type: string, payload: any, maxAnswers: number = 0): any[] {
            const context = this.boundary.contextApi.getContext(contextName);
            return context ? context.dispatchQuestionary({ type, payload, values: [] } as UIActions & UIQuestionary, maxAnswers) : [];
        }


        // Mangle.

        public hasContext(name: keyof AllContexts & string): boolean {
            return !!this.boundary.contextApi.getContext(name);
        }

        public getContext(name: keyof AllContexts & string, onlyTypes: UIContextAttach = UIContextAttach.All): UIContext | null | undefined {
            return this.boundary.contextApi.getContext(name, onlyTypes) as UIContext | null | undefined;
        }

        public getContexts(onlyNames?: RecordableType<keyof AllContexts & string> | null, onlyTypes?: UIContextAttach): Partial<Record<string, UIContext | null>> {
            return this.boundary.contextApi.getContexts(onlyNames, onlyTypes);
        }

        public overrideContext(name: string, context: UIContext | null | undefined, refresh: boolean = true): void {
            this.boundary.contextApi.overrideContext(name, context, refresh);
        }

        public overrideContexts(tunnels: Record<string, UIContext | null | undefined>, refresh: boolean = true): void {
            this.boundary.contextApi.overrideContexts(tunnels, refresh);
        }

        public createContext(data: any, overrideWithName?: string, refreshIfOverriden: boolean = true): UIContext {
            const context = uiDom.createContext(data);
            if (overrideWithName)
                this.boundary.contextApi.overrideContext(overrideWithName, context, refreshIfOverriden);
            return context;
        }

        public createContexts(allData: any, overrideForSelf: boolean = false, refreshIfOverriden: boolean = true): Record<string, UIContext> {
            const contexts = uiDom.createContexts(allData);
            if (overrideForSelf)
                this.boundary.contextApi.overrideContexts(contexts, refreshIfOverriden);
            return contexts;
        }


        // - Wired renderer - //

        public createWired(func: UIComponent, builder: (...params: any[]) => Dictionary, mixer: (baseProps: Dictionary, addsProps: Dictionary, ...params: any[]) => Dictionary, ...params: any[]): UIWiredType {
            const Wired = uiDom.createWired(func, builder, mixer, ...params);
            if (!this.wired)
                // We set a readonly value here - it's on purpose: we want it to be readonly for all others except this line.
                (this as { wired: Set<UIWiredType>; }).wired = new Set([Wired]);
            else
                this.wired.add(Wired);
            return Wired;
        }


        // - Assignable by extending class - //

        // The most important func of each component.
        public render(): UIRenderOutput | UILiveFunction<Props, State, ContextData, AllContexts> { return uiDom.Content; }


    }
}

// Using an interface with the same name as the class solves the <T> problem with mixins.
export interface UILive<Props extends Dictionary = {}, State extends Dictionary = {}, ContextData extends Dictionary = {}, AllContexts extends UIAllContexts = {}, Actions extends AllContexts[keyof AllContexts]["Actions"] = AllContexts[keyof AllContexts]["Actions"]> {


    // - Members - //

    // Props, state, context.
    readonly props: Props;
    state: State;
    context: ContextData;

    // Wired.
    readonly wired: Set<UIWiredType> | null;

    /** The boundary enveloping us - basically we just provide render function for it, and have slots for callbacks. */
    readonly boundary: UILiveSource;
    /** If any is undefined / null, then uses the default from uiHost.settings. */
    updateModes: Partial<UIUpdateCompareModesBy>;

    // Private.
    _timers?: Map<any, number>;


    // - Updating - //

    update(forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    setState<Key extends keyof State>(newState: Pick<State, Key> | State, forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    setInState<Key extends keyof State>(property: Key, value: State[Key], forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;


    // - Timer service - automatically cleared on unmount - //

    addTimer<TimerIds = any>(timerId: TimerIds, callback: () => void, timeout: number, bindThis?: boolean): void;
    hasTimer<TimerIds = any>(timerId: TimerIds): boolean;
    clearTimer<TimerIds = any>(timerId: TimerIds): void;
    clearTimers<TimerIds = any>(onlyTimerIds?: TimerIds[]): void;


    // - Getters - //

    isMounted(): boolean;
    queryDomElement<T extends Element = Element>(selector: string, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T | null;
    queryDomElements<T extends Element = Element>(selector: string, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T[];
    findDomNodes<T extends Node = Node>(maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: (treeNode: UITreeNode) => any): T[];
    findBoundaries(maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: (treeNode: UITreeNode) => any): UISourceBoundary[];
    findTreeNodes(types: RecordableType<UITreeNodeType>, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: (treeNode: UITreeNode) => any): UITreeNode[];


    // - Children - //

    /** Get the actual contentPass childDefs.
     * - Will also mark needsChildren temporarily (until next render), unless skipNeeds is true.
     * - By default shallowCopy is true, so will .slice() the children.
     * - Note that you should NEVER modify the children defs - only read. */
    getChildren(skipNeeds?: boolean, shallowCopy?: boolean): Readonly<UIDefTarget[]>;

    /** Define for the remaining lifecycle if should update when content closure updates. */
    needsChildren(needs?: boolean | null): void;


    // - Contextual - //

    // Needs.
    /** Use this to set the optional data refresh keys - resets the current keys for that context.
     * - There can be one or many keywords, or true to allow anything (default). If false, then removes needs.
     * - Will match with the given refresh keys or if is nested deeper - ie. starts with the key + "."
     * - By default, will mark the component to be updated if it was changed. If you intend to define multiple in a row, you can set the third parameter to false for all except the very last one. */
    needsContext<Name extends keyof AllContexts & string, CtxData extends AllContexts[Name]["data"], DataKey extends PropType<CtxData, DataKey, never> extends never ? never : string>(contextName: Name, needs?: boolean | DataKey | DataKey[], refresh?: boolean): void;
    /** Call this to define contextual needs alltogether.
     * - With strings, will define true as refresh keys, with a record, uses the value in it.
     * - This resets the situation - typically called once at start up.
     * - Note that this will mark the component to be updated, if there were any changes in the needs. */
    needsContexts<Name extends keyof AllContexts & string, DataKey extends NestedPaths<AllContexts[Name]["data"]>>(...names: (Name | Record<Name, boolean | DataKey | DataKey[]>)[]): void;
    // needsContexts<Name extends keyof AllContexts & string, CtxData extends AllContexts[Name]["data"], DataKey extends PropType<CtxData, DataKey, never> extends never ? never : string>(...names: (Name | Record<Name, boolean | DataKey | DataKey[]>)[]): void;
    /** Call to define depencies on a single action.
     * If needs is false, then removes the need for this action - undefined or true adds.
     * Note that you should also assign the callback for uponAction or uponQuestion for questions. */
    needsAction<Name extends keyof AllContexts & string>(contextName: Name, actionType: AllContexts[Name]["Actions"]["type"] & string, needs?: boolean): void;
    /** Call to define depencies on multiple actions.
     * If extend is true, extends the previously set needs - otherwise (by default) resets the needs to the given.
     * Note that you should also assign the callbacks for uponAction and/or uponQuestion. */
    needsActions<Name extends keyof AllContexts & string>(contextName: Name, actionTypes: (AllContexts[Name]["Actions"]["type"] & string)[] | boolean, extend?: boolean): void;

    // Do stuff.
    /** Set the whole data of the context, and trigger refresh (by default). If the data is an object, can also extend. */
    setContextData<Name extends keyof AllContexts & string>(contextName: Name, data: Partial<AllContexts[Name]["data"]> & Dictionary, extend?: true, refresh?: boolean, forceTimeout?: number | null): void;
    setContextData<Name extends keyof AllContexts & string>(contextName: Name, data: AllContexts[Name]["data"], extend?: boolean, refresh?: boolean, forceTimeout?: number | null): void;
    /** Set a portion of data inside the context data, and trigger refresh (by default). If the sub data is an object, can also extend.
     * Use the dataKey to define the location as a dotted string. For example: themes.selected */
    setInContextData<Name extends keyof AllContexts & string, CtxData extends AllContexts[Name]["data"], DataKey extends string, SubData extends PropType<CtxData, DataKey, never>>(contextName: Name, dataKey: DataKey, data: Partial<SubData> & Dictionary, extend?: true, refresh?: boolean, forceTimeout?: number | null): void;
    setInContextData<Name extends keyof AllContexts & string, CtxData extends AllContexts[Name]["data"], DataKey extends string, SubData extends PropType<CtxData, DataKey, never>>(contextName: Name, dataKey: DataKey, data: SubData, extend?: boolean, refresh?: boolean, forceTimeout?: number | null): void;
    /** Get the whole context data (directly). */
    getContextData<Name extends keyof AllContexts & string, CtxData extends AllContexts[Name]["data"], FallbackData extends CtxData | undefined>(contextName: Name, noContextFallback?: never | undefined): CtxData | undefined;
    getContextData<Name extends keyof AllContexts & string, CtxData extends AllContexts[Name]["data"], FallbackData extends CtxData>(contextName: Name, noContextFallback: FallbackData): CtxData;
    /** Get a portion of data inside the context data (directly).
     * Use the dataKey to define the location as a dotted string. For example: "themes.selected" */
    getInContextData<Name extends keyof AllContexts & string, CtxData extends AllContexts[Name]["data"], DataKey extends PropType<CtxData, DataKey, never> extends never ? never : string>(contextName: Name, dataKey: DataKey, noContextFallback?: never | undefined): PropType<CtxData, DataKey> | undefined;
    getInContextData<Name extends keyof AllContexts & string, CtxData extends AllContexts[Name]["data"], DataKey extends PropType<CtxData, DataKey, never> extends never ? never : string, SubData extends PropType<CtxData, DataKey>, FallbackData extends SubData>(contextName: Name, dataKey: DataKey, noContextFallback: FallbackData): SubData;
    /** Manually trigger refresh for dataKeys in the context.
     * Use the refreshKeys to define the location as a dotted string or an array of dotted strings. For example: ["themes.selected", "preferences"] */
    refreshInContext<Name extends keyof AllContexts & string, CtxData extends AllContexts[Name]["data"], DataKey extends PropType<CtxData, DataKey, never> extends never ? never : string>(contextName: Name, refreshKeys?: boolean | DataKey | DataKey[], forceTimeout?: number | null): void;
    /** Dispatch an action in the context. */
    dispatchAction<Name extends keyof AllContexts & string>(contextName: Name, action: AllContexts[Name]["Actions"] & { value: never; }, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
    /** Dispatch an action within the context by declaring it on the go with type and payload. */
    dispatchActionWith<Name extends keyof AllContexts & string, Actions extends AllContexts[Name]["Actions"] & { value: never; }, Type extends Actions["type"], Action extends Actions & { type: Type; }>(contextName: Name, actionType: Type, payload: Action["payload"], asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
    dispatchActionWith<Name extends keyof AllContexts & string, Actions extends AllContexts[Name]["Actions"] & { value: never; }, Type extends (Actions & { payload?: never; })["type"]>(contextName: Name, actionType: Type, payload?: undefined, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
    /** Dispatch a question in the context.
     * - You get the answer synchronously by the return value (comes from the first answerer, then stops going further).
     * - If there's no answerers, or no context found, then returns the optional defaultValue (or from question.value) - or then undefined.
     * - Note that dispatching a question also modifies the original question by adding .value into it with the collected answer. */
    dispatchQuestion<Name extends keyof AllContexts & string, Action extends AllContexts[Name]["Actions"] & (UIQuestion | UIQuestionary)>(contextName: Name, question: Action & { value?: Action["value"]; }, value?: Action["value"]): Action["value"] | undefined;
    /** Dispatch a questionary (of one question with many answers) in the context.
     * - You get the answers synchronously by the return value (comes from all the answerers).
     * - If there's no answerers, or no context found, then returns an empty array.
     * - Note that dispatching a questionary also modifies the original question by adding .value and .values into it.
     *   .. If any answered, the last answer be found as .value. (If none, .value is not added.) */
    dispatchQuestionary<Name extends keyof AllContexts & string, Action extends AllContexts[Name]["Actions"] & (UIQuestion | UIQuestionary)>(contextName: Name, question: Action & { value?: Action["value"]; }, maxAnswers?: number): Action["value"][];

    // Mangle.
    /** Check quickly whether has context or not. Rarely needed - uses .getContext internally. */
    hasContext<Name extends keyof AllContexts & string>(name: Name): boolean;
    /** Gets the context locally by name.
     * - Returns undefined if not found, otherwise UIContext | null.
     * - If includeTunnels is set to false, skips contexts assigned by tunneling (overrideContext call or by attachTunnels prop).
     * - This is mainly useful, when wanting to send actions from within the component - or perhaps in some special circumstances. */
    getContext<Name extends keyof AllContexts & string>(name: Name, onlyTypes?: UIContextAttach): AllContexts[Name] | null | undefined;
    /** Give UIContextAttach flags to allow only certain types, and onlyNames to allow only certain names.
     *  UIContextAttach are:
     *  - Cascading (1): Outer contexts.
     *  - Attached (2): Attached tunnels.
     *  - Overridden (4): Locally overridden. */
    getContexts<Name extends keyof AllContexts & string>(onlyNames?: RecordableType<Name> | null, onlyTypes?: UIContextAttach): Partial<Record<Name, AllContexts[Name] | null>>;
    /** Override context for this component only without affecting the cascading context flow.
     * - This will override both: the cascading as well as tunneled (if the parent had used .attachTunnels for us).
     * - If context is undefined, then will remove the previously set override. Otherwise sets it to the given context or null.
     * - This method is most often used by calling createContext with second param, but can be used manually as well. */
    overrideContext<Name extends keyof AllContexts & string>(name: Name, context: AllContexts[Name] | null | undefined, refresh?: boolean): void;
    /** Same as overrideContext but for multiple contexts all at once.
     * - Most often used by .createContexts() if the second param is set to true. */
    overrideContexts<Name extends keyof AllContexts & string>(contexts: Partial<Record<Name, AllContexts[Name] | null | undefined>>, refresh?: boolean): void;
    /** This creates a new context - presumably to be attached with .attachTunnels prop.
     * - If overrideWithName given, then includes this component in the context as well (as if its parent had used .attachTunnels).
     *   .. Note that this is the same as using .overrideContext(name), so it will override any context of the same name for this component. */
    createContext<CtxData extends UIContextData = any, CtxActions extends UIActions = UIActions>(data: CtxData, overrideWithName?: never | "" | undefined, refreshIfOverriden?: never | false): UIContext<CtxData, CtxActions>;
    createContext<Name extends keyof AllContexts & string>(data: AllContexts[Name]["data"], overrideWithName: Name, refreshIfOverriden?: boolean): AllContexts[Name];
    /** Same as createContext but for multiple contexts all at once.
     * - If overrideForSelf set to true, will call overrideContexts after to include this component into each context. */
    createContexts<Contexts extends { [Name in keyof AllData]: UIContext<AllData[Name]> }, AllData extends { [Name in keyof Contexts]: Contexts[Name]["data"] } = { [Name in keyof Contexts]: Contexts[Name]["data"] }>(allData: AllData, overrideForSelf?: never | false | undefined, refreshIfOverriden?: never | false): Contexts;
    createContexts<Name extends keyof AllContexts & string>(allData: Partial<Record<Name, AllContexts[Name]["data"]>>, overrideForSelf: true, refreshIfOverriden?: boolean): Partial<Record<Name, AllContexts[Name]["data"]>>;


    // - Wired renderer - //

    /** Creates a wired renderer.
     * - Technically creates a class that behaves like UILive (or actually more like UIMiniFunction as a class).
     *     1. This class serves as the common portion for all class instances that will be wrapped in their own boundaries when grounded.
     *     2. This class can then allow to set and refresh the common props, and trigger should-updates for all the instances.
     *     3. The props of the actual class instances are mixed with the wiredProps defined by this class.
     * - Note that when creates a wired renderer through this method (on a live component), it will automatically update whenever this component is checked for should-updates.
     * - Note that in the UILive context, you should always have builderOrProps or mixer. (Otherwise makes no sense to hook up to component's updates.) */
    createWired<
        BaseProps extends Dictionary = {},
        WiredProps extends Dictionary = {},
        MixedProps extends Dictionary = BaseProps & WiredProps,
        Params extends any[] = any[],
        Builder extends (lastProps: WiredProps | null, ...params: Params) => WiredProps = (lastProps: WiredProps | null, ...params: Params) => WiredProps,
        Mixer extends (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps = (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps
    >(funcOrClass: UIComponent<MixedProps>, builderOrProps: Builder | WiredProps | null, mixer?: Mixer, ...params: Params): UIWiredType<BaseProps, WiredProps, MixedProps, Params, Builder, Mixer>;


    // - Assignable by extending class - //

    // The render method.
    /** The most important function of a UILive: the render output function. */
    render(props: Props, ui: ThisType<this>): UIRenderOutput | UILiveFunction<Props, State, ContextData, AllContexts>;
    render(): UIRenderOutput | UILiveFunction<Props, State, ContextData, AllContexts>;

    // Contextual executors.
    /** Override this to listen to actions - originated by dispatchAction call on the context. */
    uponAction?<Name extends keyof AllContexts & string, Context extends AllContexts[Name]>(action: Context["Actions"], context: Context, name: Name): void;
    /** Override this to answer to questions - asked by dispatchQuestion call on the context. */
    uponQuestion?<Name extends keyof AllContexts & string, Context extends AllContexts[Name], Action extends Context["Actions"] & UIQuestion<Action["value"]>>(action: Action, context: Context, name: Name): Action["value"];
    /** Override this with the actual method to build the context for this particular component. */
    buildContext?(all: UIAllContextsDataWithNull<AllContexts>, contexts: UIAllContextsWithNull<AllContexts>): ContextData;
    onContextChange?<Name extends keyof AllContexts & string>(name: Name, newContext: AllContexts[Name] | null, oldContext: AllContexts[Name] | null): boolean | null;

    // Component life cycle.
    /** This is a callback that will always be called when the component is checked for updates.
     * - Note that this is not called on mount, but will be called everytime on update, even if will not actually update (use the 3rd param).
     * - Note that this will be called after uiShouldUpdate (if that is called) and right before the update happens.
     * - Note that by this time all the data has been updated already. So use preUpdates to get what it was before. */
    uiBeforeUpdate?(preUpdates: UILiveUpdates<Props, State, ContextData>, newUpdates: UILiveUpdates<Props, State, ContextData>, willUpdate: boolean): void;
    /** Callback to determine whether should update or not.
     * - If returns true, component will update. If false, will not.
     * - If returns null (or no uiShouldUpdate method assigned), will use the rendering settings to determine.
     * - Note that this is not called every time necessarily (never on mount, and not if was forced).
     * - Note that this is called right before uiBeforeUpdate and the actual update (if that happens).
     * - Note that by this time all the data has been updated already. So use preUpdates to get what it was before. */
    uiShouldUpdate?(preUpdates: UILiveUpdates<Props, State, ContextData>, newUpdates: UILiveUpdates<Props, State, ContextData>): boolean | null;
    uiDidMount?(): void;
    uiDidMove?(): void;
    uiDidUpdate?(preUpdates: UILiveUpdates<Props, State, ContextData>, newUpdates: UILiveUpdates<Props, State, ContextData>): void;
    uiWillUnmount?(): void;

}


// - The class and create shortcut - //

// The declaration of this has some problems: many nevers.
// .. We don't really need the declaration for this class. Can it be avoided somehow?
export class UILive<Props extends Dictionary = {}, State extends Dictionary = {}, ContextData extends Dictionary = {}, AllContexts extends UIAllContexts = {}> extends _UILiveMixin(Object) {
    // We need a constructor here for typescript TSX.
    constructor(props: Props, ...args: any[]) {
        super(props, ...args);
    }
}
export const createLive = <Props extends Dictionary = {}, State extends Dictionary = {}, Context extends Dictionary = {}, AllContexts extends UIAllContexts = {}>( func: (q: UILive<Props, State, Context, AllContexts>, props: Props) => UIRenderOutput | UILiveFunction<Props, State, Context, AllContexts>) =>
    ((props, ui) => func(ui, props)) as UILiveFunction<Props, State, Context, AllContexts>;


// - The exported mixer - //

/** There are two ways you can use this:
 * 1. Call this to give basic UILive features with types for Props and such being empty.
 *      * For example: `class MyMix extends UILiveMixin(MyBase) {}`
 * 2. If you want to define Props and such, use this simple trick instead:
 *      * For example: `class MyMix extends (UILiveMixin as ClassBaseMixer<UILive<MyProps>>)(MyBase) {}`
 */
export const UILiveMixin = _UILiveMixin as ClassBaseMixer<UILive>;
