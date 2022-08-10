

// - Imports - //

import {
    ClassType,
    Dictionary,
    UIDefTarget,
    UIMiniFunction,
    UIRenderOutput,
    UIUpdateCompareMode,
} from "../static/_Types";
import { uiDom } from "../uiDom";
import { UIHost } from "./UIHost";

export function UIMiniMixin<Props extends Dictionary = {}>(Base: ClassType) {

    return class _UIMini extends Base {

        // - Static - //

        public static UI_DOM_TYPE = "Mini";

        // - Members - //

        public readonly props: Props;
        public updateMode: UIUpdateCompareMode | null;

        // - Methods - //

        constructor(props: Props, updateMode: UIUpdateCompareMode | null = null, ...passArgs: any[]) {
            super(...passArgs);
            this.props = props;
            this.updateMode = updateMode;
        }
        public setUpdateMode(updateMode: UIUpdateCompareMode | null): void {
            this.updateMode = updateMode;
        }
        public shouldUpdate?(prevProps: Props | null, newProps: Props | null): boolean | null;
        // public beforeUpdate?(prevProps: Props | null, newProps: Props | null, willUpdate: boolean): void;

        // - Methods that are set by the boundary - //

        public render(_props: Props): UIRenderOutput | UIMiniFunction<Props> { return uiDom.Content; }
        public isMounted(): boolean { return false; }
        public getChildren(_skipNeeds: boolean = false, _shallowCopy: boolean = true): Readonly<UIDefTarget[]> { return []; }
        public needsChildren(_needs?: boolean | "temp" | null): void {}

    }
}
export interface UIMini<Props extends Dictionary = {}> {

    // - Members - //

    /** Fresh props. */
    readonly props: Props;

    /** Settable updateMode: "always" | "changed" | "shallow" | "double" | "deep".
     * - See UIUpdateCompareMode for details.
     * - Note that for UIMini, you can't define the needs for children.
     *   .. The setting is always in the default host based mode for children, by default it's "changed".
     *   .. Accordingly children are not part of the .shouldUpdate(prevProps, nextProps). */
    updateMode: UIUpdateCompareMode | null;

    // - Methods - //

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

    // - Callbacks - //

    /** If returns true, component will update. If false, will not.
     * If returns null (or no shouldUpdate method assigned), will use the rendering settings to determine.
     * Note that this is named different from uiShouldUpdate because the arguments are just props, not { props?, state?, context?, children? }.*/
    shouldUpdate?(prevProps: Props | null, newProps: Props | null): boolean | null;

    // /** This is a callback that will always be called when the component is checked for updates.
    //  * - Note that this is not called on mount, but will be called everytime on update, even if will not actually update (use the 3rd param).
    //  * - Note that this will be called after uiShouldUpdate (if that is called) and right before the update happens.
    //  * - Note that by this time all the data has been updated already. So use preUpdates to get what it was before. */
    // beforeUpdate?(prevProps: Props | null, newProps: Props | null, willUpdate: boolean): void;
    //
    // <-- Dropped. Because, then would like the full life cycle, too.
    // ... And then should just make UILive extend UIMini and fatten the shouldUpdate { props, children } and unify contextApi usage.

    // - Methods that are set by the boundary - //

    /** Whether the component has mounted or not. */
    isMounted(): boolean;

    /** Set the update mode for this particular renderer instance.
     * - If null uses settings.updateMiniMode from uiHost.
     * - Note that you can also assign the .shouldUpdate method to affect this. */
    setUpdateMode(updateMode: UIUpdateCompareMode | null): void;

    /** The renderer will be assigned here. */
    render(_props: Props): UIRenderOutput | UIMiniFunction<Props>;

}
export class UIMini<Props extends Dictionary = {}> extends UIMiniMixin(Object) { }
export type UIMiniType<Props extends Dictionary = {}> = {
    new (props: Props, updateMode?: UIUpdateCompareMode | null): UIHost;
    readonly UI_DOM_TYPE: "Mini";
}

export const createMini = <Props extends Dictionary = {}>( func: (mini: UIMini<Props>, props: Props) => ReturnType<UIMiniFunction<Props>>): UIMiniFunction<Props> =>
    function(props) { return func(this, props); };
