

// - Imports - //

import {
    Dictionary,
    UIComponent,
    UIUpdateCompareMode,
    UIRenderOutput,
} from "../static/_Types";
import { _Defs } from "../static/_Defs";
import { UIMiniSource, UISourceBoundary } from "./UIBoundary";
import { UIMini } from "./UIMini";
import { uiContent } from "../uiDom";


// - UIWired - //

// Note that we don't make UIWired a mixin due to its extensive / special usege of static class.
export class UIWired<BaseProps extends Dictionary = {}> extends UIMini<BaseProps> {

    public static UI_DOM_TYPE = "Wired";

    public static boundaries: Set<UISourceBoundary>;
    public static source: UIComponent;
    public static builder: ((...params: any[]) => Dictionary) | null;
    public static mixer: ((baseProps: Dictionary, addsProps: Dictionary, ...params: any[]) => Dictionary) | null;
    public static props: Dictionary;

    public static refresh(_update?: boolean, _forceUpdateTimeout?: number | null, _forceRenderTimeout?: number | null): void {};
    public static update(_forceUpdateTimeout?: number | null, _forceRenderTimeout?: number | null): void {};
    public static setProps(_props: Dictionary, _update?: boolean, _forceUpdateTimeout?: number | null, _forceRenderTimeout?: number | null): void {};
    public static getAddedProps(): Record<string,any> { return {}; }
    public static getMixedProps(_props: Dictionary): Record<string,any> { return {}; }

    // Settings that will be used for UIMini purposes (automatically used by all instances).
    public static updateMode: UIUpdateCompareMode | null;
    public static uiWillMount?(boundary: UIMiniSource): void;
    public static uiDidMount?(boundary: UIMiniSource): void;
    public static uiShouldUpdate?(boundary: UIMiniSource, preProps: Dictionary | null, newProps: Dictionary | null): boolean | null;
    public static uiBeforeUpdate?(boundary: UIMiniSource, preProps: Dictionary | null, newProps: Dictionary | null, willUpdate: boolean): void;
    public static uiDidUpdate?(boundary: UIMiniSource, prevProps: Dictionary | null, newProps: Dictionary | null): void;
    public static uiDidMove?(boundary: UIMiniSource): void;
    public static uiWillUnmount?(boundary: UIMiniSource): void;

    // Listeners.
    static wiredWillMount?(wired: UIWired, boundary: UISourceBoundary): void;
    static wiredWillUnmount?(wired: UIWired, boundary: UISourceBoundary): void;

    // For startup and TSX.
    constructor(props: BaseProps, boundary?: UIMiniSource, updateMode: UIUpdateCompareMode | null = null) {
        super(props, boundary, updateMode);
    }

    render(): UIRenderOutput { return uiContent; }

}

/** The static class type for UIWired that is extended when creates a wired source.
 * Note that you can use the UIMini callbacks, they are called after calling them on the instance (if even were there). */
export type UIWiredType<BaseProps = {}, WiredProps = {}, MixedProps = BaseProps & WiredProps, Params extends any[] = any[], Builder extends (lastProps: WiredProps | null, ...params: Params) => WiredProps = (lastProps: WiredProps | null, ...params: Params) => WiredProps, Mixer extends (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps = (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps> = {

    // Constructor.
    new (_props?: BaseProps | null, _boundary?: UISourceBoundary): UIWired<BaseProps>;

    readonly UI_DOM_TYPE: "Wired";

    // These (except updateMode) will be set externally upon creating a wired class.
    /** The currently instanced boundaries that have a QWire class instance as their boundary.mini. */
    boundaries: Set<UISourceBoundary>;
    source: UIComponent;
    builder: Builder | null;
    mixer: Mixer | null;
    props: WiredProps;
    /** Default update mode.
     * - By default, we are in "always" mode, because this is an intermediary boundary: each wired target will anyway do its checking.
     * - This is to prevent rare cases where would feel like a bug - without having to go deep into the docs or code to find out why. */
    updateMode: UIUpdateCompareMode | null;

    getAddedProps(): WiredProps;
    getMixedProps(props: BaseProps): MixedProps;

    /** Call this to rebuild the wired part of props and force a refresh on the instances.
     * If the props stay the same, you should have update = "force", or rather just call update directly if you know there's no builder. */
    refresh(update?: boolean | "force", forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;
    /** Call to trigger the updates for all instances. */
    update(forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;


    /** Call this to manually update the wired part of props and force a refresh.
     * - This is most often called by the static refresh method above, with props coming from Wired.builder. */
    setProps(props: WiredProps, update?: boolean, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void;


    // Settings that will be used for UIMini purposes (automatically used by all instances).
    /** Special call for wired only - called right after constructing the wired instance. You can access the mini instance by boundary.mini. */
    uiWillMount?(boundary: UIMiniSource<BaseProps>): void;
    uiDidMount?(boundary: UIMiniSource<BaseProps>): void;
    /** On wired, the static .uiShouldUpdate is not called if the instance had .uiShouldUpdate and it returned a boolean.
     * - Otherwise, this is called and can affect the outcome normally. */
    uiShouldUpdate?(boundary: UIMiniSource<BaseProps>, preProps: BaseProps | null, newProps: BaseProps | null): boolean | null;
    uiBeforeUpdate?(boundary: UIMiniSource<BaseProps>, preProps: BaseProps | null, newProps: BaseProps | null, willUpdate: boolean): void;
    uiDidUpdate?(boundary: UIMiniSource<BaseProps>, prevProps: BaseProps | null, newProps: BaseProps | null): void;
    uiDidMove?(boundary: UIMiniSource<BaseProps>): void;
    uiWillUnmount?(boundary: UIMiniSource<BaseProps>): void;

};

export const createWired = <
    BaseProps extends Dictionary = {},
    WiredProps extends Dictionary = {},
    MixedProps extends Dictionary = BaseProps & WiredProps,
    Params extends any[] = any[],
    Builder extends (lastProps: WiredProps | null, ...params: Params) => WiredProps = (lastProps: WiredProps | null, ...params: Params) => WiredProps,
    Mixer extends (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps = (baseProps: BaseProps, addsProps: WiredProps, ...params: Params) => MixedProps
>(funcOrClass: UIComponent<MixedProps>, builderOrProps?: Builder | WiredProps | null, mixer?: Mixer, ...params: Params): UIWiredType<BaseProps, WiredProps, MixedProps, Params, Builder, Mixer> => class Wired extends UIWired<BaseProps> {

    public static UI_DOM_TYPE = "Wired" as const;

    // Prepare static side.
    /** The instanced boundaries. The Wired class instance will be found as: boundary.miniApi. */
    public static boundaries: Set<UISourceBoundary> = new Set();
    public static source: UIComponent = funcOrClass;
    public static builder: Builder | null = typeof builderOrProps !== "object" && builderOrProps || null;
    public static mixer: Mixer | null = mixer || null;
    public static props: WiredProps = !builderOrProps ? {} as WiredProps : typeof builderOrProps === "object" ? builderOrProps : builderOrProps(null, ...params);
    /** Default update mode.
     * - By default, we are in "always" mode, because this is an intermediary boundary: each wired target will anyway do its checking.
     * - This is to prevent rare cases where would feel like a bug - without having to go deep into the docs or code to find out why. */
    public static updateMode: UIUpdateCompareMode | null = "always";

    public static getAddedProps(): WiredProps {
        return Wired.builder ? Wired.builder(Wired.props, ...params) : Wired.props;
    }
    public static getMixedProps(props: BaseProps): MixedProps {
        return Wired.mixer ? Wired.mixer(props, Wired.props, ...params) : { ...props, ...Wired.props } as MixedProps;
    }

    /** Call this to rebuild the wired part of props and force a refresh on the instances.
     * If the props stay the same, you should have update = "force", or rather just call update directly if you know there's no builder. */
    public static refresh(update: boolean | "force" = true, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
        Wired.setProps(this.getAddedProps(), update, forceUpdateTimeout, forceRenderTimeout);
    }

    /** Call to trigger the updates for all instances. */
    public static update(forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
        for (const boundary of Wired.boundaries)
            boundary.update(true, forceUpdateTimeout, forceRenderTimeout);
    }

    /** Call this to manually update the wired part of props and force a refresh.
     * - This is most often called by the static refresh method above, with props coming from Wired.builder. */
    public static setProps(props: WiredProps, update: boolean | "force" = true, forceUpdateTimeout?: number | null, forceRenderTimeout?: number | null): void {
        // No change - but verify that is no forcing in anyhow.
        if (this.props === props && update !== "force" && forceUpdateTimeout === undefined && forceRenderTimeout === undefined)
            return;
        // Set props to the static class.
        Wired.props = props;
        // Update each instanced boundary.
        // .. We will force the update, since we are hiding the new props in the Wired.props.
        // .. Of course, the boundary has no idea about this: its props are the ones that we'll mixwith Wired.props and feed into our Wired.renderer instances.
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
