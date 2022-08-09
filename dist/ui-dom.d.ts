declare class UIContextServices {
    private uiContext;
    private refreshTimer;
    private refreshKeys;
    private refreshActions;
    private refreshPostActions;
    private refreshPostDelayed?;
    private refreshOrder;
    constructor(uiContext: UIContext);
    /** Dispatches the given action through the context by default timeout.
     * - Before the action goes further, any actionHandlers can cancel it or mark it as a post action (= happens after update-n-render cycle).
     * - If asPostAction given, will ignore what .postActions and .actionHandlers would say about whether is postAction or not.
     * - Note that this should not be used for questions. */
    dispatchAction(action: UIActions & {
        value?: never;
    }, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
    /** Dispatch a question. The answer will be added into the question with "value" key. */
    dispatchQuestion(que: UIActions & (UIQuestion | UIQuestionary), maxCount?: number): void;
    refresh(defaultTimeout: number | null, forceTimeout?: number | null): void;
    /** The context doesn't keep track of interests due to keeping bookkeeping procedures simple.
      * - So instead, on context data change:
      *   1. We go each of our treeNodes to find the boundaries.
      *   2. And for each boundary, we start going down very quickly using .innerBoundaries and .outerContexts that also can cut our way.
      *   3. Finally, if finds any interested ones, calls uiHost.services.addToUpdates on them.
      * - Note that this method should not be called during the update process, because it depends on .innerBoundaries and .outerContexts that are updated then.
      * - Note that in the case some roots are nested, there might be double checking - but it's a very small price to pay for a rare case. */
    refreshNow(): void;
    onHostPostRefresh(byHostInfo?: [host: UIHost, listener: () => void]): void;
    addRefreshKeys(refreshKeys?: string | string[] | boolean): void;
    private runData;
    private runAction;
    private callActionHandlers;
    onInterest(side: "data" | "actions", boundary: UILiveSource, ctxName: string): void;
    onDisInterest(side: "data" | "actions", boundary: UILiveSource, ctxName: string): void;
    onBoundaryMove(boundary: UILiveSource, ctxName: string): void;
    static getHostsFromTreeNodes(treeNodes: Iterable<GroundedTreeNode>): Set<UIHost>;
    static sortCollection(collection: Map<UILiveSource, Set<string>>): Map<UILiveSource, Set<string>>;
}

declare type UIContextProps<Data extends UIContextData = any, Actions extends UIActions = {}> = {
    name: string;
    context: UIContext<Data, Actions> | null;
};
declare function UIContextMixin(Base: ClassType): {
    new (_props?: UIContextProps, ...passArgs: any[]): {
        /** The roots where this context is inserted.
         * - This is not used for refresh flow (anymore), but might be useful for custom purposes. */
        roots: Map<GroundedTreeNodeContext, string>;
        /** The source boundaries that are interested in the data and attached to it by 1. cascading, 2. tunneling, or 3. overriding. */
        dataBoundaries: Map<UILiveSource, Set<string>>;
        /** The source boundaries that are intersted in the actions and attached to it by 1. cascading, 2. tunneling, or 3. overriding. */
        actionBoundaries: Map<UILiveSource, Set<string>>;
        /** Any external data listeners - called after the live components. */
        dataListeners: Map<UIUponData<UIContext>, Set<string> | true>;
        /** Any external action listeners - called after the live components. */
        actionListeners: Map<UIUponAction<UIContext> | UIUponQuestion<UIContext>, Set<string> | true>;
        /** Any external action pre-listeners: called immediately when action dispatched.
         * - Return true to make the action be triggered after update and render (within each uiHost).
         * - Return false to cancel dispatching the action (after pre-listeners).
         * - Otherwise will dispatch the action normally upon refreshing the context.
         * - Note that this is also called for questions (for logging purposes), in which case the return value makes no difference. */
        actionHandlers: Map<UIUponPreAction<UIContext>, Set<string> | true>;
        data: any;
        settings: {
            /** Set of action types that should always be dispatched after the update-n-render cycle.
             * If overlaps with quickActions, will be interpreted as a post action.*/
            postActions: null | Set<string>;
            /** Set of action types that should always be run immediately.
             * - Set true to force all as quick - this changes the general behaviour.
             * - Note that if overlaps with postActions, will be treated as a post action. */
            quickActions: true | null | Set<string>;
            /** Timeout for refreshing for this particular context.
             * - The timeout is used for both: actions & data refreshes.
             * - If null, then synchronous - defaults to 0ms. */
            refreshTimeout: number | null;
        };
        /** Internal services to keep the whole thing together and synchronized.
         * They are the semi-private internal part of UIContext, so separated into its own class. */
        services: UIContextServices;
        modifySettings(settings: {
            postActions?: null | string | string[] | Set<string>;
            quickActions?: true | null | string | string[] | Set<string>;
            refreshTimeout?: null | number;
        }): void;
        addAsPostActions(actionTypes: null | string | string[] | Set<string>, extend?: boolean): void;
        addAsQuickActions(actionTypes: true | null | string | string[] | Set<string>, extend?: boolean): void;
        addActionHandler(listener: UIUponPreAction, actionTypes?: string | string[] | true): void;
        removeActionHandler(listener: UIUponPreAction): void;
        addActionListener(listener: UIUponAction | UIUponQuestion, actionTypes?: string | string[] | true): void;
        removeActionListener(listener: UIUponAction | UIUponQuestion): void;
        addDataListener(listener: UIUponData, refreshKeys?: string | string[] | true): void;
        removeDataListener(listener: UIUponData): void;
        dispatchAction(action: UIActions & {
            value?: never;
        }, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
        dispatchActionWith(actionType: string, payload: any, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
        dispatchQuestion(question: UIQuestion, defaultValue?: any): any;
        dispatchQuestionWith(type: string, payload?: any | null, defaultValue?: any): any;
        dispatchQuestionary(question: UIQuestionary, maxAnswers?: number): any[];
        dispatchQuestionaryWith(type: string, payload?: any | null, maxAnswers?: number): any[];
        setData(data: any, extend?: boolean, refresh?: boolean, forceTimeout?: number | null): void;
        setInData(dataKey: string, subData: any, extend?: boolean, refresh?: boolean, forceTimeout?: number | null): void;
        getData(): any;
        getInData(dataKey: string): any;
        /** Method to refresh by adding the given keys. */
        refreshBy(refreshKeys?: boolean | string | string[], forceTimeout?: number | null): void;
        /** This refreshes both: context & pending actions.
         * - The refresh flows down the tree, and for each matching boundary, calls the action first and then checks context.
         * - Note that if the live component was interested in the context, will use the .addToUpdates flow - so there might be a timeout before gets actually applied.
         * - Note that if !!refreshKeys is false, then will not add any refreshKeys. If there were none, will only update actions. */
        refresh(forceTimeout?: number | null): void;
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
    addToSettingsActions(settings: UIContext["settings"], prop: "quickActions" | "postActions", actionTypes: true | null | string | string[] | Set<string>, extend?: boolean): void;
};
declare const UIContext_base: {
    new (_props?: UIContextProps<any, {}> | undefined, ...passArgs: any[]): {
        /** The roots where this context is inserted.
         * - This is not used for refresh flow (anymore), but might be useful for custom purposes. */
        roots: Map<GroundedTreeNodeContext, string>;
        /** The source boundaries that are interested in the data and attached to it by 1. cascading, 2. tunneling, or 3. overriding. */
        dataBoundaries: Map<UILiveSource<{}, {}>, Set<string>>;
        /** The source boundaries that are intersted in the actions and attached to it by 1. cascading, 2. tunneling, or 3. overriding. */
        actionBoundaries: Map<UILiveSource<{}, {}>, Set<string>>;
        /** Any external data listeners - called after the live components. */
        dataListeners: Map<UIUponData<UIContext<any, {}>>, true | Set<string>>;
        /** Any external action listeners - called after the live components. */
        actionListeners: Map<UIUponAction<UIContext<any, {}>> | UIUponQuestion<UIContext<any, {}>, UIAction & {
            value: any;
        }>, true | Set<string>>;
        /** Any external action pre-listeners: called immediately when action dispatched.
         * - Return true to make the action be triggered after update and render (within each uiHost).
         * - Return false to cancel dispatching the action (after pre-listeners).
         * - Otherwise will dispatch the action normally upon refreshing the context.
         * - Note that this is also called for questions (for logging purposes), in which case the return value makes no difference. */
        actionHandlers: Map<UIUponPreAction<UIContext<any, {}>>, true | Set<string>>;
        data: any;
        settings: {
            /** Set of action types that should always be dispatched after the update-n-render cycle.
             * If overlaps with quickActions, will be interpreted as a post action.*/
            postActions: Set<string> | null;
            /** Set of action types that should always be run immediately.
             * - Set true to force all as quick - this changes the general behaviour.
             * - Note that if overlaps with postActions, will be treated as a post action. */
            quickActions: true | Set<string> | null;
            /** Timeout for refreshing for this particular context.
             * - The timeout is used for both: actions & data refreshes.
             * - If null, then synchronous - defaults to 0ms. */
            refreshTimeout: number | null;
        };
        /** Internal services to keep the whole thing together and synchronized.
         * They are the semi-private internal part of UIContext, so separated into its own class. */
        services: UIContextServices;
        modifySettings(settings: {
            postActions?: string | string[] | Set<string> | null | undefined;
            quickActions?: string | true | string[] | Set<string> | null | undefined;
            refreshTimeout?: number | null | undefined;
        }): void;
        addAsPostActions(actionTypes: string | string[] | Set<string> | null, extend?: boolean): void;
        addAsQuickActions(actionTypes: string | true | string[] | Set<string> | null, extend?: boolean): void;
        addActionHandler(listener: UIUponPreAction<UIContext<any, {}>>, actionTypes?: string | true | string[]): void;
        removeActionHandler(listener: UIUponPreAction<UIContext<any, {}>>): void;
        addActionListener(listener: UIUponAction<UIContext<any, {}>> | UIUponQuestion<UIContext<any, {}>, UIAction & {
            value: any;
        }>, actionTypes?: string | true | string[]): void;
        removeActionListener(listener: UIUponAction<UIContext<any, {}>> | UIUponQuestion<UIContext<any, {}>, UIAction & {
            value: any;
        }>): void;
        addDataListener(listener: UIUponData<UIContext<any, {}>>, refreshKeys?: string | true | string[]): void;
        removeDataListener(listener: UIUponData<UIContext<any, {}>>): void;
        dispatchAction(action: UIActions & {
            value?: undefined;
        }, asAction?: "" | "post" | "quick" | undefined, forceTimeout?: number | null | undefined): void;
        dispatchActionWith(actionType: string, payload: any, asAction?: "" | "post" | "quick" | undefined, forceTimeout?: number | null | undefined): void;
        dispatchQuestion(question: UIQuestion<any>, defaultValue?: any): any;
        dispatchQuestionWith(type: string, payload?: any, defaultValue?: any): any;
        dispatchQuestionary(question: UIQuestionary<any>, maxAnswers?: number): any[];
        dispatchQuestionaryWith(type: string, payload?: any, maxAnswers?: number): any[];
        setData(data: any, extend?: boolean, refresh?: boolean, forceTimeout?: number | null | undefined): void;
        setInData(dataKey: string, subData: any, extend?: boolean, refresh?: boolean, forceTimeout?: number | null | undefined): void;
        getData(): any;
        getInData(dataKey: string): any;
        /** Method to refresh by adding the given keys. */
        refreshBy(refreshKeys?: string | boolean | string[], forceTimeout?: number | null | undefined): void;
        /** This refreshes both: context & pending actions.
         * - The refresh flows down the tree, and for each matching boundary, calls the action first and then checks context.
         * - Note that if the live component was interested in the context, will use the .addToUpdates flow - so there might be a timeout before gets actually applied.
         * - Note that if !!refreshKeys is false, then will not add any refreshKeys. If there were none, will only update actions. */
        refresh(forceTimeout?: number | null | undefined): void;
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
    addToSettingsActions(settings: {
        /** Set of action types that should always be dispatched after the update-n-render cycle.
         * If overlaps with quickActions, will be interpreted as a post action.*/
        postActions: Set<string> | null;
        /** Set of action types that should always be run immediately.
         * - Set true to force all as quick - this changes the general behaviour.
         * - Note that if overlaps with postActions, will be treated as a post action. */
        quickActions: true | Set<string> | null;
        /** Timeout for refreshing for this particular context.
         * - The timeout is used for both: actions & data refreshes.
         * - If null, then synchronous - defaults to 0ms. */
        refreshTimeout: number | null;
    }, prop: "quickActions" | "postActions", actionTypes: string | true | string[] | Set<string> | null, extend?: boolean): void;
};
interface UIContext<Data extends UIContextData = any, Actions extends UIActions = {}> {
    Actions: Actions;
    /** The roots where this context is inserted.
     * - This is not used for refresh flow (anymore), but might be useful for custom purposes. */
    roots: Map<GroundedTreeNodeContext, string>;
    /** The source boundaries that are interested in the data and attached to it by 1. cascading, 2. tunneling, or 3. overriding. */
    dataBoundaries: Map<UILiveSource, Set<string>>;
    /** The source boundaries that are intersted in the actions and attached to it by 1. cascading, 2. tunneling, or 3. overriding. */
    actionBoundaries: Map<UILiveSource, Set<string>>;
    /** Any external data listeners - called after the live components. */
    dataListeners: Map<UIUponData<UIContext<Data, Actions>>, Set<string> | true>;
    /** Any external action listeners - called after the live components. */
    actionListeners: Map<UIUponAction<UIContext<Data, Actions>> | UIUponQuestion<UIContext<Data, Actions>>, Set<string> | true>;
    /** Any external action pre-listeners: called immediately when action dispatched.
     * - Return true to make the action be triggered after update and render (within each uiHost).
     * - Return false to cancel dispatching the action (after pre-listeners).
     * - Otherwise will dispatch the action normally upon refreshing the context.
     * - Note that this is also called for questions (for logging purposes), in which case the return value makes no difference. */
    actionHandlers: Map<UIUponPreAction<UIContext<Data, Actions>>, Set<string> | true>;
    data: Data;
    settings: {
        /** Set of action types that should always be dispatched after the update-n-render cycle.
         * If overlaps with quickActions, will be interpreted as a post action.*/
        postActions: null | Set<Actions["type"] & string>;
        /** Set of action types that should always be run immediately.
         * - Set true to force all as quick - this changes the general behaviour.
         * - Note that if overlaps with postActions, will be treated as a post action. */
        quickActions: true | null | Set<Actions["type"] & string>;
        /** Timeout for refreshing for this particular context.
         * - The timeout is used for both: actions & data refreshes.
         * - If null, then synchronous - defaults to 0ms. */
        refreshTimeout: number | null;
    };
    /** Internal services to keep the whole thing together and synchronized.
     * They are the semi-private internal part of UIContext, so separated into its own class. */
    services: UIContextServices;
    modifySettings<ActionTypes extends Actions["type"] & string>(settings: {
        postActions?: null | ActionTypes | ActionTypes[] | Set<ActionTypes>;
        quickActions?: true | null | ActionTypes | ActionTypes[] | Set<ActionTypes>;
        refreshTimeout?: null | number;
    }): void;
    addAsPostActions<ActionTypes extends Actions["type"] & string>(actionTypes: null | ActionTypes | ActionTypes[] | Set<ActionTypes>, extend?: boolean): void;
    addAsQuickActions<ActionTypes extends Actions["type"] & string>(actionTypes: true | null | ActionTypes | ActionTypes[] | Set<ActionTypes>, extend?: boolean): void;
    /** Adds a new action pre-listener that can talkback how to treat the action. If exists already, overrides. */
    addActionHandler(listener: UIUponPreAction<UIContext<Data, Actions>>, actionTypes?: Actions["type"] & string | (Actions["type"] & string)[] | true): void;
    /** Remove an action listener. */
    removeActionHandler(listener: UIUponPreAction): void;
    /** Adds a new action listener, or overrides if already exists. */
    addActionListener(listener: UIUponAction<UIContext<Data, Actions>> | UIUponQuestion<UIContext<Data, Actions>>, actionTypes?: Actions["type"] & string | (Actions["type"] & string)[] | true): void;
    /** Remove an action listener. */
    removeActionListener(listener: UIUponAction<UIContext<Data, Actions>> | UIUponQuestion<UIContext<Data, Actions>>): void;
    /** Adds a new data listener, or overrides if already exists. */
    addDataListener<DataKey extends PropType<Data, DataKey, never> extends never ? never : string>(listener: UIUponData<UIContext<Data, Actions>>, refreshKeys?: DataKey | DataKey[] | true): void;
    /** Remove an data listener. */
    removeDataListener(listener: UIUponData): void;
    /** Dispatches the given action through the context by default timeout.
     * - Before the action goes further, any actionHandlers can cancel it or mark it as a post action (= happens after update-n-render cycle).
     * - If asPostAction given, will ignore what .postActions and .actionHandlers would say about whether is postAction or not.
     * - Note that this should not be used for questions. */
    dispatchAction(action: Actions & {
        value?: never;
    }, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
    /** Creates an action and dispatches it through the context by default timeout.
     * - Before the action goes further, any actionHandlers can cancel it or mark it as a post action (= happens after update-n-render cycle).
     * - If asPostAction given, will ignore what .postActions and .actionHandlers would say about whether is postAction or not.
     * - Note that this should not be used for questions. */
    dispatchActionWith<Type extends Actions["type"], Action extends Actions & {
        type: Type;
    } & {
        value: never;
    }>(actionType: Type, payload: Action["payload"], asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
    dispatchActionWith<Type extends (Actions & {
        payload?: never;
    } & {
        value: never;
    })["type"]>(actionType: Type, payload?: undefined | never, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
    /** Dispatch a question.
     * - You get the answer synchronously by the return value (comes from the first answerer, then stops going further).
     * - If there's no answerers, then returns the optional defaultValue (or from question.value) - or then undefined.
     * - Note that dispatching a question also modifies the original question by adding .value into it with the collected answer. */
    dispatchQuestion<Action extends Actions & UIQuestion<Action["value"]>>(question: Action & {
        value?: Action["value"];
    }, defaultValue?: Action["value"]): Action["value"];
    /** Dispatch a question by defining it on the go. See .dispatchQuestion method for details. */
    dispatchQuestionWith<Action extends Actions & UIQuestion<Action["value"]>>(type: Action["type"], payload: Action["payload"], defaultValue?: Action["value"]): Action["value"];
    dispatchQuestionWith<Action extends Actions & UIQuestion<Action["value"]> & {
        payload?: never;
    }>(type: Action["type"], payload?: null, defaultValue?: Action["value"]): Action["value"];
    /** Dispatch a questionary (of one question with many answers) in the context.
     * - You get the answers synchronously by the return value (comes from all the answerers).
     * - If there's no answerers, then returns an empty array.
     * - Note that dispatching a questionary also modifies the original question by adding .value and .values into it.
     *   .. If any answered, the last answer be found as .value. (If none, .value is not added.) */
    dispatchQuestionary<Action extends Actions & UIQuestionary<Action["value"]>>(question: Action & {
        value?: Action["value"];
        values?: Action["value"][];
    }, maxAnswers?: number): Action["value"][];
    /** Dispatch a questionary by defining it on the go. See .dispatchQuestion method for details. */
    dispatchQuestionaryWith<Action extends Actions & UIQuestionary<Action["value"]>>(type: Action["type"], payload: Action["payload"], maxAnswers?: number): Action["value"][];
    dispatchQuestionaryWith<Action extends Actions & UIQuestionary<Action["value"]> & {
        payload?: never;
    }>(type: Action["type"], payload?: null, maxAnswers?: number): Action["value"][];
    /** Set the data and refresh.
     * - Note that the extend functionality should only be used for dictionary objects. */
    setData(data: Partial<Data> & Dictionary, extend?: true, refresh?: boolean, forceTimeout?: number | null): void;
    setData(data: Data, extend?: boolean | undefined, refresh?: boolean, forceTimeout?: number | null): void;
    /** Set or extend in nested data, and refresh with the key.
     * - Note that the extend functionality should only be used for dictionary objects. */
    setInData<DataKey extends string, SubData extends PropType<Data, DataKey, never>>(dataKey: DataKey, subData: Partial<SubData> & Dictionary, extend?: true, refresh?: boolean, forceTimeout?: number | null): void;
    setInData<DataKey extends string, SubData extends PropType<Data, DataKey, never>>(dataKey: DataKey, subData: SubData, extend?: boolean | undefined, refresh?: boolean, forceTimeout?: number | null): void;
    getData(): Data;
    getInData<DataKey extends PropType<Data, DataKey, never> extends never ? never : string>(dataKey: DataKey): PropType<Data, DataKey>;
    /** Method to refresh by adding the given keys. */
    refreshBy<DataKey extends PropType<Data, DataKey, never> extends never ? never : string>(refreshKeys?: boolean | DataKey | DataKey[], forceTimeout?: number | null): void;
    /** This refreshes both: context & pending actions.
     * - The refresh flows down the tree, and for each matching boundary, calls the action first and then checks context.
     * - Note that if the live component was interested in the context, will use the .addToUpdates flow - so there might be a timeout before gets actually applied.
     * - Note that if !!refreshKeys is false, then will not add any refreshKeys. If there were none, will only update actions. */
    refresh(forceTimeout?: number | null): void;
    onInsertInto?(treeNode: GroundedTreeNodeContext, name: string): void;
    onRemoveFrom?(treeNode: GroundedTreeNodeContext): void;
    onDataInterests?(boundary: UILiveSource, ctxName: string, isInterested: boolean): void;
    onActionInterests?(boundary: UILiveSource, ctxName: string, isInterested: boolean): void;
}
declare class UIContext<Data extends UIContextData = any, Actions extends UIActions = {}> extends UIContext_base {
    constructor(props?: UIContextProps, ...args: any[]);
}
declare type UIContextType<Data extends UIContextData = any, Actions extends UIActions = {}> = {
    new (_props?: UIContextProps | null): UIContext<Data, Actions>;
    readonly UI_DOM_TYPE: "Context";
};
/** Create a new context. */
declare const createContext: <Data = any, Actions extends UIActions = UIActions>(data?: Data | undefined, settings?: Partial<UIContext["settings"]> | null) => UIContext<Data, Actions>;
/** Create multiple named contexts. (Useful for tunneling.) */
declare const createContexts: <Contexts extends { [Name in keyof AllData]: UIContext<AllData[Name], {}>; }, AllData extends { [Name_1 in keyof Contexts]: Contexts[Name_1]["data"]; } = { [Name_2 in keyof Contexts]: Contexts[Name_2]["data"]; }>(contextsData: AllData) => Contexts;

declare class UIHostServices {
    /** Ref up. This whole class could be in uiHost, but for internal clarity the more private and technical side is here. */
    private uiHost;
    /** Dedicated rendering server. */
    private uiRender;
    /** To create unique id (per uiHost) for each boundary, a simple counter is used. */
    private idCounter;
    private updateTimer;
    private delayedUpdates;
    private _forceRenderTimeout?;
    private _isUpdating?;
    private listeners;
    private pendingTimer;
    private pendingBoundaryCalls;
    private pendingRenderInfos;
    constructor(uiHost: UIHost);
    createBoundaryId(): UISourceBoundaryId;
    clearTimers(forgetPending?: boolean): void;
    addListener(type: "update" | "render", callback: () => void): void;
    removeListener(type: "update" | "render", callback: () => void): void;
    onContextPass(outerContexts: Record<string, UIContext | null>): void;
    removeFromUpdates(boundary: UISourceBoundary): void;
    hasPending(updateSide?: boolean, renderSide?: boolean): boolean;
    /** This is the main method to update a boundary.
     * - It applies the updates to bookkeeping immediately.
     * - The actual update procedure is either timed out or immediate according to settings.
     *   .. It's recommended to use a tiny update timeout (eg. 0ms) to group multiple updates together. */
    addToUpdates(boundary: UISourceBoundary, updates: UILiveNewUpdates, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    /** This method should always be used when executing updates within a uiHost - it's the main orchestrator of updates.
     * To add to pending updates use the .addToUpdates() method above. */
    private applyUpdates;
    /** This is the core whole command to update a source boundary including checking if it should update and if has already been updated.
     * - It handles the _preUpdates bookkeeping and should update checking and return infos for changes.
     * - It should only be called from two places: the applyUpdates flow above, and within _Apply.applyDefPairs for updating nested. */
    updateSourceBoundary(boundary: UISourceBoundary, forceUpdate?: boolean | "all", movedNodes?: GroundedTreeNode[], bInterested?: UISourceBoundary[]): UIChangeInfos | null;
    addToPostPending(renderInfos: UIDomRenderInfo[] | null, boundaryChanges?: UISourceBoundaryChange[] | null, forceRenderTimeout?: number | null): void;
    private applyPostPending;
    private refreshWithTimeout;
}

declare function UIHostMixin(Base: ClassType): {
    new (content?: UIRenderOutput, domContainer?: Node | null, settings?: UIHostSettingsUpdate | null): {
        /** This represents abstractly what the final outcome looks like in dom.
         * .. Each GroundedTreeNode represents a domNode in the final dom.
         * .. So if you gNode.domNode.parentNode === gNode.parent?.domNode.
         */
        groundedTree: GroundedTreeNode;
        rootBoundary: UISourceBoundary;
        /** The general settings for this uiHost instance.
         * - Do not modify directly, use the .modifySettings method instead.
         * - Otherwise rendering might have old settings, or setting.onlyRunInContainer might be uncaptured. */
        settings: UIHostSettings;
        /** Internal services to keep the whole thing together and synchronized.
         * They are the semi-private internal part of UIHost, so separated into its own class. */
        services: UIHostServices;
        targetDef: UIDefTarget | null;
        isDisabled?: true | undefined;
        addListener(type: "render" | "update", callback: () => void): void;
        removeListener(type: "render" | "update", callback: () => void): void;
        renderWith(content: UIRenderOutput, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
        clearContents(update?: boolean, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
        modifySettings(settings: UIHostSettingsUpdate): void;
        /** This is useful for refreshing the container. */
        refresh(forceUpdate?: boolean, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
        /** This performs a "refresh-render".
         * .. In case forceDomRead is on will actually read from dom to look for real changes to be done. */
        refreshRender(forceDomRead?: boolean, forceRenderTimeout?: number | null): void;
        moveInto(parent: Node | null, forceRenderTimeout?: number | null): void;
        getRootDomNode(): Node | null;
        getRootDomNodes(inNestedBoundaries?: boolean): Node[];
        queryDomElement<T extends Element = Element>(selector: string, allowOverHosts?: boolean): T | null;
        queryDomElements<T_1 extends Element = Element>(selector: string, maxCount?: number, allowOverHosts?: boolean): T_1[];
        findDomNodes<T_2 extends Node = Node>(maxCount?: number, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): T_2[];
        findBoundaries(maxCount?: number, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): UISourceBoundary[];
        findTreeNodes(types: RecordableType<GroundedTreeNodeType>, maxCount?: number, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): GroundedTreeNode[];
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
    modifySettings(baseSettings: UIHostSettings, updates: UIHostSettingsUpdate): boolean;
    getDefaultSettings(settings?: UIHostSettingsUpdate | null): UIHostSettings;
};
declare const UIHost_base: {
    new (content?: UIRenderOutput, domContainer?: Node | null | undefined, settings?: UIHostSettingsUpdate | null | undefined): {
        /** This represents abstractly what the final outcome looks like in dom.
         * .. Each GroundedTreeNode represents a domNode in the final dom.
         * .. So if you gNode.domNode.parentNode === gNode.parent?.domNode.
         */
        groundedTree: GroundedTreeNode;
        rootBoundary: UISourceBoundary;
        /** The general settings for this uiHost instance.
         * - Do not modify directly, use the .modifySettings method instead.
         * - Otherwise rendering might have old settings, or setting.onlyRunInContainer might be uncaptured. */
        settings: UIHostSettings;
        /** Internal services to keep the whole thing together and synchronized.
         * They are the semi-private internal part of UIHost, so separated into its own class. */
        services: UIHostServices;
        targetDef: UIDefTarget | null;
        isDisabled?: true | undefined;
        addListener(type: "update" | "render", callback: () => void): void;
        removeListener(type: "update" | "render", callback: () => void): void;
        renderWith(content: UIRenderOutput, forceUpdateTimeout?: number | null | undefined, forceRenderTimeout?: number | null | undefined): void;
        clearContents(update?: boolean, forceUpdateTimeout?: number | null | undefined, forceRenderTimeout?: number | null | undefined): void;
        modifySettings(settings: UIHostSettingsUpdate): void;
        /** This is useful for refreshing the container. */
        refresh(forceUpdate?: boolean, forceUpdateTimeout?: number | null | undefined, forceRenderTimeout?: number | null | undefined): void;
        /** This performs a "refresh-render".
         * .. In case forceDomRead is on will actually read from dom to look for real changes to be done. */
        refreshRender(forceDomRead?: boolean, forceRenderTimeout?: number | null | undefined): void;
        moveInto(parent: Node | null, forceRenderTimeout?: number | null | undefined): void;
        getRootDomNode(): Node | null;
        getRootDomNodes(inNestedBoundaries?: boolean): Node[];
        queryDomElement<T extends Element = Element>(selector: string, allowOverHosts?: boolean): T | null;
        queryDomElements<T_1 extends Element = Element>(selector: string, maxCount?: number, allowOverHosts?: boolean): T_1[];
        findDomNodes<T_2 extends Node = Node>(maxCount?: number, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): T_2[];
        findBoundaries(maxCount?: number, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): UISourceBoundary[];
        findTreeNodes(types: RecordableType<GroundedTreeNodeType>, maxCount?: number, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): GroundedTreeNode[];
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
    modifySettings(baseSettings: UIHostSettings, updates: UIHostSettingsUpdate): boolean;
    getDefaultSettings(settings?: UIHostSettingsUpdate | null | undefined): UIHostSettings;
};
interface UIHost {
    /** This represents abstractly what the final outcome looks like in dom.
     * .. Each GroundedTreeNode represents a domNode in the final dom.
     * .. So if you gNode.domNode.parentNode === gNode.parent?.domNode. */
    groundedTree: GroundedTreeNode;
    rootBoundary: UISourceBoundary;
    /** Internal services to keep the whole thing together and synchronized.
     * They are the private internal part of uiHost, so separated into its own class. */
    services: UIHostServices;
    settings: UIHostSettings;
    targetDef: UIDefTarget | null;
    isDisabled?: true;
    modifySettings(settings: UIHostSettingsUpdate): void;
    renderWith(...contents: UIRenderOutput[]): void;
    clearContents(update?: boolean, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    refresh(forceUpdate?: boolean, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    refreshRender(forceDomRead?: boolean, forceRenderTimeout?: number | null): void;
    moveInto(parent: Node | null, forceRenderTimeout?: number | null): void;
    getRootDomNode(): Node | null;
    getRootDomNodes(inNestedBoundaries?: boolean): Node[];
    queryDomElement<T extends Element = Element>(selector: string, allowOverHosts?: boolean): T | null;
    queryDomElements<T extends Element = Element>(selector: string, maxCount?: number, allowOverHosts?: boolean): T[];
    findDomNodes<T extends Node = Node>(maxCount?: number, allowOverHosts?: boolean, validator?: (treeNode: GroundedTreeNode) => any): T[];
    findBoundaries(maxCount?: number, allowOverHosts?: boolean, validator?: (treeNode: GroundedTreeNode) => any): UISourceBoundary[];
    findTreeNodes(types: RecordableType<GroundedTreeNodeType>, maxCount?: number, allowOverHosts?: boolean, validator?: (treeNode: GroundedTreeNode) => any): GroundedTreeNode[];
}
/** This is the main class to orchestrate and start rendering. */
declare class UIHost extends UIHost_base {
}
declare type UIHostType = {
    new (content?: UIRenderOutput, domContainer?: Node | null, settings?: UIHostSettingsUpdate | null): UIHost;
    readonly UI_DOM_TYPE: "Host";
    modifySettings(baseSettings: UIHostSettings, updates: UIHostSettingsUpdate): boolean;
    getDefaultSettings(settings?: UIHostSettingsUpdate | null): UIHostSettings;
};
declare const createHost: (content?: UIRenderOutput, container?: HTMLElement | null, settings?: UIHostSettingsUpdate | null) => UIHost;

declare function UIMiniMixin<Props extends Dictionary = {}>(Base: ClassType): {
    new (props: Props, updateMode?: UIUpdateCompareMode | null, ...passArgs: any[]): {
        readonly props: Props;
        updateMode: UIUpdateCompareMode | null;
        setUpdateMode(updateMode: UIUpdateCompareMode | null): void;
        shouldUpdate?(prevProps: Props | null, newProps: Props | null): boolean | null;
        render(_props: Props): UIRenderOutput | UIMiniFunction<Props>;
        isMounted(): boolean;
        getChildren(_skipNeeds?: boolean, _shallowCopy?: boolean): Readonly<UIDefTarget[]>;
        needsChildren(_needs?: boolean | "temp" | null): void;
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object; /** Set the update mode for this particular renderer instance.
         * - If null uses settings.updateMiniMode from uiHost.
         * - Note that you can also assign the .shouldUpdate method to affect this. */
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
};
declare const UIMini_base: {
    new (props: {}, updateMode?: UIUpdateCompareMode | null, ...passArgs: any[]): {
        readonly props: {};
        updateMode: UIUpdateCompareMode | null;
        setUpdateMode(updateMode: UIUpdateCompareMode | null): void;
        shouldUpdate?(prevProps: {} | null, newProps: {} | null): boolean | null;
        render(_props: {}): UIMiniFunction<{}> | UIRenderOutput;
        isMounted(): boolean;
        getChildren(_skipNeeds?: boolean, _shallowCopy?: boolean): readonly UIDefTarget[];
        needsChildren(_needs?: boolean | "temp" | null | undefined): void;
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object; /** Set the update mode for this particular renderer instance.
         * - If null uses settings.updateMiniMode from uiHost.
         * - Note that you can also assign the .shouldUpdate method to affect this. */
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
};
interface UIMini<Props extends Dictionary = {}> {
    /** Fresh props. */
    readonly props: Props;
    /** Settable updateMode: "always" | "changed" | "shallow" | "double" | "deep".
     * - See UIUpdateCompareMode for details.
     * - Note that for UIMini, you can't define the needs for children.
     *   .. The setting is always in the default host based mode for children, by default it's "changed".
     *   .. Accordingly children are not part of the .shouldUpdate(prevProps, nextProps). */
    updateMode: UIUpdateCompareMode | null;
    /** Get the actual contentPass childDefs. If used will mark needsChildren temporarily (until next render).
     *   .. When used, reads the children from the content pass.
     *   .. Also marks that the function "needs children", so will be re-rendered if children change.
     * - Note that for just passing the content, always use uiDom.Content.
     *   .. Only use .getChildren() if you really need it. For example, to wrap each individually or read info from their defs.
     */
    getChildren(skipNeeds?: boolean, shallowCopy?: boolean): Readonly<UIDefTarget[]>;
    /** Define for the remaining lifecycle if should update when content closure updates.
     * - If boolean given it forces the mode.
     * - If null | undefined or "temp", then clears on each render start, and sets to "temp" on using .getChildren(). */
    needsChildren(needs?: boolean | "temp" | null): void;
    /** If returns true, component will update. If false, will not.
     * If returns null (or no shouldUpdate method assigned), will use the rendering settings to determine.
     * Note that this is named different from uiShouldUpdate because the arguments are just props, not { props?, state?, context?, children? }.*/
    shouldUpdate?(prevProps: Props | null, newProps: Props | null): boolean | null;
    /** Whether the component has mounted or not. */
    isMounted(): boolean;
    /** Set the update mode for this particular renderer instance.
     * - If null uses settings.updateMiniMode from uiHost.
     * - Note that you can also assign the .shouldUpdate method to affect this. */
    setUpdateMode(updateMode: UIUpdateCompareMode | null): void;
    /** The renderer will be assigned here. */
    render(_props: Props): UIRenderOutput | UIMiniFunction<Props>;
}
declare class UIMini<Props extends Dictionary = {}> extends UIMini_base {
}
declare type UIMiniType<Props extends Dictionary = {}> = {
    new (props: Props, updateMode?: UIUpdateCompareMode | null): UIHost;
    readonly UI_DOM_TYPE: "Mini";
};
declare const createMini: <Props extends Dictionary<string, any> = {}>(func: (mini: UIMini<Props>, props: Props) => UIRenderOutput | UIMiniFunction<Props>) => UIMiniFunction<Props>;

declare function UILiveMixin<Props extends Dictionary = {}, State extends Dictionary = {}, ContextData extends Dictionary = {}, AllContexts extends UIAllContexts = {}>(Base: ClassType): {
    new (props: Props, ...args: any[]): {
        readonly props: Props;
        state: State;
        context: ContextData;
        readonly wired: Set<UIWiredType> | null;
        readonly boundary: UILiveSource<AllContexts>;
        updateModes: Partial<UIUpdateCompareModesBy>;
        /** The boundary enveloping us - basically we just provide render function for it, and have slots for callbacks. */
        _timers?: Map<any, number> | undefined;
        update(forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
        setState(newState: Pick<State, keyof State> | State, forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
        setInState(property: keyof State, value: any, forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
        addTimer(timerId: any, callback: () => void, timeout: number, bindThis?: boolean): void;
        hasTimer(timerId: any): boolean;
        clearTimer(timerId: any): void;
        clearTimers(onlyTimerIds?: any[]): void;
        isMounted(): boolean;
        queryDomElement(selector: string, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): Element | null;
        queryDomElements(selector: string, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): Element[];
        findDomNodes(maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): Node[];
        findBoundaries(maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): UISourceBoundary[];
        findTreeNodes(types: RecordableType<GroundedTreeNodeType>, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): GroundedTreeNode[];
        /** Get the actual contentPass childDefs. If used will mark needsChildren temporarily (until next render).
         *   .. When used, reads the children from the content pass.
         *   .. Also marks that the function "needs children", so will be re-rendered if children change.
         * - Note that for just passing the content, always use uiDom.Content.
         *   .. Only use .getChildren() if you really need it. For example, to wrap each individually or read info from their defs.
         */
        getChildren(skipNeeds?: boolean, shallowCopy?: boolean): Readonly<UIDefTarget[]>;
        /** Define for the remaining lifecycle if should update when content closure updates.
         * - If boolean given it forces the mode.
         * - If null | undefined or "temp", then clears on each render start, and sets to "temp" on using .getChildren(). */
        needsChildren(needs?: boolean | "temp" | null): void;
        initContext(initContext: ContextData, ...needsContexts: ((keyof AllContexts & string) | Record<keyof AllContexts & string, boolean | string | string[]>)[]): void;
        needsContext(name: keyof AllContexts & string, needs?: boolean | string | string[], refresh?: boolean): void;
        needsContexts(...names: ((keyof AllContexts & string) | Record<keyof AllContexts & string, boolean | string | string[]>)[]): void;
        needsAction(contextName: keyof AllContexts & string, actionType: string, needs?: boolean): void;
        needsActions(contextName: keyof AllContexts & string, actionTypes?: string[] | boolean, extend?: boolean): void;
        setContextData(contextName: keyof AllContexts & string, data: any, extend?: boolean, refresh?: boolean, forceTimeout?: number | null): void;
        setInContextData(contextName: keyof AllContexts & string, dataKey: string, data: any, extend?: boolean, refresh?: boolean, forceTimeout?: number | null): void;
        getContextData(contextName: keyof AllContexts & string, noContextFallback?: any): any;
        getInContextData(contextName: keyof AllContexts & string, dataKey: string, noContextFallback?: any): any;
        refreshInContext(contextName: keyof AllContexts & string, refreshKeys?: boolean | string | string[], forceTimeout?: number | null): void;
        dispatchAction(contextName: keyof AllContexts & string, action: UIActions & {
            value?: never;
        }, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
        dispatchActionWith(contextName: keyof AllContexts & string, actionType: string, payload: any, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
        dispatchQuestion(contextName: keyof AllContexts & string, question: UIActions & UIQuestion, defaultValue?: any): any;
        dispatchQuestionWith<Action extends UIAction & {
            value: any;
        }>(contextName: keyof AllContexts & string, type: Action["type"], payload: Action["payload"], defaultValue?: any, maxAnswers?: number): Action["value"];
        dispatchQuestionWith<Action_1 extends UIAction & {
            value: any;
        } & {
            payload?: undefined;
        }>(contextName: keyof AllContexts & string, type: Action_1["type"], payload?: null, defaultValue?: any, maxAnswers?: number): Action_1["value"];
        dispatchQuestionary(contextName: keyof AllContexts & string, question: UIActions & UIQuestionary, maxAnswers?: number): any[];
        dispatchQuestionaryWith<Action_2 extends UIAction & {
            value: any;
        }>(contextName: keyof AllContexts & string, type: Action_2["type"], payload: Action_2["payload"], maxAnswers?: number): Action_2["value"][];
        dispatchQuestionaryWith<Action_3 extends UIAction & {
            value: any;
        } & {
            payload?: undefined;
        }>(contextName: keyof AllContexts & string, type: Action_3["type"], payload?: null, maxAnswers?: number): Action_3["value"][];
        hasContext(name: keyof AllContexts & string): boolean;
        getContext(name: keyof AllContexts & string, onlyTypes?: UIContextAttach): UIContext | null | undefined;
        getContexts(onlyNames?: RecordableType<keyof AllContexts & string> | null, onlyTypes?: UIContextAttach): Partial<Record<string, UIContext | null>>;
        overrideContext(name: string, context: UIContext | null | undefined, refresh?: boolean): void;
        overrideContexts(tunnels: Record<string, UIContext | null | undefined>, refresh?: boolean): void;
        createContext(data: any, overrideWithName?: string, refreshIfOverriden?: boolean): UIContext;
        createContexts(allData: any, overrideForSelf?: boolean, refreshIfOverriden?: boolean): Record<string, UIContext>;
        createWired(func: UIComponent, builder: (...params: any[]) => Dictionary, mixer: (baseProps: Dictionary, addsProps: Dictionary, ...params: any[]) => Dictionary, ...params: any[]): UIWiredType;
        render(): UIRenderOutput | UILiveFunction<Props, State, ContextData, AllContexts>;
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
    queryDomElement<T extends Element = Element>(treeNode: GroundedTreeNode, selector: string, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T | null;
    queryDomElements<T_1 extends Element = Element>(treeNode: GroundedTreeNode, selector: string, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T_1[];
    findTreeNodes(treeNode: GroundedTreeNode, types: RecordableType<GroundedTreeNodeType>, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): GroundedTreeNode[];
};
declare const UILive_base: {
    new (props: {}, ...args: any[]): {
        readonly props: {};
        state: {};
        context: {};
        readonly wired: Set<UIWiredType<{}, {}, {}, any[], (lastProps: {} | null, ...params: any[]) => {}, (baseProps: {}, addsProps: {}, ...params: any[]) => {}>> | null;
        readonly boundary: UILiveSource<{}, {}>;
        updateModes: Partial<UIUpdateCompareModesBy>;
        /** The boundary enveloping us - basically we just provide render function for it, and have slots for callbacks. */
        _timers?: Map<any, number> | undefined;
        update(forceUpdate?: boolean | "all" | undefined, forceUpdateTimeout?: number | null | undefined, forceRenderTimeout?: number | null | undefined): void;
        setState(newState: {} | Pick<{}, never>, forceUpdate?: boolean | "all" | undefined, forceUpdateTimeout?: number | null | undefined, forceRenderTimeout?: number | null | undefined): void;
        setInState(property: never, value: any, forceUpdate?: boolean | "all" | undefined, forceUpdateTimeout?: number | null | undefined, forceRenderTimeout?: number | null | undefined): void;
        addTimer(timerId: any, callback: () => void, timeout: number, bindThis?: boolean): void;
        hasTimer(timerId: any): boolean;
        clearTimer(timerId: any): void;
        clearTimers(onlyTimerIds?: any[] | undefined): void;
        isMounted(): boolean;
        queryDomElement(selector: string, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): Element | null;
        queryDomElements(selector: string, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): Element[];
        findDomNodes(maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): Node[];
        findBoundaries(maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): UISourceBoundary[];
        findTreeNodes(types: RecordableType<GroundedTreeNodeType>, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): GroundedTreeNode[];
        /** Get the actual contentPass childDefs. If used will mark needsChildren temporarily (until next render).
         *   .. When used, reads the children from the content pass.
         *   .. Also marks that the function "needs children", so will be re-rendered if children change.
         * - Note that for just passing the content, always use uiDom.Content.
         *   .. Only use .getChildren() if you really need it. For example, to wrap each individually or read info from their defs.
         */
        getChildren(skipNeeds?: boolean, shallowCopy?: boolean): readonly UIDefTarget[];
        /** Define for the remaining lifecycle if should update when content closure updates.
         * - If boolean given it forces the mode.
         * - If null | undefined or "temp", then clears on each render start, and sets to "temp" on using .getChildren(). */
        needsChildren(needs?: boolean | "temp" | null | undefined): void;
        initContext(initContext: {}, ...needsContexts: Record<never, string | boolean | string[]>[]): void;
        needsContext(name: never, needs?: string | boolean | string[], refresh?: boolean): void;
        needsContexts(...names: Record<never, string | boolean | string[]>[]): void;
        needsAction(contextName: never, actionType: string, needs?: boolean | undefined): void;
        needsActions(contextName: never, actionTypes?: boolean | string[], extend?: boolean | undefined): void;
        setContextData(contextName: never, data: any, extend?: boolean, refresh?: boolean, forceTimeout?: number | null | undefined): void;
        setInContextData(contextName: never, dataKey: string, data: any, extend?: boolean, refresh?: boolean, forceTimeout?: number | null | undefined): void;
        getContextData(contextName: never, noContextFallback?: any): any;
        getInContextData(contextName: never, dataKey: string, noContextFallback?: any): any;
        refreshInContext(contextName: never, refreshKeys?: string | boolean | string[], forceTimeout?: number | null | undefined): void;
        dispatchAction(contextName: never, action: UIActions & {
            value?: undefined;
        }, asAction?: "" | "post" | "quick" | undefined, forceTimeout?: number | null | undefined): void;
        dispatchActionWith(contextName: never, actionType: string, payload: any, asAction?: "" | "post" | "quick" | undefined, forceTimeout?: number | null | undefined): void;
        dispatchQuestion(contextName: never, question: UIAction & {
            value: any;
        }, defaultValue?: any): any;
        dispatchQuestionWith<Action extends UIAction & {
            value: any;
        }>(contextName: never, type: Action["type"], payload: Action["payload"], defaultValue?: any, maxAnswers?: number | undefined): Action["value"];
        dispatchQuestionWith<Action_1 extends UIAction & {
            value: any;
        } & {
            payload?: undefined;
        }>(contextName: never, type: Action_1["type"], payload?: null | undefined, defaultValue?: any, maxAnswers?: number | undefined): Action_1["value"];
        dispatchQuestionary(contextName: never, question: UIActions & UIAction & {
            value?: any;
            values: any[];
        }, maxAnswers?: number): any[];
        dispatchQuestionaryWith<Action_2 extends UIAction & {
            value: any;
        }>(contextName: never, type: Action_2["type"], payload: Action_2["payload"], maxAnswers?: number | undefined): Action_2["value"][];
        dispatchQuestionaryWith<Action_3 extends UIAction & {
            value: any;
        } & {
            payload?: undefined;
        }>(contextName: never, type: Action_3["type"], payload?: null | undefined, maxAnswers?: number | undefined): Action_3["value"][];
        hasContext(name: never): boolean;
        getContext(name: never, onlyTypes?: UIContextAttach): UIContext<any, {}> | null | undefined;
        getContexts(onlyNames?: RecordableType<never> | null | undefined, onlyTypes?: UIContextAttach | undefined): Partial<Record<string, UIContext<any, {}> | null>>;
        overrideContext(name: string, context: UIContext<any, {}> | null | undefined, refresh?: boolean): void;
        overrideContexts(tunnels: Record<string, UIContext<any, {}> | null | undefined>, refresh?: boolean): void;
        createContext(data: any, overrideWithName?: string | undefined, refreshIfOverriden?: boolean): UIContext<any, {}>;
        createContexts(allData: any, overrideForSelf?: boolean, refreshIfOverriden?: boolean): Record<string, UIContext<any, {}>>;
        createWired(func: UIComponent<{}>, builder: (...params: any[]) => Dictionary<string, any>, mixer: (baseProps: Dictionary<string, any>, addsProps: Dictionary<string, any>, ...params: any[]) => Dictionary<string, any>, ...params: any[]): UIWiredType<{}, {}, {}, any[], (lastProps: {} | null, ...params: any[]) => {}, (baseProps: {}, addsProps: {}, ...params: any[]) => {}>;
        render(): UILiveFunction<{}, {}, {}, {}> | UIRenderOutput;
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
    queryDomElement<T extends Element = Element>(treeNode: GroundedTreeNode, selector: string, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T | null;
    queryDomElements<T_1 extends Element = Element>(treeNode: GroundedTreeNode, selector: string, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T_1[];
    findTreeNodes(treeNode: GroundedTreeNode, types: RecordableType<GroundedTreeNodeType>, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: ((treeNode: GroundedTreeNode) => any) | undefined): GroundedTreeNode[];
};
interface UILive<Props extends Dictionary = {}, State extends Dictionary = {}, ContextData extends Dictionary = {}, AllContexts extends UIAllContexts = {}, Actions extends AllContexts[keyof AllContexts]["Actions"] = AllContexts[keyof AllContexts]["Actions"]> {
    readonly props: Props;
    state: State;
    context: ContextData;
    readonly wired: Set<UIWiredType> | null;
    /** The boundary enveloping us - basically we just provide render function for it, and have slots for callbacks. */
    readonly boundary: UILiveSource;
    /** If any is undefined / null, then uses the default from uiHost.settings. */
    updateModes: Partial<UIUpdateCompareModesBy>;
    _timers?: Map<any, number>;
    update(forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    setState<Key extends keyof State>(newState: Pick<State, Key> | State, forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    setInState<Key extends keyof State>(property: Key, value: State[Key], forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    addTimer(timerId: any, callback: () => void, timeout: number, bindThis?: boolean): void;
    hasTimer(timerId: any): boolean;
    clearTimer(timerId: any): void;
    clearTimers(onlyTimerIds?: any[]): void;
    isMounted(): boolean;
    queryDomElement<T extends Element = Element>(selector: string, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T | null;
    queryDomElements<T extends Element = Element>(selector: string, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T[];
    findDomNodes<T extends Node = Node>(maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: (treeNode: GroundedTreeNode) => any): T[];
    findBoundaries(maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: (treeNode: GroundedTreeNode) => any): UISourceBoundary[];
    findTreeNodes(types: RecordableType<GroundedTreeNodeType>, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: (treeNode: GroundedTreeNode) => any): GroundedTreeNode[];
    /** Get the actual contentPass childDefs.
     * - Will also mark needsChildren temporarily (until next render), unless skipNeeds is true.
     * - By default shallowCopy is true, so will .slice() the children.
     * - Note that you should NEVER modify the children defs - only read. */
    getChildren(skipNeeds?: boolean, shallowCopy?: boolean): Readonly<UIDefTarget[]>;
    /** Define for the remaining lifecycle if should update when content closure updates. */
    needsChildren(needs?: boolean | null): void;
    /** This allows to set the initial q.context (by the first argument), and then define the context needs by calling q.needsContexts with the rest of the arguments, if any.
     * - Note that you don't need to call this, but it can be convenient if you want to define the initial state. Of course you can just define it by: `q.context = context;` */
    initContext<Name extends keyof AllContexts & string>(initContext: ContextData, ...needsContexts: (Name | Record<Name, boolean | string | string[]>)[]): void;
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
    /** Call to define depencies on a single action.
     * If needs is false, then removes the need for this action - undefined or true adds.
     * Note that you should also assign the callback for uponAction or uponQuestion for questions. */
    needsAction<Name extends keyof AllContexts & string>(contextName: Name, actionType: AllContexts[Name]["Actions"]["type"] & string, needs?: boolean): void;
    /** Call to define depencies on multiple actions.
     * If extend is true, extends the previously set needs - otherwise (by default) resets the needs to the given.
     * Note that you should also assign the callbacks for uponAction and/or uponQuestion. */
    needsActions<Name extends keyof AllContexts & string>(contextName: Name, actionTypes: (AllContexts[Name]["Actions"]["type"] & string)[] | boolean, extend?: boolean): void;
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
    dispatchAction<Name extends keyof AllContexts & string>(contextName: Name, action: AllContexts[Name]["Actions"] & {
        value: never;
    }, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
    /** Dispatch an action within the context by declaring it on the go with type and payload. */
    dispatchActionWith<Name extends keyof AllContexts & string, Actions extends AllContexts[Name]["Actions"] & {
        value: never;
    }, Type extends Actions["type"], Action extends Actions & {
        type: Type;
    }>(contextName: Name, actionType: Type, payload: Action["payload"], asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
    dispatchActionWith<Name extends keyof AllContexts & string, Actions extends AllContexts[Name]["Actions"] & {
        value: never;
    }, Type extends (Actions & {
        payload?: never;
    })["type"]>(contextName: Name, actionType: Type, payload?: undefined, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
    /** Dispatch a question in the context.
     * - You get the answer synchronously by the return value (comes from the first answerer, then stops going further).
     * - If there's no answerers, or no context found, then returns the optional defaultValue (or from question.value) - or then undefined.
     * - Note that dispatching a question also modifies the original question by adding .value into it with the collected answer. */
    dispatchQuestion<Name extends keyof AllContexts & string, Action extends AllContexts[Name]["Actions"] & (UIQuestion | UIQuestionary)>(contextName: Name, question: Action & {
        value?: Action["value"];
    }, value?: Action["value"]): Action["value"] | undefined;
    /** Dispatch a questionary (of one question with many answers) in the context.
     * - You get the answers synchronously by the return value (comes from all the answerers).
     * - If there's no answerers, or no context found, then returns an empty array.
     * - Note that dispatching a questionary also modifies the original question by adding .value and .values into it.
     *   .. If any answered, the last answer be found as .value. (If none, .value is not added.) */
    dispatchQuestionary<Name extends keyof AllContexts & string, Action extends AllContexts[Name]["Actions"] & (UIQuestion | UIQuestionary)>(contextName: Name, question: Action & {
        value?: Action["value"];
    }, maxAnswers?: number): Action["value"][];
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
    createContexts<Contexts extends {
        [Name in keyof AllData]: UIContext<AllData[Name]>;
    }, AllData extends {
        [Name in keyof Contexts]: Contexts[Name]["data"];
    } = {
        [Name in keyof Contexts]: Contexts[Name]["data"];
    }>(allData: AllData, overrideForSelf?: never | false | undefined, refreshIfOverriden?: never | false): Contexts;
    createContexts<Name extends keyof AllContexts & string>(allData: Partial<Record<Name, AllContexts[Name]["data"]>>, overrideForSelf: true, refreshIfOverriden?: boolean): Partial<Record<Name, AllContexts[Name]["data"]>>;
    /** Creates a wired renderer.
     * - Technically creates a class that behaves like UILive (or actually more like UIMiniFunction as a class).
     *     1. This class serves as the common portion for all class instances that will be wrapped in their own boundaries when grounded.
     *     2. This class can then allow to set and refresh the common props, and trigger should-updates for all the instances.
     *     3. The props of the actual class instances are mixed with the wiredProps defined by this class.
     * - Note that when creates a wired renderer through this method (on a live component), it will automatically update whenever this component is checked for should-updates.
     * - Note that in the UILive context, you should always have builderOrProps or mixer. (Otherwise makes no sense to hook up to component's updates.) */
    createWired<BaseProps extends Dictionary = {}, WiredProps extends Dictionary = {}, MixedProps extends Dictionary = BaseProps & WiredProps, Params extends any[] = any[], Builder extends (lastProps: WiredProps | null, ...params: Params) => WiredProps = (lastProps: WiredProps | null, ...params: Params) => WiredProps, Mixer extends (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps = (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps>(funcOrClass: UIComponent<MixedProps>, builderOrProps: Builder | WiredProps | null, mixer?: Mixer, ...params: Params): UIWiredType<BaseProps, WiredProps, MixedProps, Params, Builder, Mixer>;
    /** The most important function of a UILive: the render output function. */
    render(props: Props, ui: ThisType<this>): UIRenderOutput | UILiveFunction<Props, State, ContextData, AllContexts>;
    render(): UIRenderOutput | UILiveFunction<Props, State, ContextData, AllContexts>;
    /** Override this to listen to actions - originated by dispatchAction call on the context. */
    uponAction?<Name extends keyof AllContexts & string, Context extends AllContexts[Name]>(action: Context["Actions"], context: Context, name: Name): void;
    /** Override this to answer to questions - asked by dispatchQuestion call on the context. */
    uponQuestion?<Name extends keyof AllContexts & string, Context extends AllContexts[Name], Action extends Context["Actions"] & UIQuestion<Action["value"]>>(action: Action, context: Context, name: Name): Action["value"];
    /** Override this with the actual method to build the context for this particular component. */
    buildContext?(all: UIAllContextsDataWithNull<AllContexts>, contexts: UIAllContextsWithNull<AllContexts>): ContextData;
    onContextChange?<Name extends keyof AllContexts & string>(name: Name, newContext: AllContexts[Name] | null, oldContext: AllContexts[Name] | null): boolean | null;
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
declare class UILive<Props extends Dictionary = {}, State extends Dictionary = {}, ContextData extends Dictionary = {}, AllContexts extends UIAllContexts = {}> extends UILive_base {
    constructor(props: Props, ...args: any[]);
}
declare type UILiveType<Props extends Dictionary = {}, State extends Dictionary = {}, ContextData extends Dictionary = {}, AllContexts extends UIAllContexts = {}> = {
    new (_props: Props | null): UILive<Props, State, ContextData, AllContexts>;
    readonly UI_DOM_TYPE: "Live";
    queryDomElement<T extends Element = Element>(treeNode: GroundedTreeNode, selector: string, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T | null;
    queryDomElements<T extends Element = Element>(treeNode: GroundedTreeNode, selector: string, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean): T[];
    findTreeNodes(treeNode: GroundedTreeNode, types: RecordableType<GroundedTreeNodeType>, maxCount?: number, allowWithinBoundaries?: boolean, allowOverHosts?: boolean, validator?: (treeNode: GroundedTreeNode) => any): GroundedTreeNode[];
};
declare const createLive: <Props extends Dictionary<string, any> = {}, State extends Dictionary<string, any> = {}, Context extends Dictionary<string, any> = {}, AllContexts extends UIAllContexts = {}>(func: (q: UILive<Props, State, Context, AllContexts, AllContexts[keyof AllContexts]["Actions"]>, props: Props) => UIRenderOutput | UILiveFunction<Props, State, Context, AllContexts>) => UILiveFunction<Props, State, Context, AllContexts>;

declare class UIContextApi<AllContexts extends UIAllContexts = {}, ContextData extends Dictionary = {}> {
    boundary: UILiveSource<AllContexts, ContextData>;
    contextNeeds: Map<string, string[] | boolean>;
    actionNeeds: Map<string, Set<string> | boolean>;
    /** The contexts the component has overridden itself.
     * .. This is typically used for tunneling purposes, when the component wants to be part of the context it created.
     * .. This is optional because, it's quite rarely used.
     * .... But when using contexts for tunneling, sometimes wants to talkback to parent with actions or share part of the context. */
    overriddenContexts?: Record<string, UIContext | null>;
    constructor(boundary: UILiveSource<AllContexts, ContextData>);
    needsAction(contextName: keyof AllContexts & string, actionType: string, needs?: boolean): void;
    /** Set action needs as a whole.
     * - If actionTypes is a boolean, functions in reset mode regardless of the reset setting.
     * - In reset mode, resets the actionNeeds to given set or boolean.
     * - Otherwise modifies the actionNeeds by adding new entries into it. (Cannot be used to remove many.) */
    needsActions(contextName: keyof AllContexts & string, actionTypes?: string[] | boolean, extend?: boolean): void;
    /** Use this to set the optional data refresh keys - resets the current keys for that context.
     * - There can be one or many keywords, or true to allow anything (default). If false, then removes needs.
     * - Will match with the given refresh keys or if is nested deeper - ie. starts with the key + "." */
    needsContext(name: string, needs?: boolean | string | string[], refreshIfChanged?: boolean): void;
    /** This resets the needs by the given record. */
    needsContexts(needs: Record<string, boolean | string | string[]>, refreshIfChanged?: boolean): void;
    /** If undefined, will remove the overridden state. Returns whether contextual refresh should be made. */
    overrideContext(name: string, context: UIContext | null | undefined, refresh?: boolean): UIContextRefresh;
    overrideContexts(contexts: Record<string, UIContext | null | undefined>, refresh?: boolean): UIContextRefresh;
    /** Returns undefined if not found, otherwise UIContext | null. */
    getContext(name: string, onlyTypes?: UIContextAttach): UIContext | null | undefined;
    /** Get contexts by types. Give flags to allow only certain types, see UIContextAttach flags. */
    getContexts(onlyNames?: RecordableType<keyof AllContexts & string> | null, onlyTypes?: UIContextAttach): Record<string, UIContext | null>;
    updateContext(forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    rebuildContext(): void;
}

declare class UIContentApi {
    /** If sets, overrides the temporary childrenNeeded value. */
    childrenNeeds?: boolean | "temp";
    constructor(readChildren?: ((shallowCopy?: boolean) => UIDefTarget[] | null) | null);
    /** This should be assigned by the boundary and read the children directly. */
    private readChildren;
    /** Get the actual contentPass childDefs. If used will mark needsChildren temporarily (until next render).
     *   .. When used, reads the children from the content pass.
     *   .. Also marks that the function "needs children", so will be re-rendered if children change.
     * - Note that for just passing the content, always use uiDom.Content.
     *   .. Only use .getChildren() if you really need it. For example, to wrap each individually or read info from their defs.
     */
    getChildren(skipNeeds?: boolean, shallowCopy?: boolean): Readonly<UIDefTarget[]> | null;
    /** Define for the remaining lifecycle if should update when content closure updates.
     * If null falls back to the .getChildren() based approach. */
    needsChildren(needs?: boolean | "temp" | null): void;
}

declare class UIContentClosure {
    thruBoundary: UISourceBoundary | UIContentBoundary;
    sourceBoundary: UISourceBoundary | null;
    envelope: UIContentEnvelope | null;
    truePassDef: UIDefApplied | null;
    groundedDefsMap: Map<UIDefApplied, [UISourceBoundary | UIContentBoundary, GroundedTreeNode, any]>;
    pendingDefs: Set<UIDefApplied>;
    constructor(thruBoundary: UISourceBoundary, sourceBoundary?: UISourceBoundary | null);
    contentGrounded(groundingDef: UIDefApplied, gBoundary: UISourceBoundary | UIContentBoundary, treeNode: GroundedTreeNode, copyKey?: any): UIChangeInfos;
    contentUngrounded(groundingDef: UIDefApplied): [UIDomRenderInfo[], UISourceBoundaryChange[]];
    preRefresh(newEnvelope: UIContentEnvelope | null): UISourceBoundary[];
    applyRefresh(forceUpdate?: boolean): UIChangeInfos;
    /** This is the method that makes stuff inside content closures concrete.
     * - For true ContentPass (see copies below), the situation is very distinguished:
     *   1. Because we are in a closure, our target defs have already been mapped to applied defs and new defs created when needed.
     *   2. However, the treeNode part of the process was not handled for us. So we must do it now.
     *   3. After having updated treeNodes and got our organized toApplyPairs, we can just feed them to _Apply.applyDefPairs to get renderInfos and boundaryUpdates.
     * - Behaviour on uiDom.ContentCopy (and multi uiDom.ContentPass).
     *   1. The situation is very different from ContentPass, because we don't have a set of pre-mangled applied defs.
     *   2. Instead we do actually do a very similar process to _Apply.runBoundaryUpdate, but without boundary and without rendering.
     *   3. For future updates, we can reuse the appliedDef for each copy - the copies can also be keyed.
     */
    private applyContentDefs;
}

declare class UIBaseBoundary {
    /** The def that defined this boundary to be included. This also means it contains our last applied props. */
    _outerDef: UIDefApplied;
    /** The _innerDef is the root def for what the boundary renders inside - or passes inside for content boundaries.
     * - Note that the _innerDef is only null when the boundary renders null. For content boundaries it's never (they'll be destroyed instead). */
    _innerDef: UIDefApplied | null;
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
    baseTreeNode: GroundedTreeNode;
    /** The sourceBoundary refers to the original UISourceBoundary who defined us.
     * - Due to content passing, it's not necessarily our .parentBoundary, who is the one who grounded us to the tree.
     * - For the rootBoundary of a uiHost, there's no .sourceBoundary, but for all nested, there always is. */
    sourceBoundary: UISourceBoundary | null;
    /** The parentBoundary ref is very useful for going quickly up the boundary tree - the opposite of .innerBoundaries. */
    parentBoundary: UISourceBoundary | UIContentBoundary | null;
    /** Any source or content boundaries inside that we have directly grounded in tree order - updated during every update run (don't use during). */
    innerBoundaries: (UISourceBoundary | UIContentBoundary)[];
    /** These are contexts inherited from the parent. */
    outerContexts: Record<string, UIContext | null>;
    _outerContextsWere?: Record<string, UIContext | null>;
    constructor(uiHost: UIHost, outerDef: UIDefApplied, baseTreeNode: GroundedTreeNode);
    getRootTreeNodes(): GroundedTreeNode[];
    getTreeNodesForDomRoots(inNestedBoundaries?: boolean, includeEmpty?: boolean): GroundedTreeNodeDom[];
    /** This gets the first rooted dom element. */
    getRootDomNode(): Node | null;
    /** This gets the dom elements that are rooted. Typically it's just one, but due to fragments (with nested components), it might be several.
     * .. So for example when inserting the component into dom, we must get them all. (On unmounting, it's happens more naturally.)
     * .. For most technical purposes, you want to include the hidden <noscript/> elements.
     * .. For end user purposes, they are more often interested in what is actually visible, so includeHidden is defaulted to false. */
    getRootDomNodes(inNestedBoundaries?: boolean): Node[];
    /** This gets all dom nodes that belong to this boundary. */
    getAllDomNodes(includeOurPassFurther?: boolean, includePassedToUs?: boolean): Node[];
}
declare class UIContentBoundary extends UIBaseBoundary {
    /** The def whose children define our content - we are a fragment-like container. */
    targetDef: UIDefTarget;
    /** Redefine that we always have it. It's based on the targetDef. */
    _innerDef: UIDefApplied;
    /** Redefine that we always have a host for content boundaries - for us, it's the original source of our rendering.
     * Note that the content might get passed through many boundaries, but now we have landed it. */
    sourceBoundary: UISourceBoundary;
    /** Redefine that we always have a boundary that grounded us to the tree - we are alive because of it.
     * - Note that it gets assigned (externally) immediately after constructor is called.
     * - The parentBoundary ref is very useful for going quickly up the boundary tree - the opposite of .innerBoundaries. */
    parentBoundary: UISourceBoundary | UIContentBoundary;
    /** Just for typescript: UIContentBoundary never has a contextApi - it's just a pass-through boundary. */
    contextApi?: never;
    /** Just for typescript: UIContentBoundary never has a contentApi - it's just a pass-through boundary. */
    contentApi?: never;
    live?: never;
    mini?: never;
    /** Content boundaries will never feature this. So can be used for checks to know if is a source. */
    uiId?: never;
    constructor(outerDef: UIDefApplied, targetDef: UIDefTarget, treeNode: GroundedTreeNode, sourceBoundary: UISourceBoundary);
    updateEnvelope(targetDef: UIDefTarget, truePassDef?: UIDefApplied | null): void;
}
/** This is what "contains" a component (= a uiDom class instance or a uiDom render function).
 * .. It's the common interface for technical as well as advanced API interfacing. */
declare class UISourceBoundary extends UIBaseBoundary {
    /** Implies if has ever rendered yet.
     * .. Needed for LiveFunctions to know if should call .onContextChange right after first render.
     * .. Because with the double render function, it's the first render call where things are initialized. */
    _isVirgin?: true;
    /** Temporary rendering state indicator. */
    _renderingState?: "active" | "re-updated";
    /** Temporary collection of preUpdates - as the update data are always executed immediately. */
    _preUpdates?: UILiveNewUpdates;
    /** Our uiHost based quick id. It's mainly used for sorting, and sometimes to detect whether is content or source boundary, helps in debugging too. */
    uiId: UISourceBoundaryId;
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
    /** Has a contentClosure if there were any content passed to us. */
    contentClosure: UIContentClosure;
    constructor(uiHost: UIHost, outerDef: UIDefApplied, baseTreeNode: GroundedTreeNode, sourceBoundary?: UISourceBoundary);
    reattach(clear?: boolean): void;
    update(forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    updateBy(updates: UILiveNewUpdates, forceUpdate?: boolean | "all", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    render(iRecursion?: number): UIRenderOutput;
}
interface UILiveSource<AllContexts extends UIAllContexts = {}, ContextData extends Dictionary = {}> extends UISourceBoundary {
    contextApi: UIContextApi<AllContexts, ContextData>;
    live: UILive<{}, {}, ContextData, AllContexts, {}>;
}

declare function UIRefMixin<Type extends Node | UISourceBoundary = Node | UISourceBoundary>(Base: ClassType): {
    new (...args: any[]): {
        attachedTo: Set<GroundedTreeNode>;
        /** This gets the last reffed treeNode.
         * - It works as if the behaviour was to always override with the last one.
         * - Except that if the last one is removed, falls back to earlier existing. */
        getTreeNode(): GroundedTreeNode | null;
        getTreeNodes(): GroundedTreeNode[];
        getDomNode(onlyForDomRefs?: boolean): (Type & Node) | null;
        getDomNodes(onlyForDomRefs?: boolean): Array<Type & Node>;
        getRefBoundary(): (Type & UISourceBoundary) | null;
        getRefBoundaries(): Array<Type & UISourceBoundary>;
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
    didAttachOn(ref: UIRef, treeNode: GroundedTreeNode): void;
    willDetachFrom(ref: UIRef, treeNode: GroundedTreeNode): void;
};
declare const UIRef_base: {
    new (...args: any[]): {
        attachedTo: Set<GroundedTreeNode>;
        /** This gets the last reffed treeNode.
         * - It works as if the behaviour was to always override with the last one.
         * - Except that if the last one is removed, falls back to earlier existing. */
        getTreeNode(): GroundedTreeNode | null;
        getTreeNodes(): GroundedTreeNode[];
        getDomNode(onlyForDomRefs?: boolean): ((Node | UISourceBoundary) & Node) | null;
        getDomNodes(onlyForDomRefs?: boolean): ((Node | UISourceBoundary) & Node)[];
        getRefBoundary(): ((Node | UISourceBoundary) & UISourceBoundary) | null;
        getRefBoundaries(): ((Node | UISourceBoundary) & UISourceBoundary)[];
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
    didAttachOn(ref: UIRef<Node | UISourceBoundary>, treeNode: GroundedTreeNode): void;
    willDetachFrom(ref: UIRef<Node | UISourceBoundary>, treeNode: GroundedTreeNode): void;
};
interface UIRef<Type extends Node | UISourceBoundary = Node | UISourceBoundary> {
    /** The collection (for clarity) of tree nodes where is attached to.
     * It's not needed internally but might be useful for custom needs. */
    attachedTo: Set<GroundedTreeNode>;
    /** This gets the last reffed treeNode.
     * - It works as if the behaviour was to always override with the last one.
     * - Except that if the last one is removed, falls back to earlier existing. */
    getTreeNode(): GroundedTreeNode | null;
    getTreeNodes(): GroundedTreeNode[];
    getDomNode(onlyForDomRefs?: boolean): Type & Node | null;
    getDomNodes(onlyForDomRefs?: boolean): Array<Type & Node>;
    getRefBoundary(): Type & UISourceBoundary | null;
    getRefBoundaries(): Array<Type & UISourceBoundary>;
    domDidAttach?(domNode: Type & Node): void;
    domWillDetach?(domNode: Type & Node): void;
    domDidMount?(domNode: Type & Node): void;
    domDidMove?(domNode: Type & Node, fromContainer: Node | null, fromNextSibling: Node | null): void;
    domDidUpdate?(domNode: Type & Node, diffs: UIHTMLDiffs): void;
    domDidContent?(domNode: Type & Node, simpleContent: UIContentSimple | null): void;
    /** Return true to salvage the element: won't be removed from dom.
     * This is only useful for fade out animations, when the parenting elements also stay in the dom (and respective children). */
    domWillUnmount?(domNode: Type & Node): boolean | void;
    uiDidAttach?(boundary: Type & UISourceBoundary): void;
    uiWillDetach?(boundary: Type & UISourceBoundary | UIContentBoundary): void;
    uiDidMount?(boundary: Type & UISourceBoundary): void;
    uiDidMove?(boundary: Type & UISourceBoundary): void;
    uiWillUnmount?(boundary: Type & UISourceBoundary): void;
}
declare class UIRef<Type extends Node | UISourceBoundary = Node | UISourceBoundary> extends UIRef_base {
}
declare type UIRefType<Type extends Node | UISourceBoundary = Node | UISourceBoundary> = {
    new (): UIRef<Type>;
    readonly UI_DOM_TYPE: "Ref";
    didAttachOn(ref: UIRef, treeNode: GroundedTreeNode): void;
    willDetachFrom(ref: UIRef, treeNode: GroundedTreeNode): void;
};

declare class UISpread<Props extends Dictionary = {}> {
    constructor(_props?: Props | null);
    /** The renderer function to spread out the contents. */
    static render: UISpreadFunction;
    /** The function to unfold the contents. Will be overridden by createSpread procedure. */
    static unfold(_props: Dictionary, _childDefs: UIDefTarget[]): UIDefTarget | null;
    /** The universal method to unfold the spread. (The others are static too but based on an extending class.)
     * The contents are the cleaned childDefs that should replace any content pass. */
    static unfoldWith(targetDef: UIDefTarget, contents: UIDefTarget[], keyScope: any): UIDefTarget | null;
}
/** UISpread is a totally static functionality. */
interface UISpread {
}
declare type UISpreadType<Props extends Dictionary = {}> = {
    new (_props?: Props | null): UISpread<Props>;
    /** The renderer function to spread out the contents. */
    render: UISpreadFunction;
    /** The function to unfold the contents. Will be overridden by createSpread procedure. */
    unfold(_props: Dictionary, _childDefs: UIDefTarget[]): UIDefTarget | null;
    /** The universal method to unfold the spread. (The others are static too but based on an extending class.)
     * The contents are the cleaned childDefs that should replace any content pass. */
    unfoldWith(targetDef: UIDefTarget, contents: UIDefTarget[], keyScope: any): UIDefTarget | null;
};
declare const createSpread: <Props extends Dictionary<string, any> = {}>(func: UISpreadFunction<Props>) => {
    new (_props?: Props | null | undefined): {};
    render: UISpreadFunction<Props>;
    /** The unfold method unique to this particular UISpread extended class. */
    unfold(props: Props, childDefs: UIDefTarget[]): UIDefTarget | null;
    /** The universal method to unfold the spread. (The others are static too but based on an extending class.)
     * The contents are the cleaned childDefs that should replace any content pass. */
    unfoldWith(targetDef: UIDefTarget, contents: UIDefTarget[], keyScope: any): UIDefTarget | null;
};

declare type UIFragmentProps = UIGenericProps<{
    needsChildren?: boolean;
}>;
declare class UIFragment {
    constructor(_props?: UIFragmentProps | null);
}
declare type UIFragmentType = {
    new (_props?: UIFragmentProps | null): UIFragment;
};
declare type UIPortalProps = UIGenericProps & {
    container: Node | null;
    content?: UIRenderOutput;
};
declare class UIPortal {
    constructor(_props?: UIPortalProps);
}
declare type UIPortalType = {
    new (_props?: UIPortalProps): UIPortal;
};
declare type UIElementProps<Type extends HTMLTags = HTMLTags> = UIGenericProps & UIHTMLProps<Type> & {
    element: HTMLElement | SVGElement | null;
    /** Determines what happens when meeting duplicates. If == null, uses the uiHost based setting.
     * - If boolean, then is either "deep" or nothing. */
    cloneMode?: boolean | UICloneNodeBehaviour | null;
};
declare class UIElement<Type extends HTMLTags = HTMLTags> {
    constructor(_props?: UIElementProps<Type>);
}
declare type UIElementType<Type extends HTMLTags = HTMLTags> = {
    new (_props?: UIElementProps): UIElement<Type>;
};

declare type NullLike = null | undefined;
declare type ClassType<T = Object> = new (...args: any[]) => T;
declare type Dictionary<K extends string = string, V = any> = Record<K, V>;
declare type RecordableType<K extends string> = Partial<Dictionary<K>> | Array<K> | Set<K>;
declare type NonDictionary = Array<any> | Set<any> | Map<any, any>;
declare type HTMLTags = keyof HTMLElementTagNameMap;
declare type HTMLElementType<Type extends HTMLTags = HTMLTags> = HTMLElementTagNameMap[Type];
declare type HTMLAttributesAll<Type extends HTMLTags = HTMLTags> = Record<keyof HTMLElementType<Type>, HTMLElementType<Type>[keyof HTMLElementType]>;
declare type HTMLAttributes<Type extends HTMLTags = HTMLTags> = Partial<HTMLAttributesAll<Type>>;
declare type HTMLAttributesWithStyle<Type extends HTMLTags = HTMLTags> = HTMLAttributes<Type> & {
    style?: CSSProperties | string;
};
declare type CSSProperties = Partial<CSSStyleDeclaration>;
declare type DomElement = HTMLElement | SVGElement;
declare type UIHTMLProps<Type extends HTMLTags = HTMLTags, T = {}> = {
    class?: string;
    className?: string;
    style?: CSSProperties | string;
} & HTMLAttributes<Type> & HTMLListenerAttributes & T;
declare type UIHTMLPostProps<Props = {}> = Props & {
    class?: string;
    style?: CSSProperties;
};
interface HTMLListenerAttributesAll {
    onAbort: GlobalEventHandlers["onabort"];
    onAnimationCancel: GlobalEventHandlers["onanimationcancel"];
    onAnimationEnd: GlobalEventHandlers["onanimationend"];
    onAnimationIteration: GlobalEventHandlers["onanimationiteration"];
    onAnimationStart: GlobalEventHandlers["onanimationstart"];
    onAuxClick: GlobalEventHandlers["onauxclick"];
    onBlur: GlobalEventHandlers["onblur"];
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
    onDragLeave: GlobalEventHandlers["ondragleave"];
    onDragOver: GlobalEventHandlers["ondragover"];
    onDragStart: GlobalEventHandlers["ondragstart"];
    onDrop: GlobalEventHandlers["ondrop"];
    onDurationChange: GlobalEventHandlers["ondurationchange"];
    onEmptied: GlobalEventHandlers["onemptied"];
    onEnded: GlobalEventHandlers["onended"];
    onError: GlobalEventHandlers["onerror"];
    onFocus: GlobalEventHandlers["onfocus"];
    onGotPointerCapture: GlobalEventHandlers["ongotpointercapture"];
    onInput: GlobalEventHandlers["oninput"];
    onInvalid: GlobalEventHandlers["oninvalid"];
    onKeyDown: GlobalEventHandlers["onkeydown"];
    onKeyPress: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
    onKeyUp: GlobalEventHandlers["onkeyup"];
    onLoad: GlobalEventHandlers["onload"];
    onLoadedData: GlobalEventHandlers["onloadeddata"];
    onLoadedMetaData: GlobalEventHandlers["onloadedmetadata"];
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
declare type HTMLListenerAttributeNames = keyof HTMLListenerAttributesAll;
declare type HTMLListenerAttributes = {
    [Name in keyof HTMLListenerAttributesAll]?: HTMLListenerAttributesAll[Name] | null;
};
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
declare type UIPreClassName<Valid extends string = string, Single extends string = Valid> = Single | Partial<Record<Valid, any>> | Array<Valid> | Set<Valid>;
declare type UIDomTag = keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap;
declare type UIBoundaryTag = ClassType<UILive> | ClassType<UIWired> | UIFunction;
declare type UIPreTag = ClassType<UIFragment> | ClassType<UIContext> | ClassType<UIElement> | ClassType<UIPortal> | UIDomTag | UIBoundaryTag;
declare type UIPostTag = "" | "_" | UIDomTag | UIBoundaryTag | null;
/** This tag conversion is used for internal tag based def mapping. The UIDefTarget is the uiDom.ContentPass. */
declare type UIDefKeyTag = UIPostTag | UIDefTarget | UIFragmentType | UIHost;
declare type UIMiniFunction<Props = {}> = (this: UIMini<Props>, props: Props) => UIRenderOutput | UIMiniFunction<Props>;
declare type UILiveFunction<Props = {}, State = {}, Context = {}, AllContexts extends UIAllContexts = {}> = (props: Props, ui: UILive<Props, State, Context, AllContexts>) => UIRenderOutput | UILiveFunction<Props, State, Context, AllContexts>;
declare type UILiveComponent<Props = {}, Component extends UILive = UILive> = (props: Props, ui: Component) => UIRenderOutput | UILiveComponent<Props, Component>;
declare type UISpreadFunction<Props = {}> = (props: Props) => UIRenderOutput;
declare type UIFunction<Props = {}> = UISpreadFunction<Props> | UIMiniFunction<Props> | UILiveFunction<Props>;
declare type UIBoundableFunction<Props = {}> = UILiveFunction<Props> | UIMiniFunction<Props>;
/** This is a shortcut for UIDom renderers that will be have their own boundary:
 * - Either based on UILive class/mixin, or
 * - Is a function: UILiveFunction | UIMiniFunction. */
declare type UIBoundable<Props = {}> = UILiveType<Props> | UIMiniType<Props> | UIBoundableFunction<Props>;
/** This is a shortcut for all valid UIDom renderers:
 * - Either based on UILive class/mixin (including UISpreadType), or
 * - Is a function: UILiveFunction | UIMiniFunction | UISpreadFunction (before conversion). */
declare type UIComponent<Props = {}> = UILiveType<Props> | UIBoundableFunction<Props> | ClassType<UISpread<Props>>;
declare type UIBoundary = UISourceBoundary | UIContentBoundary;
declare type UISourceBoundaryId = string;
declare type UIContextData = Dictionary | null;
declare type UIAction = {
    type?: string;
    payload?: any;
};
declare type UIQuestion<Value = any> = UIAction & {
    value: Value;
};
declare type UIQuestionary<Value = any> = UIAction & {
    value?: Value;
    values: Value[];
};
declare type UIActions = UIAction | UIQuestion;
declare type UIAllContexts = Record<string, UIContext<any, UIActions>>;
declare type UIAllContextsWithNull<AllContexts extends UIAllContexts> = {
    [Name in keyof AllContexts]: AllContexts[Name] | null;
};
declare type UIAllContextsDataWithNull<AllContexts extends UIAllContexts> = {
    [Name in keyof AllContexts]: AllContexts[Name]["data"] | null;
};
declare type UIAllContextsData<AllContexts extends UIAllContexts> = {
    [Name in keyof AllContexts]: AllContexts[Name]["data"];
};
declare type UIAllContextsActions<AllContexts extends UIAllContexts> = {
    [Name in keyof AllContexts]: AllContexts[Name]["Actions"];
};
/** Data listener. The listeners are run after the live component contextual calls are made. */
declare type UIUponData<Context extends UIContext = UIContext> = (data: Context["data"], context: Context) => void;
/** Action listener. The listeners are run after the live component contextual calls are made. */
declare type UIUponAction<Context extends UIContext = UIContext> = (action: Context["Actions"], context: Context) => void;
/** Action listener in the form of question answerer.
 * - Should return a valid answer to the question. */
declare type UIUponQuestion<Context extends UIContext = UIContext, Question extends Context["Actions"] & UIQuestion = Context["Actions"] & UIQuestion> = (question: Question & {
    value?: Question["value"];
}, context: Context) => Question["value"];
/** Action pre-listener - run immediately on dispatch.
 * - If returns false, the action will be cancelled from the normal flow (just pre-listeners).
 * - If returns true, the action will be marked as a post action, and called after the update-n-render cycle.
 * - Note that the return value is ignored for questions: if called with dispatchQuestion or dispatchQuestionary.
 *   .. This is because the questions are always asked. But in case you need to log the questions, so uses the same route.
 * - Note that if many assigned and many answer, the importance hierarchy is: "cancel" > "post" > "quick" (and likewise in regards to settings). */
declare type UIUponPreAction<Context extends UIContext = UIContext> = (action: Context["Actions"], context: Context) => "cancel" | "post" | "quick" | "" | void;
/** The flags for checking what kind of context change happened. */
declare enum UIContextRefresh {
    Data = 1,
    Actions = 2,
    Otherwise = 4,
    DoRefresh = 8,
    NoRefresh = 16,
    Contextual = 3,
    All = 7
}
/** The flags for each way to attach contexts. */
declare enum UIContextAttach {
    /** The contexts that are inserted somewhere up the TreeNode structure cascading down to us. */
    Cascading = 1,
    /** The contexts attached by the parent using the `ctxs` prop. */
    Parent = 2,
    /** The contexts manually overridden by `q.overrideContext()` or alike. */
    Overridden = 4,
    /** Shortcut for all types. */
    All = 7
}
declare type UIProps<T = {}> = {
    key?: any;
    /** Land one or many forwarded refs. */
    ref?: UIRef | UIRef[];
    /** Land one or many forwarded tunnels. */
    ctxs?: Record<string, UIContext | null>;
} & T;
declare type UIGenericProps<T = {}> = UIProps<T> & {
    class?: string;
    className?: string;
    style?: CSSProperties | string;
} & T;
/** Post props don't contain key, ref. In addition className and class have been merged, and style processed to a dictionary. */
declare type UIGenericPostProps<Props = {}> = Props & {
    class?: string;
    style?: CSSProperties;
};
declare type UIContentNull = NullLike;
declare type UIContentValue = string | number;
declare type UIContentSimple = UIContentValue | Node;
declare type UIRenderOutputSingle = UIDefTarget | UIContentSimple | UIContentNull | UIHost;
interface UIRenderOutputMulti extends Array<UIRenderOutputSingle | UIRenderOutputMulti> {
}
declare type UIRenderOutput = UIRenderOutputSingle | UIRenderOutputMulti;
interface UILiveUpdates<Props extends Dictionary = {}, State extends Dictionary | null = {}, Context extends Dictionary = {}> {
    props?: Props;
    state?: State;
    context?: Context;
    children?: UIDefTarget[];
}
interface UILiveNewUpdates<Props extends Dictionary = {}, State extends Dictionary | null = {}> {
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
declare type UIUpdateCompareMode = "always" | "changed" | "shallow" | "double" | "deep";
/** Defines how often UILives should update for each updatable type: props, state, context.
 * .. If type not defined, uses the default value for it.
 * .. Note that all the pure checks skip identity check on the root object. This is very improtant for context param.
 * .. Note that the pure checks only check those types that have just been changed.
 */
interface UIUpdateCompareModesBy {
    props: UIUpdateCompareMode;
    state: UIUpdateCompareMode;
    context: UIUpdateCompareMode;
    children: UIUpdateCompareMode;
}
/** Differences made to a dom element.
 * Note that this never includes tag changes, because that requires creating a new element. */
interface UIHTMLDiffs {
    /** If value is undefined means removed. */
    attrDiffs?: Dictionary;
    /** If value is undefined means removed. */
    styleDiffs?: CSSProperties;
    /** The keys are class names. For each, if true class name was added, if false name was removed. */
    classDiffs?: Record<string, boolean>;
}
/** This info is used for executing rendering changes to dom for a given appliedDef (which is modified during the process).
 * - If props is given it modifies the class, style and attributes of the element. This modifies the .domProps in the appliedDef.
 * - If create info is provided, creates a new dom element.
 * - If move info is provided, moves the given element to the new location.
 * - If hide is provided, removes the element from dom (and from appliedDef.domElement) and inserts in its place <noscript> (= appliedDef.hiddenDomRefElement).
 * - If destroy is provided, removes the element from dom and from appliedDef.domElement.
 */
interface UIDomRenderInfoBase {
    treeNode: GroundedTreeNode;
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
    treeNode: GroundedTreeNodeBoundary | GroundedTreeNodePass;
    remove?: true;
    create?: false;
    update?: false;
    content?: false;
    move?: false | never;
    swap?: false;
}
interface UIDomRenderInfoDomLike extends UIDomRenderInfoBase {
    treeNode: GroundedTreeNodeDom | GroundedTreeNodePortal;
    swap?: boolean;
    remove?: true;
    create?: true;
    move?: true;
    update?: true;
    content?: true;
}
interface UIDomRenderInfoUIDom extends UIDomRenderInfoBase {
    treeNode: GroundedTreeNodeHost;
    remove?: boolean;
    create?: boolean;
    move?: boolean;
    update?: false;
    content?: false;
    swap?: false;
}
declare type UIDomRenderInfo = UIDomRenderInfoBoundary | UIDomRenderInfoDomLike | UIDomRenderInfoUIDom;
/** This only includes the calls that can be made after the fact: uiWillUnmount is called before (so not here). */
declare type UISourceBoundaryChangeType = "mounted" | "updated" | "moved" | "updated-n-moved";
declare type UISourceBoundaryChange = [UISourceBoundary, UISourceBoundaryChangeType, (UILiveUpdates | null)?, (UILiveUpdates | null)?];
declare type UIChangeInfos = [UIDomRenderInfo[], UISourceBoundaryChange[]];
/** Describes what kind of def it is.
 * - Compared to treeNode.type, we have extra: "content" | "element" | "fragment". But don't have "root" (or ""). */
declare type UIDefType = "dom" | "content" | "element" | "portal" | "boundary" | "pass" | "context" | "fragment" | "host";
interface UIDefBase<Props extends UIGenericPostProps = UIGenericPostProps> {
    /** This is to distinguish from other objects as well as to define the type both in the same.
     * - That's why it's name so strangely (to distinguish from objects), but still somewhat sensibly to be readible.
     * - In earlier quick tests, it seemed (almost 2x) faster to use { _isUIDef: true} as opposed to creating a new class instance (without _isUIDef member). */
    _uiDefType: UIDefType;
    tag: UIPostTag;
    childDefs: UIDefApplied[] | UIDefTarget[];
    /** This is used for spread functions.
     * - Because they are spread out, we need to distinguish their defs from main render scope.
     * - Preferably the are distinguished from other spreads, too, but it's technically difficult.
     *   .. However, if gives a key to the spread function (when uses it), then it's used for this purpose. */
    keyScope?: any;
    key?: any;
    attachedRefs?: UIRef[];
    attachedContexts?: Record<string, UIContext | null>;
    props?: Props;
    isArray?: boolean;
    domContent?: UIContentSimple | null;
    domHtmlMode?: boolean;
    domElement?: HTMLElement | SVGElement | null;
    domCloneMode?: UICloneNodeBehaviour | "" | null;
    domPortal?: Node | null;
    contentPass?: UIContentClosure | null;
    contentPassType?: "pass" | "copy";
    context?: UIContext | null;
    contextName?: string;
    host?: UIHost;
    treeNode?: GroundedTreeNode;
}
interface UIDefDom<Props extends UIGenericPostProps = UIGenericPostProps> extends UIDefBase<Props> {
    _uiDefType: "dom";
    tag: UIDomTag;
    props: Props;
}
interface UIDefContent extends UIDefBase {
    _uiDefType: "content";
    tag: "" | UIDomTag;
    domContent: UIContentSimple;
    domHtmlMode?: false;
    props?: never;
}
interface UIDefContentInner<Props extends UIGenericPostProps = UIGenericPostProps> extends UIDefBase {
    _uiDefType: "content";
    tag: "" | UIDomTag;
    domContent: UIContentSimple;
    /** If true, sets the content as innerHTML. */
    domHtmlMode: true;
    props?: Props;
}
interface UIDefElement<Props extends UIGenericPostProps = UIGenericPostProps> extends UIDefBase<Props> {
    _uiDefType: "element";
    tag: "_";
    props: Props;
    domElement: HTMLElement | SVGElement | null;
    domCloneMode?: UICloneNodeBehaviour | "" | null;
}
interface UIDefPortal<Props extends UIGenericPostProps = UIGenericPostProps> extends UIDefBase<Props> {
    _uiDefType: "portal";
    tag: null;
    domPortal: Node | null;
    props?: never;
}
interface UIDefBoundary<Props extends UIGenericPostProps = UIGenericPostProps> extends UIDefBase<Props> {
    _uiDefType: "boundary";
    tag: UIBoundaryTag;
    props: Props;
}
interface UIDefFragment extends UIDefBase<UIFragmentProps> {
    _uiDefType: "fragment";
    tag: null;
    isArray?: boolean;
}
interface UIDefPass extends UIDefBase {
    _uiDefType: "pass";
    tag: null;
    contentPass?: UIContentClosure | null;
    contentPassType?: "pass" | "copy";
    props?: never;
}
interface UIDefContext extends UIDefBase {
    _uiDefType: "context";
    tag: null;
    context: UIContext | null;
    contextName: string;
    props?: never;
}
interface UIDefHost extends UIDefBase {
    _uiDefType: "host";
    tag: null;
    host: UIHost;
    props?: never;
}
declare type UIDefTypesAll = UIDefDom | UIDefContent | UIDefContentInner | UIDefElement | UIDefPortal | UIDefBoundary | UIDefPass | UIDefContext | UIDefFragment | UIDefHost;
interface UIDefAppliedBase extends UIDefBase {
    childDefs: UIDefApplied[];
    action: "mounted" | "moved" | "updated";
    treeNode?: GroundedTreeNode;
}
interface UIDefTargetBase extends UIDefBase {
    childDefs: UIDefTarget[];
    treeNode?: never;
    action?: never;
}
declare type UIDefApplied = UIDefAppliedBase & UIDefTypesAll;
declare type UIDefTarget = UIDefTargetBase & UIDefTypesAll;
declare type GroundedTreeNodeType = "dom" | "portal" | "boundary" | "pass" | "context" | "host" | "root";
interface GroundedTreeNodeBase {
    /** The main type of the treeNode that defines how it should behave and what it contains.
     * The type "" is only used temporarily - it can only end up in treeNodes if there's an error. */
    type: GroundedTreeNodeType | "";
    /** Normally, only the root has no parent, but all others do.
     * However, if we are talking about a treeNode that is no longer in the tree (= a dead branch),
     * .. then the parent is null, or one of the parents in the chain is null even though it's not a real root node. */
    parent: GroundedTreeNode | null;
    /** The treeNodes inside - for navigation. */
    children: GroundedTreeNode[];
    /** Every treeNode has a domNode reference.
     * For boundaries, the domNode (and domProps) are updated flows up on create / remove / move until meets a dom tag parent. */
    domNode: DomElement | Node | null;
    /** The boundary that produced this tree node - might be passed through content closures. */
    sourceBoundary: UISourceBoundary | null;
    /** If refers to a boundary - either a custom class / functino or then a content passing boundary. */
    boundary?: UIBoundary | null;
    /** The def tied to this particular treeNode. */
    def?: UIDefApplied;
}
interface GroundedTreeNodeBaseWithDef extends GroundedTreeNodeBase {
    def: UIDefApplied;
}
interface GroundedTreeNodeEmpty extends GroundedTreeNodeBase {
    type: "";
}
interface GroundedTreeNodeRoot extends GroundedTreeNodeBase {
    type: "root";
    def?: never;
}
interface GroundedTreeNodeDom extends GroundedTreeNodeBaseWithDef {
    type: "dom";
    /** This exists only for treeNodes referring to dom elements (typeof appliedDef.tag === "string").
     * To avoid ever missing diffs, it's best to hold a memory for the props that were actually applied to a dom element.
     * Note. Like React, we do not want to read the state of the dom element due to 2 reasons:
     *   1. Reading from dom element is relatively slow (in comparison to reading property of an object).
     *   2. It's actually better for outside purposes that we only take care of our own changes to dom - not forcing things there (except create / destroy our own). */
    domProps: UIHTMLPostProps;
}
interface GroundedTreeNodePortal extends GroundedTreeNodeBaseWithDef {
    type: "portal";
    /** For portals, the domNode refers to the external container. */
    domNode: GroundedTreeNodeBase["domNode"];
}
interface GroundedTreeNodeContext extends GroundedTreeNodeBaseWithDef {
    type: "context";
}
interface GroundedTreeNodeBoundary extends GroundedTreeNodeBaseWithDef {
    type: "boundary";
    /** This will be set to the treeNode right after instancing the source boundary. */
    boundary: UISourceBoundary;
}
interface GroundedTreeNodePass extends GroundedTreeNodeBaseWithDef {
    type: "pass";
    /** This will be set to the treeNode right after instancing the content boundary.
     * - It's null only if there's no content, otherwise there's a content boundary.*/
    boundary: UIContentBoundary | null;
}
interface GroundedTreeNodeHost extends GroundedTreeNodeBaseWithDef {
    type: "host";
}
declare type GroundedTreeNode = GroundedTreeNodeEmpty | GroundedTreeNodeDom | GroundedTreeNodePortal | GroundedTreeNodeContext | GroundedTreeNodeBoundary | GroundedTreeNodePass | GroundedTreeNodeHost | GroundedTreeNodeRoot;
interface UIDefPseudo {
    _uiDefType?: "";
    childDefs: UIDefApplied[] | UIDefTarget[];
    type?: UIDefType | "";
    tag?: any;
    isArray?: boolean;
    props?: Dictionary | UIGenericPostProps;
    domElement?: HTMLElement | SVGElement | null;
}
interface UIDefAppliedPseudo extends UIDefPseudo {
    childDefs: UIDefApplied[];
}
interface UIDefTargetPseudo extends UIDefPseudo {
    childDefs: UIDefTarget[];
}
interface UIContentEnvelope {
    appliedDef: UIDefApplied;
    targetDef: UIDefTarget;
}
/** The basic dom node cloning modes - either deep or shallow: element.clone(mode === "deep").
 * - If in "always" then is deep, and will never use the original. */
declare type UICloneNodeBehaviour = "deep" | "shallow" | "always";
declare type RenderTextTagCallback = (text: string | number) => Node | null;
declare type RenderTextContentCallback = (text: string | number) => string | number;
declare type RenderTextTag = keyof HTMLElementTagNameMap | "" | RenderTextTagCallback;
interface UIHostSettingsUpdate extends Partial<Omit<UIHostSettings, "updateLiveModes">> {
    updateLiveModes?: Partial<UIHostSettings["updateLiveModes"]>;
}
/** Settings for UIDom behaviour for all inside a uiHost instance.
 * The settings can be modified in real time: by uiHost.updateSettings(someSettings) or manually, eg. uiHost.settings.updateTimeout = null. */
interface UIHostSettings {
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
     *   * It's useful to have a tiny delay to save from unnecessary rendering, when update gets called multiple times - even 0ms can help.
     *   * Only use null renderTimeout (= synchronous rendering after updateTimeout) if you really want rendering to happen immediately after update.
     *     .. Typically, you then also want the updateTimeout to be null (synchronous), so you get access to your dom elements synchronously.
     * - Note that renderTimeout happens after updateTimeou, so they both affect how fast rendering happens - see settings.updateTimeout for details. */
    renderTimeout: number | null;
    /** The uiDid-calls are collected (together with render infos) and called after the recursive update process has finished.
     * - This option controls whether the calls are made immediately after the update process or only after the (potentially delayed) rendering.
     * - Keep this as false, if you want the components to have their dom elements available upon uiDidMount - like in React. (Defaults to false.)
     * - Put this to true, only if you really want the calls to be executed before the rendering happens.
     * .. If you combine this with updateTimeout: null, then you get synchronously updated state, with only rendering delayed.
     * .. However, you won't have dom elements on mount. To know when that happens should use refs and .domRefDidMount and .domRefWillUnmount callbacks. */
    uiDidImmediateCalls: boolean;
    /** Whether should call .domRefDidMove in the case, that didn't need to actually move the element, although index was changed. */
    callRefMoveEvenIfNoDomMove: boolean;
    /** If the internal should update check is called without any types to update with, this decides whether should update or not. Defaults to false. */
    shouldUpdateWithNothing: boolean;
    /** Defines what components should look at when doing uiShouldUpdate check.
     * By default looks in all 4 places for change: 1. Props, 2. State, 3. Context, 4. Children.
     * .. However, most of them will be empty, and Context and Children will only be there if specifically asked for by needsChildren or needsContexts. */
    updateLiveModes: UIUpdateCompareModesBy;
    /** Defines how mini functional components should update. See UIUpdateCompareMode for details. */
    updateMiniMode: UIUpdateCompareMode;
    /** Whether does a equalDomProps check on the updating process.
     * - If true: Only adds render info (for updating dom props) if there's a need for it.
     * - If false: Always adds render info for updating dom elements. They will be diffed anyhow.
     * - If "contextual": Then marks to be updated if had other rendering needs (move or content), if not then does equalDomProps check.
     * Note that there is always a diffing check before applying dom changes, and the process only applies changes from last set.
     * .. In other words, this does not change at all what gets applied to the dom.
     * .. The only thing this changes, is whether includes an extra equalDomProps -> boolean run during the update process.
     * .. In terms of assumed performance:
     * .... Even though equalDomProps is an extra process, it's a bit faster to run than collecting diffs and in addition it can stop short - never add render info.
     * .... However, the only time it stops short is for not-equal, in which case it also means that we will anyway do the diff collection run later on.
     * .... In other words, it's in practice a matter of taste: if you want clean renderinfos (for debugging) use true. The default is "contextual". */
    preEqualCheckDomProps: boolean | "contextual";
    /** The maximum number of times a boundary is allowed to be render during an update due to update calls during the render func.
     * .. If negative, then there's no limit. If 0, then doesn't allow to re-render. The default is 1: allow to re-render once (so can render twice in a row).
     * .. If reaches the limit, stops re-rendering and logs a warning if devLogToConsole has .Warnings on. */
    maxReRenders: number;
    /** Which element (tag) to wrap texts (from props.children) into.
     * - By default, no wrapping is applied: treats texts as textNodes (instanceof Node).
     * - You can also pass in a callback to do custom rendering - should return a Node, or then falls back to textNode. */
    renderTextTag: RenderTextTag;
    renderInnerHtmlTag: keyof HTMLElementTagNameMap;
    /** If you want to process the simple content text, assign a callback here. */
    renderTextContent: RenderTextContentCallback | null;
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
    renderSvgNamespaceUri: string;
    /** When using uiDom.Element to insert nodes, and swaps them, whether should apply, and if so read first.
     * Defaults to true, which means will apply based on scratch, but not read before it. */
    renderDomPropsOnSwap: boolean | "read";
    /** This is useful for nesting uiHosts.
     * - Put this to true to make nested but not currently grounded qDosts be unmounted internally.
     * - When they are grounded again, they will mount and rebuild their internal structure from the rootBoundary up. */
    onlyRunInContainer: boolean;
    /** Whether allows contexts to cascade down from host to host.
     * - Specifically sets whether this host accepts contexts above its root.
     * - If false, will be independent of the parent host's contexts. (Defaults to true.) */
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
     * - Put to `dom-mini` to reuse for dom and mini renderers, while all class and live boundaries get a new life cycle. This is recommended as 2nd option. */
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
    duplicateDomNodeHandler: ((domElement: Node, treeNode: GroundedTreeNodeDom) => Node | null) | null;
}
/** Split a string into a typed array.
 * - Use with PropType to validate and get deep value types with, say, dotted strings. */
declare type Split<S extends string, D extends string> = string extends S ? string[] : S extends '' ? [] : S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [
    S
];
/** Get deep value type. If puts 3rd param to never, then triggers error with incorrect path. */
declare type PropType<T, Path extends string, Unknown = unknown> = string extends Path ? Unknown : Path extends keyof T ? T[Path] : Path extends `${infer K}.${infer R}` ? K extends keyof T ? PropType<T[K], R, Unknown> : Unknown : Unknown;
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
declare type NameValidator<Valid extends string, Input> = [
    Input
] extends [string] ? Split<Input, " "> extends Valid[] ? string : never : [
    Input
] extends [Array<any> | Readonly<Array<any>>] ? Input extends Valid[] ? Valid[] : Split<Input[number] & string, " "> extends Valid[] ? any : never : [
    Input
] extends [object] ? keyof Input extends Valid ? any : Split<keyof Input & string, " "> extends Valid[] ? any : never : any;
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
declare type ValidateNames<Valid extends string> = <T1 extends NameValidator<Valid, T1>, T2 extends NameValidator<Valid, T2>, T3 extends NameValidator<Valid, T3>, T4 extends NameValidator<Valid, T4>, T5 extends NameValidator<Valid, T5>, T6 extends NameValidator<Valid, T6>, T7 extends NameValidator<Valid, T7>, T8 extends NameValidator<Valid, T8>, T9 extends NameValidator<Valid, T9>, T10 extends NameValidator<Valid, T10>, Tn extends NameValidator<Valid, Tn>>(t1?: T1, t2?: T2, t3?: T3, t4?: T4, t5?: T5, t6?: T6, t7?: T7, t8?: T8, t9?: T9, t10?: T10, ...tn: Tn[]) => string;
declare type SafeIteratorDepth = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
declare type SafeIteratorDepthDefault = 10;
declare type NestedJoin<K, P> = K extends string | number ? P extends string | number ? `${K}${"" extends P ? "" : "."}${P}` : never : never;
declare type NestedPrev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];
/** Get nested paths and leaves from data, eg. "themes" | "themes.color" | "themes.style" */
declare type NestedPathsBy<T, NotAllowed = never, D extends SafeIteratorDepth = SafeIteratorDepthDefault> = [D] extends [never] ? never : T extends object ? {
    [K in keyof T]-?: K extends string | number ? T[K] extends NotAllowed ? never : K | NestedJoin<K, NestedPathsBy<T[K], NotAllowed, NestedPrev[D]>> : never;
}[keyof T] : "";
declare type NestedPaths<T> = NestedPathsBy<T, NonDictionary, SafeIteratorDepthDefault>;

declare class UIWired<BaseProps = {}> extends UIMini<BaseProps> {
    static UI_DOM_TYPE: string;
    static instanced: Set<UISourceBoundary>;
    static source: UIComponent;
    static builder: ((...params: any[]) => Dictionary) | null;
    static mixer: ((baseProps: Dictionary, addsProps: Dictionary, ...params: any[]) => Dictionary) | null;
    static props: Dictionary;
    static refresh(_update?: boolean, _forceUpdateTimeout?: number | null, _forceRenderTimeout?: number | null): void;
    static updateWired(_forceUpdateTimeout?: number | null, _forceRenderTimeout?: number | null): void;
    static setProps(_props: Dictionary, _update?: boolean, _forceUpdateTimeout?: number | null, _forceRenderTimeout?: number | null): void;
    static getWiredProps(): Record<string, any>;
    static getMixedProps(_props: Dictionary): Record<string, any>;
    static updateMode: UIUpdateCompareMode | null;
    static shouldUpdate?(preProps: Dictionary | null, newProps: Dictionary | null): boolean | null;
    static wiredDidMount?(wired: UIWired, boundary: UISourceBoundary): void;
    static wiredWillUnmount?(wired: UIWired, boundary: UISourceBoundary): void;
    constructor(props: BaseProps, updateMode?: UIUpdateCompareMode | null);
    render(): UIRenderOutput;
}
declare type UIWiredType<BaseProps = {}, WiredProps = {}, MixedProps = BaseProps & WiredProps, Params extends any[] = any[], Builder extends (lastProps: WiredProps | null, ...params: Params) => WiredProps = (lastProps: WiredProps | null, ...params: Params) => WiredProps, Mixer extends (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps = (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps> = {
    new (_props?: BaseProps | null): UIWired<BaseProps>;
    readonly UI_DOM_TYPE: "Wired";
    /** The currently instanced boundaries that have a QWire class instance as their boundary.mini. */
    instanced: Set<UISourceBoundary>;
    source: UIComponent;
    builder: Builder | null;
    mixer: Mixer | null;
    props: WiredProps;
    getWiredProps(): WiredProps;
    getMixedProps(props: BaseProps): MixedProps;
    /** Call this to rebuild the wired part of props and force a refresh on the instances. */
    refresh(update?: boolean | "force", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    updateWired(forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    /** Call this to manually update the wired part of props and force a refresh.
     * - This is most often called by the static refresh method above, with props coming from Wired.builder. */
    setProps(props: WiredProps, update?: boolean, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    updateMode: UIUpdateCompareMode | null;
    shouldUpdate?(preProps: BaseProps | null, newProps: BaseProps | null): boolean | null;
    wiredDidMount?(wired: UIWired<BaseProps>, boundary: UISourceBoundary): void;
    wiredWillUnmount?(wired: UIWired<BaseProps>, boundary: UISourceBoundary): void;
};

/** Effect to run when memory has changed (according to the comparison mode).
 * - If returns a new effect function, it will be run when unmounting the effect. */
declare type UIEffectOnMount = () => void | UIEffectOnUnmount;
declare type UIEffectOnUnmount = () => void;
declare function UIEffectMixin<Memory = any>(Base: ClassType): {
    new (effect?: UIEffectOnMount, memory?: Memory, ...baseParams: any[]): {
        memory: Memory;
        onMount: UIEffectOnMount | null;
        onUnmount: UIEffectOnUnmount | null;
        depth: number | UIUpdateCompareMode;
        reset(effect: UIEffectOnMount | null, memory: Memory, forceRun?: boolean): boolean;
        use(memory: Memory, forceRun?: boolean, newEffectIfChanged?: UIEffectOnMount | null): boolean;
        useWith(depth: number | UIUpdateCompareMode, memory: Memory, newEffectIfChanged?: UIEffectOnMount | null): boolean;
        /** Cancel effect. */
        cancel(skipUnmount?: boolean, clearEffect?: boolean): void;
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
    /** For quick getting modes to depth.
     * - Positive values can go however deep.
     * - Note that -1 means deep, but below -2 means will not check. */
    DEPTH_BY_MODE: {
        always: number;
        deep: number;
        changed: number;
        shallow: number;
        double: number;
    };
};
declare const UIEffect_base: {
    new (effect?: UIEffectOnMount | undefined, memory?: any, ...baseParams: any[]): {
        memory: any;
        onMount: UIEffectOnMount | null;
        onUnmount: UIEffectOnUnmount | null;
        depth: number | UIUpdateCompareMode;
        reset(effect: UIEffectOnMount | null, memory: any, forceRun?: boolean): boolean;
        use(memory: any, forceRun?: boolean, newEffectIfChanged?: UIEffectOnMount | null | undefined): boolean;
        useWith(depth: number | UIUpdateCompareMode, memory: any, newEffectIfChanged?: UIEffectOnMount | null | undefined): boolean;
        /** Cancel effect. */
        cancel(skipUnmount?: boolean, clearEffect?: boolean): void;
        constructor: Function;
        toString(): string;
        toLocaleString(): string;
        valueOf(): Object;
        hasOwnProperty(v: PropertyKey): boolean;
        isPrototypeOf(v: Object): boolean;
        propertyIsEnumerable(v: PropertyKey): boolean;
    };
    UI_DOM_TYPE: string;
    /** For quick getting modes to depth.
     * - Positive values can go however deep.
     * - Note that -1 means deep, but below -2 means will not check. */
    DEPTH_BY_MODE: {
        always: number;
        deep: number;
        changed: number;
        shallow: number;
        double: number;
    };
};
interface UIEffect<Memory = any> {
    /** The last store memory. */
    memory: Memory;
    /** The effect to run, when has changed.
     * - If returns a function, will replace the effect after (for the next time). */
    onMount: UIEffectOnMount | null;
    /** This is automatically assigned by the return value of the onMount - if doesn't return a func, will assing to null. */
    onUnmount: UIEffectOnUnmount | null;
    /** Comparison mode to be used by default. (Defaults to 1, which is the same as "shallow".) */
    depth: number | UIUpdateCompareMode;
    /** Alias for .use, that requires a function. (Do not use this, if you can reuse a function.)
     * - Note that if you can reuse a function all the time, you should.
     * .. There's no point declaring a new one every time in vain.
     * - Note that you can also call .update(mem), and if it returns true, then do your effect inline.  */
    reset(effect: (() => void) | null, memory: Memory, forceRun?: boolean): boolean;
    /** Alias for .useWith with default depth.
     * - Stores the memory and performs a shallow check against previous and returns true if changed.
     * - If newEffectIfChanged is not undefined, overrides the effect (only if was changed) right before calling the effect.
     * - Note that you don't need to have an effect assigned at all: you can also use the returned boolean and run your "effect" inline. */
    use(memory: Memory, forceRun?: boolean, newEffectIfChanged?: (() => void) | null): boolean;
    /** The main method.
     * - Stores the memory and performs a shallow check against previous and returns true if changed.
     * - If -1 depth, performs fully deep search. If depth <= -2, then is in "always" mode (doesn't even check).
     * - If newEffectIfChanged is not undefined, overrides the effect (only if was changed) right before calling the effect.
     * - Note that you don't need to have an effect at all. You can use the return value and run your "effect" inline as well. */
    useWith(depth: number | UIUpdateCompareMode, memory: Memory, newEffectIfChanged?: (() => void) | null): boolean;
    /** Cancel effect. */
    cancel(skipUnmount?: boolean, clearEffect?: boolean): void;
}
declare class UIEffect<Memory = any> extends UIEffect_base {
}
declare type UIEffectType<Memory = any> = {
    new (memory?: Memory, effect?: () => void, ...baseParams: any[]): UIEffect;
    /** For quick getting modes to depth.
     * - Positive values can go however deep.
     * - Note that -1 means deep, but below -2 means will not check. */
    DEPTH_BY_MODE: typeof UIEffect.DEPTH_BY_MODE;
    readonly UI_DOM_TYPE: "Effect";
};

declare const uiDef: <Props extends Dictionary<string, any> = {}>(tagOrClass?: UIPreTag, origProps?: UIGenericProps<Props> | null, ...contents: UIRenderOutput[]) => UIDefTarget | null;
declare const uiContent: UIDefTarget;
declare const uiContentCopy: UIDefTarget;
declare const uiWithContent: (...contents: UIRenderOutput[]) => UIDefTarget | null;
declare const uiDom: {
    Host: typeof UIHost;
    HostMixin: typeof UIHostMixin;
    Live: typeof UILive;
    LiveMixin: typeof UILiveMixin;
    Mini: typeof UIMini;
    MiniMixin: typeof UIMiniMixin;
    Ref: typeof UIRef;
    RefMixin: typeof UIRefMixin;
    Effect: typeof UIEffect;
    EffectMixin: typeof UIEffectMixin;
    /** Context allows to insert a down flowing context.
     * Usage example: `<uiDom.Context name={myContextName} context={myContext}><div/></uiDom.Context>` */
    Context: typeof UIContext;
    ContextMixin: typeof UIContextMixin;
    /** ContextAttach flags to use with live.getAllContexts(flags: ContextAttach). */
    ContextAttach: typeof UIContextAttach;
    /** Fragment represent a list of render output instead of stuff under one root.
     * Usage example: `<uiDom.Fragment><div/><div/></uiDom.Fragment>` */
    Fragment: typeof UIFragment;
    /** Portal allows to insert the content into a foreign dom node.
     * Usage example: `<uiDom.Portal container={myDomElement}><div/></uiDom.Portal>` */
    Portal: typeof UIPortal;
    /** This allows to use an existing dom element as if it was part of the system.
     * So you can modify its props and such. */
    Element: typeof UIElement;
    /** Generic def for passing content.
     * - Use this to include content (~ React's props.children) from the parent component.
     * - Note that in the case of multiple contentPasses the first one in tree order is the real one.
     *   .. If you deliberately want to play with which is the real one and which is a copy, use uiDom.ContentCopy or uiDom.copyContent(someKey) for the others. */
    Content: UIDefTarget;
    /** If you want to include things only if actually will have content for uiDom.Content.
     * - Technically this uses .getChildren() to check for Mini/Live, and so adds a children dependency.
     * - For SpreadFunctions they have their own procedure, so handled in there. */
    withContent: (...contents: UIRenderOutput[]) => UIDefTarget | null;
    /** A generic shortcut for a content copy.
     * .. We give it a unique key ({}), so that it can be widely moved around.
     * .. In the case you use multiple ContentCopy's, then reuses each widely by tree order. */
    ContentCopy: UIDefTarget;
    /** Use this method to create a copy of the content that is not swappable with the original render content.
     * - This is very rarely useful, but in the case you want to display the passed content multiple times,
     *   this allows to distinguish from the real content pass: `{ uiDom.Content }` vs. `{ uiDom.copyContent("some-key") }` */
    copyContent: (key?: any) => UIDefTarget;
    /** Create a new UIHost to orchestrate rendering. */
    create: (content?: UIRenderOutput, container?: HTMLElement | null | undefined, settings?: UIHostSettingsUpdate | null | undefined) => UIHost;
    /** Create a new UIHost to orchestrate rendering. */
    createHost: (content?: UIRenderOutput, container?: HTMLElement | null | undefined, settings?: UIHostSettingsUpdate | null | undefined) => UIHost;
    /** Create a new context. */
    createContext: <Data = any, Actions extends UIActions = UIActions>(data?: Data | undefined, settings?: Partial<{
        postActions: Set<string> | null;
        quickActions: true | Set<string> | null;
        refreshTimeout: number | null;
    }> | null | undefined) => UIContext<Data, Actions>;
    /** Create multiple named contexts. (Useful for tunneling.) */
    createContexts: <Contexts extends { [Name in keyof AllData]: UIContext<AllData[Name], {}>; }, AllData extends { [Name_1 in keyof Contexts]: Contexts[Name_1]["data"]; } = { [Name_2 in keyof Contexts]: Contexts[Name_2]["data"]; }>(contextsData: AllData) => Contexts;
    /** Create ref. */
    createRef: <Type extends Node | UISourceBoundary = Node | UISourceBoundary>() => UIRef<Type>;
    /** Create effect. */
    createEffect: <Memory = any>(effect?: UIEffectOnUnmount | undefined, memory?: Memory | undefined) => UIEffect<Memory>;
    /** Create a SpreadFunction - the most performant way to render things (no lifecycle, just spread out with its own keyScope). */
    createSpread: <Props extends Dictionary<string, any> = {}>(func: UISpreadFunction<Props>) => {
        new (_props?: Props | null | undefined): {};
        render: UISpreadFunction<Props>;
        unfold(props: Props, childDefs: UIDefTarget[]): UIDefTarget | null;
        unfoldWith(targetDef: UIDefTarget, contents: UIDefTarget[], keyScope: any): UIDefTarget | null;
    };
    /** Create a SpreadFunction - the most performant way to render things (no lifecycle, just spread out with its own keyScope). */
    spread: <Props extends Dictionary<string, any> = {}>(func: UISpreadFunction<Props>) => {
        new (_props?: Props | null | undefined): {};
        render: UISpreadFunction<Props>;
        unfold(props: Props, childDefs: UIDefTarget[]): UIDefTarget | null;
        unfoldWith(targetDef: UIDefTarget, contents: UIDefTarget[], keyScope: any): UIDefTarget | null;
    };
    /** Create a LiveFunction omitting the first initProps argument. (It's actually swapped to an optional 2nd argument.) */
    createLive: <Props_1 extends Dictionary<string, any> = {}, State extends Dictionary<string, any> = {}, Context extends Dictionary<string, any> = {}, AllContexts extends UIAllContexts = {}>(func: (q: UILive<Props_1, State, Context, AllContexts, AllContexts[keyof AllContexts]["Actions"]>, props: Props_1) => UIRenderOutput | UILiveFunction<Props_1, State, Context, AllContexts>) => UILiveFunction<Props_1, State, Context, AllContexts>;
    /** Create a LiveFunction omitting the first initProps argument. (It's actually swapped to an optional 2nd argument.) */
    live: <Props_1 extends Dictionary<string, any> = {}, State extends Dictionary<string, any> = {}, Context extends Dictionary<string, any> = {}, AllContexts extends UIAllContexts = {}>(func: (q: UILive<Props_1, State, Context, AllContexts, AllContexts[keyof AllContexts]["Actions"]>, props: Props_1) => UIRenderOutput | UILiveFunction<Props_1, State, Context, AllContexts>) => UILiveFunction<Props_1, State, Context, AllContexts>;
    /** Create a MiniFunction. Like uiDom.createLive you get the api as the first parameter, and props as second. */
    createMini: <Props_2 extends Dictionary<string, any> = {}>(func: (mini: UIMini<Props_2>, props: Props_2) => UIRenderOutput | UIMiniFunction<Props_2>) => UIMiniFunction<Props_2>;
    /** Create a MiniFunction. Like uiDom.createLive you get the api as the first parameter, and props as second. */
    mini: <Props_2 extends Dictionary<string, any> = {}>(func: (mini: UIMini<Props_2>, props: Props_2) => UIRenderOutput | UIMiniFunction<Props_2>) => UIMiniFunction<Props_2>;
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
    createWired: <BaseProps extends Dictionary<string, any> = {}, WiredProps extends Dictionary<string, any> = {}, MixedProps extends Dictionary<string, any> = BaseProps & WiredProps, Params extends any[] = any[], Builder extends (lastProps: WiredProps | null, ...params: Params) => WiredProps = (lastProps: WiredProps | null, ...params: Params) => WiredProps, Mixer extends (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps = (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps>(funcOrClass: UIComponent<MixedProps>, builderOrProps?: WiredProps | Builder | null | undefined, mixer?: Mixer | undefined, ...params: Params) => UIWiredType<BaseProps, WiredProps, MixedProps, Params, Builder, Mixer>;
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
    wired: <BaseProps extends Dictionary<string, any> = {}, WiredProps extends Dictionary<string, any> = {}, MixedProps extends Dictionary<string, any> = BaseProps & WiredProps, Params extends any[] = any[], Builder extends (lastProps: WiredProps | null, ...params: Params) => WiredProps = (lastProps: WiredProps | null, ...params: Params) => WiredProps, Mixer extends (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps = (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps>(funcOrClass: UIComponent<MixedProps>, builderOrProps?: WiredProps | Builder | null | undefined, mixer?: Mixer | undefined, ...params: Params) => UIWiredType<BaseProps, WiredProps, MixedProps, Params, Builder, Mixer>;
    /** Create a new def, like React.createElement(). Can feed JSX input. */
    createDef: <Props_3 extends Dictionary<string, any> = {}>(tagOrClass?: UIPreTag, origProps?: UIGenericProps<Props_3> | null, ...contents: UIRenderOutput[]) => UIDefTarget | null;
    /** Alias for createDef for brevity. */
    def: <Props_3 extends Dictionary<string, any> = {}>(tagOrClass?: UIPreTag, origProps?: UIGenericProps<Props_3> | null, ...contents: UIRenderOutput[]) => UIDefTarget | null;
    /** Returns a single html element.
     * - If a wrapInTag given will use it as a container.
     * - Otherwise, if the string refers to multiple, returns an element containing them (with settings.renderInnerHtmlTag).
     * - Normally uses a container only as a fallback if has many children. */
    htmlDef: (innerHtml: string, wrapInTag?: keyof HTMLElementTagNameMap, props?: UIGenericProps, key?: any) => UIDefTarget;
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
    classNames: <ValidNames extends string = string, SingleName extends string = ValidNames>(...classNames: (false | "" | 0 | UIPreClassName<ValidNames, SingleName> | null | undefined)[]) => string;
    /** Convert a style cssText string into a dictionary with capitalized keys.
     * - For example: "background-color: #aaa" => { backgroundColor: "#aaa" }.
     * - The dictionary format is used for easy detection of changes.
     *   .. As we want to respect any external changes and just modify based on our own. (For style, class and any attributes.) */
    parseStyle: (cssText: string) => Partial<CSSStyleDeclaration>;
    /** General inlined equal with level for deepness.
     * - nDepth: 0. No depth - simple check.
     * - nDepth: 1. Shallow equal.
     * - nDepth: 2. Shallow double equal.
     * - nDepth < 0. Deep. */
    areEqual: (a: any, b: any, nDepth?: number) => boolean;
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
    range: (lengthOrStart: number, end?: number | undefined, stepSize?: number) => number[];
};

export { CSSProperties, ClassType, Dictionary, DomElement, GroundedTreeNode, GroundedTreeNodeBoundary, GroundedTreeNodeContext, GroundedTreeNodeDom, GroundedTreeNodeEmpty, GroundedTreeNodeHost, GroundedTreeNodePass, GroundedTreeNodePortal, GroundedTreeNodeRoot, GroundedTreeNodeType, HTMLAttributes, HTMLAttributesAll, HTMLAttributesWithStyle, HTMLElementType, HTMLListenerAttributeNames, HTMLListenerAttributes, HTMLListenerAttributesAll, HTMLTags, NameValidator, NestedPaths, NestedPathsBy, NonDictionary, NullLike, PropType, RecordableType, RenderTextContentCallback, RenderTextTag, RenderTextTagCallback, SafeIteratorDepth, SafeIteratorDepthDefault, Split, UIAction, UIActions, UIAllContexts, UIAllContextsActions, UIAllContextsData, UIAllContextsDataWithNull, UIAllContextsWithNull, UIBoundable, UIBoundableFunction, UIBoundary, UIBoundaryTag, UIChangeInfos, UICloneNodeBehaviour, UIComponent, UIContentEnvelope, UIContentNull, UIContentSimple, UIContentValue, UIContext, UIContextAttach, UIContextData, UIContextMixin, UIContextRefresh, UIContextType, UIDefApplied, UIDefAppliedBase, UIDefAppliedPseudo, UIDefBoundary, UIDefContent, UIDefContentInner, UIDefContext, UIDefDom, UIDefElement, UIDefFragment, UIDefHost, UIDefKeyTag, UIDefPass, UIDefPortal, UIDefTarget, UIDefTargetBase, UIDefTargetPseudo, UIDefType, UIDefTypesAll, uiDom as UIDom, UIDomRenderInfo, UIDomTag, UIEffect, UIEffectMixin, UIEffectType, UIElement, UIElementType, UIFragment, UIFragmentType, UIFunction, UIGenericPostProps, UIGenericProps, UIHTMLDiffs, UIHTMLPostProps, UIHTMLProps, UIHost, UIHostMixin, UIHostSettings, UIHostSettingsUpdate, UIHostType, UILive, UILiveComponent, UILiveFunction, UILiveMixin, UILiveNewUpdates, UILiveType, UILiveUpdates, UIMini, UIMiniFunction, UIMiniMixin, UIMiniType, UIPortal, UIPortalType, UIPostTag, UIPreClassName, UIPreTag, UIProps, UIQuestion, UIQuestionary, UIRef, UIRefMixin, UIRefType, UIRenderOutput, UIRenderOutputMulti, UIRenderOutputSingle, UISourceBoundaryChange, UISourceBoundaryChangeType, UISourceBoundaryId, UISpread, UISpreadFunction, UISpreadType, UIUpdateCompareMode, UIUpdateCompareModesBy, UIUponAction, UIUponData, UIUponPreAction, UIUponQuestion, ValidateNames, createContext, createContexts, createHost, createLive, createMini, createSpread, uiContent, uiContentCopy, uiDef, uiDom, uiWithContent };
