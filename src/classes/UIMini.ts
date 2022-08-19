

// - Imports - //

import {
    Dictionary,
    ClassType,
    ClassBaseMixer,
    UIDefTarget,
    UIMiniFunction,
    UIRenderOutput,
    UIUpdateCompareMode,
} from "../static/_Types";
import { uiDom } from "../uiDom";

function _UIMiniMixin<Props extends Dictionary = {}>(Base: ClassType) {

    return class _UIMini extends Base {

        // - Static - //

        public static UI_DOM_TYPE = "Mini";

        // - Members - //

        public readonly props: Props;
        public updateMode: UIUpdateCompareMode | null;

        // - Methods - //

        constructor(props: Props, updateMode: UIUpdateCompareMode | null = null, ...passArgs: any[]) {
            // We are a mixin.
            super(...passArgs);
            // Set from args.
            this.props = props;
            this.updateMode = updateMode;
        }
        public setUpdateMode(updateMode: UIUpdateCompareMode | null): void {
            this.updateMode = updateMode;
        }

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
     *   .. Accordingly children are not part of the .uiShouldUpdate(prevProps, nextProps). */
    updateMode: UIUpdateCompareMode | null;


    // - Methods that are set by the boundary - //

    /** Set the update mode for this particular renderer instance.
     * - If null uses settings.updateMiniMode from uiHost.
     * - Note that you can also assign the .uiShouldUpdate method to affect this. */
    setUpdateMode(updateMode: UIUpdateCompareMode | null): void;

    /** Whether the component has mounted or not. */
    isMounted(): boolean;

    /** The renderer will be assigned here. */
    render(props: Props): UIRenderOutput | UIMiniFunction<Props>;


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

    // Component life cycle.
    uiDidMount?(): void;
    uiDidMove?(): void;
    /** This is a callback that will always be called when the component is checked for updates.
     * - Note that this is not called on mount, but will be called everytime on update, even if will not actually update (use the 3rd param).
     * - Note that this will be called after uiShouldUpdate (if that is called) and right before the update happens.
     * - Note that by this time all the data has been updated already. So use preUpdates to get what it was before. */
    uiBeforeUpdate?(prevProps: Props | null, newProps: Props | null, willUpdate: boolean): void;
    /** Callback to determine whether should update or not.
     * - If returns true, component will update. If false, will not.
     * - If returns null (or no uiShouldUpdate method assigned), will use the rendering settings to determine.
     * - Note that this is not called every time necessarily (never on mount, and not if was forced).
     * - Note that this is called right before uiBeforeUpdate and the actual update (if that happens).
     * - Note that by this time all the data has been updated already. So use preUpdates to get what it was before. */
    uiShouldUpdate?(prevProps: Props | null, newProps: Props | null): boolean | null;
    uiDidUpdate?(prevProps: Props | null, newProps: Props | null): void;
    uiWillUnmount?(): void;

    // /** This is a callback that will always be called when the component is checked for updates.
    //  * - Note that this is not called on mount, but will be called everytime on update, even if will not actually update (use the 3rd param).
    //  * - Note that this will be called after uiShouldUpdate (if that is called) and right before the update happens.
    //  * - Note that by this time all the data has been updated already. So use preUpdates to get what it was before. */
    // beforeUpdate?(prevProps: Props | null, newProps: Props | null, willUpdate: boolean): void;
    //
    // <-- Dropped. Because, then would like the full life cycle, too.
    // ... And then should just make UILive extend UIMini and fatten the shouldUpdate { props, children } and unify contextApi usage.


}
// export declare class UIMini<Props extends Dictionary = {}> extends _UIMiniMixin(Object) {
//     // Needed for TSX.
//     constructor(props: Props, updateMode?: UIUpdateCompareMode | null);
// }

export class UIMini<Props extends Dictionary = {}> extends _UIMiniMixin(Object) {
    // Needed for TSX.
    constructor(props: Props, updateMode: UIUpdateCompareMode | null = null) { super(props, updateMode); }
}

export const createMini = <Props extends Dictionary = {}>( func: (mini: UIMini<Props>, props: Props) => ReturnType<UIMiniFunction<Props>>): UIMiniFunction<Props> =>
    function(props) { return func(this, props); };

/** There are two ways you can use this:
 * 1. Call this to give basic UIMini features with types for Props and such being empty.
 *      * For example: `class MyMix extends UIMiniMixin(MyBase) {}`
 * 2. If you want to define Props and such, use this simple trick instead:
 *      * For example: `class MyMix extends (UIMiniMixin as ClassBaseMixer<UIMini<MyProps>>)(MyBase) {}`
 */
export const UIMiniMixin = _UIMiniMixin as ClassBaseMixer<UIMini>;
