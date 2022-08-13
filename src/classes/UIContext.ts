

// - Imports - //

import {
    Dictionary,
    ClassType,
    PropType,
    UITreeNodeContexts,
    UIUponAction,
    UIUponData,
    UIUponPreAction,
    UIUponQuestion,
    UIActions,
    UIQuestion,
    UIQuestionary,
    UIContextData,
    UIAllContexts,
    ClassBaseMixer,
} from "../static/_Types";
import { UILiveSource } from "./UIBoundary";
import { UIContextServices } from "./UIContextServices";


// - UIContext - //

export type UIContextSettingsUpdate<ActionTypes extends string = string> = {
    refreshTimeout?: null | number;
    postActions?: null | ActionTypes | ActionTypes[] | Set<ActionTypes>;
    quickActions?: true | null | ActionTypes | ActionTypes[] | Set<ActionTypes>;
};
function _UIContextMixin(Base: ClassType) {

    return class _UIContext extends Base {

        public static UI_DOM_TYPE = "Context";


        // - Basic members - //

        public data: any;
        public settings: {
            postActions: null | Set<string>;
            quickActions: true | null | Set<string>;
            refreshTimeout: number | null;
        };
        public services: UIContextServices;


        // - Collection members - //
        //
        // .. These are kept here (instead of .services), for custom mangling (in case extends UIContext or UIContextMixin).

        public inTree: Map<UITreeNodeContexts, Set<string>>;
        public dataBoundaries: Map<UILiveSource, Set<string>>;
        public actionBoundaries: Map<UILiveSource, Set<string>>;
        public dataListeners: Map<UIUponData<UIContext>, Set<string> | true>;
        public actionListeners: Map<UIUponAction<UIContext> | UIUponQuestion<UIContext>, Set<string> | true>;
        public actionHandlers: Map<UIUponPreAction<UIContext>, Set<string> | true>;


        // - Construct - //

        // Note that unfortunately in the  constructor, we can't access the Actions to use: UIContextSettingsUpdate[Actions["type"] & string]
        constructor(data: any, settings: UIContextSettingsUpdate | null | undefined, ...passArgs: any[]) {
            // We are a mixin.
            super(...passArgs);
            // Collections.
            this.inTree = new Map();
            this.dataBoundaries = new Map();
            this.actionBoundaries = new Map();
            // Listeners.
            this.dataListeners = new Map();
            this.actionListeners = new Map();
            this.actionHandlers = new Map();
            // Data.
            this.data = data;
            // Public settings.
            this.settings = {
                postActions: null,
                quickActions: null,
                refreshTimeout: 0,
            };
            // Internal services - for clarity and clearer mixin use.
            this.services = new UIContextServices(this as unknown as UIContext);
            // Update settings.
            if (settings)
                this.modifySettings(settings);
        }


        // - Settings - //

        public modifySettings(settings: UIContextSettingsUpdate): void {
            if (settings.postActions !== undefined)
                UIContextServices.flagActions(this.settings, "postActions", settings.postActions, false);
            if (settings.quickActions !== undefined)
                UIContextServices.flagActions(this.settings, "quickActions", settings.quickActions, false);
            if (settings.refreshTimeout !== undefined)
                this.settings.refreshTimeout = settings.refreshTimeout;
        }

        public flagPostActions(actionTypes: null | string | string[] | Set<string>, extend: boolean = true): void {
            UIContextServices.flagActions(this.settings, "postActions", actionTypes, extend);
        }
        public flagQuickActions(actionTypes: true | null | string | string[] | Set<string>, extend: boolean = true): void {
            UIContextServices.flagActions(this.settings, "quickActions", actionTypes, extend);
        }

        // - Listeners - //

        public addActionHandler(listener: UIUponPreAction, actionTypes: string | string[] | true = true): void {
            this.actionHandlers.set(listener, typeof actionTypes === "object" ? new Set(typeof actionTypes === "string" ? [actionTypes] : actionTypes) : true);
        }
        public removeActionHandler(listener: UIUponPreAction): void {
            this.actionHandlers.delete(listener);
        }

        public addActionListener(listener: UIUponAction | UIUponQuestion, actionTypes: string | string[] | true = true): void {
            this.actionListeners.set(listener, typeof actionTypes === "string" ? new Set([actionTypes]) : typeof actionTypes === "object" ? new Set(actionTypes) : true);
        }
        public removeActionListener(listener: UIUponAction | UIUponQuestion): void {
            this.actionListeners.delete(listener);
        }

        public addDataListener(listener: UIUponData, refreshKeys: string | string[] | true = true): void {
            this.dataListeners.set(listener, typeof refreshKeys === "string" ? new Set([refreshKeys]) : typeof refreshKeys === "object" ? new Set(refreshKeys) : true);
        }

        public removeDataListener(listener: UIUponData): void {
            this.dataListeners.delete(listener);
        }


        // - Sending actions - //

        public sendAction(action: UIActions & { value?: never; }, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void {
            this.services.sendAction(action, asAction, forceTimeout);
        }

        public sendActionWith(actionType: string, payload: any, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void {
            this.services.sendAction({ type: actionType, payload }, asAction, forceTimeout);
        }


        // - Questions - //

        public askQuestion(question: UIQuestion, defaultValue?: any): any {
            // Prepare value and TypeScript transformation.
            if (question.value === undefined)
                question.value = defaultValue;
            // For logging.
            this.services.askQuestion(question, 1);
            return question.value;
        }
        public askQuestionWith(type: string, payload?: any | null, defaultValue?: any): any {
            // Create question.
            const question = {
                type,
                payload,
                value: defaultValue
            };
            this.services.askQuestion(question, 1);
            return question.value;
        }

        public askQuestionary(question: UIQuestionary, maxAnswers: number = 0): any[] {
            // Prepare values and TypeScript transformation.
            question.values = [];
            this.services.askQuestion(question, maxAnswers);
            return question.values;
        }
        public askQuestionaryWith(type: string, payload?: any | null, maxAnswers: number = 0): any[] {
            // Create.
            const question = {
                type,
                payload,
                values: []
            };
            // For logging.
            this.services.askQuestion(question, maxAnswers);
            return question.values;
        }


        // - Set data - //

        public setData(data: any, extend: boolean = false, refresh: boolean = true, forceTimeout?: number | null): void {
            // Set data and refresh.
            this.data = extend && this.data && (this.data as any).constructor === Object ? { ...this.data as object, ...data as object } : data;
            // Refresh.
            if (refresh)
                this.refresh(true, forceTimeout);
        }

        public setInData(dataKey: string, subData: any, extend: boolean = false, refresh: boolean = true, forceTimeout?: number | null): void {
            // Prepare.
            const dataKeys = dataKey.split(".");
            const lastKey = dataKeys.pop();
            if (!lastKey || !this.data)
                return;
            // Get data parent.
            let data = this.data as Record<string, any>;
            for (const key of dataKeys) {
                data = dataKeys[key];
            }
            // Extend.
            if (extend) {
                const last = data[lastKey];
                if (!last || last.constructor !== Object)
                    extend = false;
                else
                    data[lastKey] = {...last, ...subData as object};
            }
            // Set.
            if (!extend)
                data[lastKey] = subData;
            // Refresh.
            if (refresh)
                this.refresh(dataKey, forceTimeout);
        }


        // - Get data - //

        public getData(): any {
            return this.data;
        }

        public getInData(dataKey: string): any {
            // Get nested.
            const dataKeys = dataKey.split(".");
            let data = this.data as Record<string, any>;
            for (const key of dataKeys)
                data = data[key];
            // Return deep data.
            return data;
        }


        // - Refresh data and any pending actions - //

        public refresh(refreshKeys?: boolean | string | string[], forceTimeout?: number | null): void {
            if (refreshKeys)
                this.services.addRefreshKeys(refreshKeys);
            this.services.applyRefresh(this.settings.refreshTimeout, forceTimeout);
        }

    }
}
export interface UIContext<Data extends UIContextData = any, Actions extends UIActions = {}> {

    // - For TypeScript - //

    Actions: Actions;

    // - Construct - //

    // Collections.
    /** Contains the TreeNodes where this context is inserted as keys and values is the name is inserted as.
     * - This is not used for refresh flow (anymore), but might be useful for custom purposes. */
    inTree: Map<UITreeNodeContexts, Set<string>>;
    /** The source boundaries that are interested in the data and attached to it by 1. cascading, 2. tunneling, or 3. overriding. */
    dataBoundaries: Map<UILiveSource, Set<string>>;
    /** The source boundaries that are intersted in the actions and attached to it by 1. cascading, 2. tunneling, or 3. overriding. */
    actionBoundaries: Map<UILiveSource, Set<string>>;
    /** External data listeners - called after the live components. The keys are data listener callbacks, and values are interests. */
    dataListeners: Map<UIUponData<UIContext<Data, Actions>>, Set<string> | true>;
    /** External action listeners - called after the live components. The keys are action listener / question answer callbacks, and values are action interests. */
    actionListeners: Map<UIUponAction<UIContext<Data, Actions>> | UIUponQuestion<UIContext<Data, Actions>>, Set<string> | true>;
    /** External action pre-handlers: called immediately when action sent.
     * - Can return what to do for actions - for questions, the return value is ignored: they are always asked.
     *     1. Return "cancel" to cancel sending the action (after pre-listeners).
     *     2. Return "post" to make the action be triggered after update and render (within each uiHost).
     *     3. Return "quick" to make the action be triggered immediately after pre-handling.
     * - If many returned things to do, the order of importance is: "cancel" > "post" > "quick".
     * - Otherwise will send the action normally upon refreshing the context. */
    actionHandlers: Map<UIUponPreAction<UIContext<Data, Actions>>, Set<string> | true>;

    // Data.
    data: Data;

    // Settings.
    settings: {
        /** Set of action types that should always be sent after the update-n-render cycle.
         * If overlaps with quickActions, will be interpreted as a post action.*/
        postActions: null | Set<Actions["type"] & string>;
        /** Set of action types that should always be run immediately.
         * - Set true to force all as quick - this changes the general behaviour.
         * - Note that if overlaps with postActions, will be treated as a post action. */
        quickActions: true | null | Set<Actions["type"] & string>;
        /** Timeout for refreshing for this particular context.
         * - The timeout is used for both: data refresh and (normal) actions.
         * - If null, then synchronous - defaults to 0ms.
         * - Note that if you use null, the updates will run synchronously.
         *   .. It's not recommended to use it, because you'd have to make sure you always use it in that sense.
         *   .. For example, the component you called from might have already unmounted on the next line (especially if host is fully synchronous, too). */
        refreshTimeout: number | null;
    };

    /** Internal services to keep the whole thing together and synchronized.
     * They are the semi-private internal part of UIContext, so separated into its own class. */
    services: UIContextServices;


    // - Settings - //

    modifySettings(settings: UIContextSettingsUpdate<Actions["type"] & string>): void;
    flagPostActions<ActionTypes extends Actions["type"] & string>(actionTypes: null | ActionTypes | ActionTypes[] | Set<ActionTypes>, extend?: boolean): void;
    flagQuickActions<ActionTypes extends Actions["type"] & string>(actionTypes: true | null | ActionTypes | ActionTypes[] | Set<ActionTypes>, extend?: boolean): void;


    // - Listeners - //

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
    // addDataListener<RefreshKeys extends NestedPaths<Data, NonDictionary, SafeIteratorDepthDefault>>(listener: UIUponData<UIContext<Data, Actions>>, refreshKeys?: RefreshKeys | RefreshKeys[] | true): void;
    /** Remove an data listener. */
    removeDataListener(listener: UIUponData): void;


    // - Send actions - //

    /** Sends the given action through the context by default timeout.
     * - Before the action goes further, any actionHandlers can cancel it or mark it as a post action (= happens after update-n-render cycle).
     * - If asPostAction given, will ignore what .postActions and .actionHandlers would say about whether is postAction or not.
     * - Note that this should not be used for questions. */
    sendAction(action: Actions & { value?: never; }, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;

    /** Creates an action and sends it through the context by default timeout.
     * - Before the action goes further, any actionHandlers can cancel it or mark it as a post action (= happens after update-n-render cycle).
     * - If asPostAction given, will ignore what .postActions and .actionHandlers would say about whether is postAction or not.
     * - Note that this should not be used for questions. */
    sendActionWith<Type extends Actions["type"], Action extends Actions & { type: Type; } & { value: never; }>(actionType: Type, payload: Action["payload"], asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;
    sendActionWith<Type extends (Actions & { payload?: never; } & { value: never; })["type"]>(actionType: Type, payload?: undefined | never, asAction?: "post" | "quick" | "", forceTimeout?: number | null): void;


    // - Questions - //

    /** Ask a question.
     * - You get the answer synchronously by the return value (comes from the first answerer, then stops going further).
     * - If there's no answerers, then returns the optional defaultValue (or from question.value) - or then undefined.
     * - Note that sending a question also modifies the original question by adding .value into it with the collected answer. */
    askQuestion<Action extends Actions & UIQuestion<Action["value"]>>(question: Action & { value?: Action["value"]; }, defaultValue?: Action["value"]): Action["value"];
    /** Ask a question by defining it on the go. See .askQuestion method for details. */
    askQuestionWith<Action extends Actions & UIQuestion<Action["value"]>>(type: Action["type"], payload: Action["payload"], defaultValue?: Action["value"]): Action["value"];
    askQuestionWith<Action extends Actions & UIQuestion<Action["value"]> & { payload?: never; }>(type: Action["type"], payload?: null, defaultValue?: Action["value"]): Action["value"];

    /** Ask a questionary (of one question with many answers) in the context.
     * - You get the answers synchronously by the return value (comes from all the answerers).
     * - If there's no answerers, then returns an empty array.
     * - Note that sending a questionary also modifies the original question by adding .value and .values into it.
     *   .. If any answered, the last answer be found as .value. (If none, .value is not added.) */
    askQuestionary<Action extends Actions & UIQuestionary<Action["value"]>>(question: Action & { value?: Action["value"]; values?: Action["value"][] }, maxAnswers?: number): Action["value"][];
    /** Ask a questionary by defining it on the go. See .askQuestion method for details. */
    askQuestionaryWith<Action extends Actions & UIQuestionary<Action["value"]>>(type: Action["type"], payload: Action["payload"], maxAnswers?: number): Action["value"][];
    askQuestionaryWith<Action extends Actions & UIQuestionary<Action["value"]> & { payload?: never; }>(type: Action["type"], payload?: null, maxAnswers?: number): Action["value"][];


    // - Get and set data - //

    /** Get the whole data (directly).
     * - If you want to use refreshes and such as designed, don't modify the data directly (do it via setData or setInData) - or then call .refreshData accordingly. */
    getData(): Data;
    /** Get a portion within the data using dotted string to point the location. For example: "themes.selected". */
    getInData<DataKey extends PropType<Data, DataKey, never> extends never ? never : string>(dataKey: DataKey): PropType<Data, DataKey>;

    /** Set the data and refresh.
     * - Note that the extend functionality should only be used for dictionary objects. */
    setData(data: Partial<Data> & Dictionary, extend?: true, refresh?: boolean, forceTimeout?: number | null): void;
    setData(data: Data, extend?: boolean | undefined, refresh?: boolean, forceTimeout?: number | null): void;

    /** Set or extend in nested data, and refresh with the key.
     * - Note that the extend functionality should only be used for dictionary objects. */
    setInData<DataKey extends string, SubData extends PropType<Data, DataKey, never>>(dataKey: DataKey, subData: Partial<SubData> & Dictionary, extend?: true, refresh?: boolean, forceTimeout?: number | null): void;
    setInData<DataKey extends string, SubData extends PropType<Data, DataKey, never>>(dataKey: DataKey, subData: SubData, extend?: boolean | undefined, refresh?: boolean, forceTimeout?: number | null): void;


    // - Refresh - //

    /** This refreshes both: context & pending actions.
     * - If refreshKeys defined, will add them - otherwise only refreshes pending.
     * - The refresh flows down the tree, and for each matching boundary, calls the action first and then checks context.
     * - Note that if the live component was interested in the context, will use the .addToUpdates flow - so there might be a timeout before gets actually applied.
     * - Note that if !!refreshKeys is false, then will not add any refreshKeys. If there were none, will only update actions. */
    refresh<DataKey extends PropType<Data, DataKey, never> extends never ? never : string>(refreshKeys?: boolean | DataKey | DataKey[], forceTimeout?: number | null): void;


    // - Optional assignable callbacks - //

    // Tree nodes.
    onInsertInto?(treeNode: UITreeNodeContexts, name: string): void;
    onRemoveFrom?(treeNode: UITreeNodeContexts, name: string): void;

    // Boundary interests.
    onDataInterests?(boundary: UILiveSource, ctxName: string, isInterested: boolean): void;
    onActionInterests?(boundary: UILiveSource, ctxName: string, isInterested: boolean): void;

}
export class UIContext<Data extends UIContextData = any, Actions extends UIActions = {}> extends _UIContextMixin(Object) {
    // There's no passing arguments if doesn't use as a mixin.
    constructor(data?: Data, settings?: UIContextSettingsUpdate) { super(data, settings); }
}
export type UIContextType<Data extends UIContextData = any, Actions extends UIActions = {}> = ClassType<UIContext<Data, Actions>, [Data?, UIContextSettingsUpdate?]> & {
    readonly UI_DOM_TYPE: "Context";
}

/** Create a new context. */
export const createContext = <Data = any, Actions extends UIActions = UIActions>(data?: Data, settings?: UIContextSettingsUpdate<Actions["type"] & string>): UIContext<Data, Actions> =>
    new UIContext<Data, Actions>(data, settings);

/** There are two ways you can use this:
 * 1. Call this to give basic UIContext features with types for Data and Actions being empty.
 *      * For example: `class MyMix extends UIContextMixin(MyBase) {}`
 * 2. If you want to define Data and Actions, use this simple trick instead:
 *      * For example: `class MyMix extends (UIContextMixin as ClassBaseMixer<UIContext<MyData, MyActions>>)(MyBase) {}`
 */
export const UIContextMixin = _UIContextMixin as ClassBaseMixer<UIContext>;


// - Multi - //

export type UIContextsProps<AllContexts extends UIAllContexts = {}> = {
    /** Include many named contexts. */
    cascade: AllContexts | null;
}
export class UIContexts<AllContexts extends UIAllContexts = {}> {
    public static UI_DOM_TYPE = "Contexts";
    /** It's not really included here, as it's just a type. */
    contexts: AllContexts;
    // We need a constructor here for typescript TSX.
    constructor(_props: UIContextsProps) {}
}
export type UIContextsType<AllContexts extends UIAllContexts = {}> = ClassType<UIContexts<AllContexts>, [UIContextsProps]> & {
    readonly UI_DOM_TYPE: "Contexts";
}
/** Create multiple named contexts. (Useful for tunneling.) */
export const createContexts = <Contexts extends { [Name in keyof AllData]: UIContext<AllData[Name]> }, AllData extends { [Name in keyof Contexts]: Contexts[Name]["data"] } = { [Name in keyof Contexts]: Contexts[Name]["data"] }>(contextsData: AllData): Contexts => {
    const contexts: Record<string, UIContext> = {};
    for (const name in contextsData)
        contexts[name] = createContext(contextsData[name]);
    return contexts as Contexts;
};
