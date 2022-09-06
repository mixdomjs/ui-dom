

// - Imports - //

import {
    Dictionary,
    UIComponent,
    UIUpdateCompareMode,
    UIRenderOutput,
} from "../static/_Types";
import { _Defs } from "../static/_Defs";
import { UISourceBoundary } from "./UIBoundary";
import { UIMini } from "./UIMini";
import { uiContent } from "../uiDom";


// - UIWired - //

// Note that we don't make UIWired a mixin due to its extensive / special usage of static class features.
export class UIWired<BaseProps = any> extends UIMini<BaseProps> {

    // - Truly static - //

    public static UI_DOM_TYPE = "Wired";

    // - Members - //

    public static components: Set<UIMini>;
    public static source: UIComponent;
    public static builder: ((...params: any[]) => Dictionary) | null;
    public static mixer: ((baseProps: Dictionary, addedProps: Dictionary, ...params: any[]) => Dictionary) | null;
    public static addedProps: Dictionary;

    // - Methods - //

    public static refresh(_update?: boolean, _forceUpdateTimeout?: number | null, _forceRenderTimeout?: number | null): void {};
    public static update(_forceUpdateTimeout?: number | null, _forceRenderTimeout?: number | null): void {};
    public static setProps(_props: Dictionary, _update?: boolean, _forceUpdateTimeout?: number | null, _forceRenderTimeout?: number | null): void {};
    public static getAddedProps(): Record<string,any> { return {}; }
    public static getMixedProps(_props: Dictionary): Record<string,any> { return {}; }

    // - Settings that will be used for UIMini purposes (automatically used by all instances) - //

    public static updateMode: UIUpdateCompareMode | null;
    public static uiWillMount?(mini: UIMini): void;
    public static uiDidMount?(mini: UIMini): void;
    public static uiShouldUpdate?(mini: UIMini, preProps: Dictionary | null, newProps: Dictionary | null): boolean | null;
    public static uiBeforeUpdate?(mini: UIMini, preProps: Dictionary | null, newProps: Dictionary | null, willUpdate: boolean): void;
    public static uiDidUpdate?(mini: UIMini, prevProps: Dictionary | null, newProps: Dictionary | null): void;
    public static uiDidMove?(mini: UIMini): void;
    public static uiWillUnmount?(mini: UIMini): void;

    // - Instanced - //

    // For startup and TSX.
    constructor(props: BaseProps, boundary?: UISourceBoundary) {
        super(props, boundary);
    }

    render(): UIRenderOutput { return uiContent; }

}

/** The static class type for UIWired that is extended when creates a wired source.
 * Note that you can use the UIMini callbacks, they are called after calling them on the instance (if even were there). */
export type UIWiredType<BaseProps = {}, AddedProps = {}, MixedProps = BaseProps & AddedProps, Params extends any[] = any[], Builder extends (lastProps: AddedProps | null, ...params: Params) => AddedProps = (lastProps: AddedProps | null, ...params: Params) => AddedProps, Mixer extends (baseProps: BaseProps, addedProps: AddedProps, ...params: Params) => MixedProps = (baseProps: BaseProps, addedProps: AddedProps, ...params: Params) => MixedProps> = {


    // - Static & construct - //

    // For detection.
    readonly UI_DOM_TYPE: "Wired";

    // Constructor.
    new (_props?: BaseProps | null): UIWired<BaseProps>;


    // - These (except updateMode) will be set externally upon creating a wired class - //

    /** The currently instanced components that using our custom class wired class as their constructor. */
    components: Set<UIMini>;
    source: UIComponent;
    builder: Builder | null;
    mixer: Mixer | null;
    addedProps: AddedProps;

    /** Default update mode.
     * - By default, we are in "always" mode, because this is an intermediary boundary: each wired target will anyway do its checking.
     * - This is to prevent rare cases where would feel like a bug - without having to go deep into the docs or code to find out why. */
    updateMode: UIUpdateCompareMode | null;


    // - Methods - //

    getAddedProps(): AddedProps;
    getMixedProps(props: BaseProps): MixedProps;

    /** Call this to rebuild the wired part of props and force a refresh on the instances.
     * If the props stay the same, you should have update = "force", or rather just call update directly if you know there's no builder. */
    refresh(update?: boolean | "force", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    /** Call to trigger the updates for all instances. */
    update(forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;

    /** Call this to manually update the wired part of props and force a refresh.
     * - This is most often called by the static refresh method above, with props coming from Wired.builder. */
    setProps(props: AddedProps, update?: boolean, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;


    // - Settings that will be used for UIMini purposes (automatically used by all instances) - //

    /** Special call for wired only - called right after constructing the wired instance. */
    uiWillMount?(mini: UIMini<BaseProps>): void;
    uiDidMount?(mini: UIMini<BaseProps>): void;
    /** On wired, the static .uiShouldUpdate is not called if the instance had .uiShouldUpdate and it returned a boolean.
     * - Otherwise, this is called and can affect the outcome normally. */
    uiShouldUpdate?(mini: UIMini<BaseProps>, preProps: BaseProps | null, newProps: BaseProps | null): boolean | null;
    uiBeforeUpdate?(mini: UIMini<BaseProps>, preProps: BaseProps | null, newProps: BaseProps | null, willUpdate: boolean): void;
    uiDidUpdate?(mini: UIMini<BaseProps>, prevProps: BaseProps | null, newProps: BaseProps | null): void;
    uiDidMove?(mini: UIMini<BaseProps>): void;
    uiWillUnmount?(mini: UIMini<BaseProps>): void;

};

// Note. It would be nice that the flow was: (builder, mixer?, component?, params?).
// .. But component is the only thing required, so should be first.
// .. Alternatively, could declare function alternatives, but the setup is quite complex - so for now, like it is.
export const createWired = <
    BaseProps extends Dictionary = {},
    AddedProps extends Dictionary = {},
    MixedProps extends Dictionary = BaseProps & AddedProps,
    Params extends any[] = any[],
    Builder extends (lastProps: AddedProps | null, ...params: Params) => AddedProps = (lastProps: AddedProps | null, ...params: Params) => AddedProps,
    Mixer extends (baseProps: BaseProps, addedProps: AddedProps, ...params: Params) => MixedProps = (baseProps: BaseProps, addedProps: AddedProps, ...params: Params) => MixedProps
>(component: UIComponent<MixedProps>, builderOrProps?: Builder | AddedProps | null, mixer?: Mixer | null, ...params: Params): UIWiredType<BaseProps, AddedProps, MixedProps, Params, Builder, Mixer> => class Wired extends UIWired<BaseProps> {

    public static UI_DOM_TYPE = "Wired" as const;

    // Prepare static side.
    /** The instanced boundaries. The Wired class instance will be found as: boundary.miniApi. */
    public static components: Set<UIMini> = new Set();
    public static source: UIComponent = component;
    public static builder: Builder | null = typeof builderOrProps !== "object" && builderOrProps || null;
    public static mixer: Mixer | null = mixer || null;
    public static addedProps: AddedProps = !builderOrProps ? {} as AddedProps : typeof builderOrProps === "object" ? builderOrProps : builderOrProps(null, ...params);
    /** Default update mode.
     * - By default, we are in "always" mode, because this is an intermediary boundary: each wired target will anyway do its checking.
     * - This is to prevent rare cases where would feel like a bug - without having to go deep into the docs or code to find out why. */
    public static updateMode: UIUpdateCompareMode | null = "always";

    public static getAddedProps(): AddedProps {
        return Wired.builder ? Wired.builder(Wired.addedProps, ...params) : Wired.addedProps;
    }
    public static getMixedProps(props: BaseProps): MixedProps {
        return Wired.mixer ? Wired.mixer(props, Wired.addedProps, ...params) : { ...props, ...Wired.addedProps } as MixedProps;
    }

    /** Call this to rebuild the wired part of props and force a refresh on the instances.
     * If the props stay the same, you should have update = "force", or rather just call update directly if you know there's no builder. */
    public static refresh(update: boolean | "force" = true, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
        Wired.setProps(this.getAddedProps(), update, forceUpdateTimeout, forceRenderTimeout);
    }

    /** Call to trigger the updates for all instances. */
    public static update(forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
        for (const mini of Wired.components)
            mini.uiBoundary.update(true, forceUpdateTimeout, forceRenderTimeout);
    }

    /** Call this to manually update the wired part of props and force a refresh.
     * - This is most often called by the static refresh method above, with props coming from Wired.builder. */
    public static setProps(props: AddedProps, update: boolean | "force" = true, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
        // No change - but verify that is no forcing in anyhow.
        if (Wired.addedProps === props && update !== "force" && forceUpdateTimeout === undefined && forceRenderTimeout === undefined)
            return;
        // Set props to the static class.
        Wired.addedProps = props;
        // Update each instanced boundary.
        // .. We will force the update, since we are hiding the new props in the Wired.addedProps.
        // .. Of course, the boundary has no idea about this: its props are the ones that we'll mixwith Wired.addedProps and feed into our Wired.renderer instances.
        // .. Note that the actual sub boundary, will then do its own should update logic with the mixed props.
        if (update)
            Wired.update(forceUpdateTimeout, forceRenderTimeout);
    }

    // Render the child renderer with mixed props.
    // .. Because we are basically a MiniApi, we get fresh props with this.props.
    render(): UIRenderOutput {
        return _Defs.createDef(Wired.source, Wired.getMixedProps(this.props), uiContent);
    }

};
