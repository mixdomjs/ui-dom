

// - Imports - //

import { _Find } from "../static/_Find";
import { _Lib } from "../static/_Lib";
import {
    ClassType,
    ClassBaseMixer,
    UIDefTarget,
    UIMiniFunction,
    UIRenderOutput,
    UIUpdateCompareMode,
    RecordableType,
    UITreeNodeType,
    UITreeNode,
    UIComponent,
} from "../static/_Types";
import { uiDom } from "../uiDom";
import { UIMiniBoundary, UISourceBoundary } from "./UIBoundary";

function _UIMiniMixin<Props = any>(Base: ClassType) {

    return class _UIMini extends Base {

        // - Static - //

        public static UI_DOM_TYPE = "Mini";

        // - Members - //

        public readonly uiBoundary: UIMiniBoundary;
        public readonly props: Props;
        public updateMode: UIUpdateCompareMode | null;

        // - Methods - //

        constructor(props: Props, boundary?: UISourceBoundary, ...passArgs: any[]) {
            // We are a mixin.
            super(...passArgs);
            // Set from args.
            this.props = props;
            if (boundary) {
                this.uiBoundary = boundary as UIMiniBoundary;
                boundary.mini = this as UIMini;
            }
        }

        // - Update mode - //

        public setUpdateMode(updateMode: UIUpdateCompareMode | null): void {
            this.updateMode = updateMode;
        }

        // - Content api - //

        public getChildren(skipNeeds: boolean = false, shallowCopy: boolean = false): Readonly<UIDefTarget[]> {
            return this.uiBoundary.contentApi.getChildren(skipNeeds, shallowCopy) || [];
        }
        public needsChildren(needs?: boolean | "temp" | null): void {
            this.uiBoundary.contentApi.needsChildren(needs);
        }

        // - Getters - //

        public isMounted(): boolean {
            return this.uiBoundary.isMounted === true;
        }

        public queryDomElement(selector: string, withinBoundaries: boolean = false, overHosts: boolean = false): Element | null {
            return _Find.domElementByQuery(this.uiBoundary.treeNode, selector, withinBoundaries, overHosts);
        }

        public queryDomElements(selector: string, maxCount: number = 0, withinBoundaries: boolean = false, overHosts: boolean = false): Element[] {
            return _Find.domElementsByQuery(this.uiBoundary.treeNode, selector, maxCount, withinBoundaries, overHosts);
        }

        public findDomNodes(maxCount: number = 0, withinBoundaries: boolean = false, overHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): Node[] {
            return _Find.treeNodesWithin(this.uiBoundary.treeNode, { dom: true }, maxCount, withinBoundaries, overHosts, validator).map(tNode => tNode.domNode) as Node[];
        }

        public findComponents<Component extends UIComponent = UIComponent>(maxCount: number = 0, withinBoundaries: boolean = false, overHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): Component[] {
            return _Find.treeNodesWithin(this.uiBoundary.treeNode, { boundary: true }, maxCount, withinBoundaries, overHosts, validator).map(t => (t.boundary && (t.boundary.live || t.boundary.mini)) as unknown as Component);
        }

        public findTreeNodes(types?: RecordableType<UITreeNodeType>, maxCount: number = 0, withinBoundaries: boolean = false, overHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): UITreeNode[] {
            return _Find.treeNodesWithin(this.uiBoundary.treeNode, types && _Lib.buildRecordable<UITreeNodeType>(types), maxCount, withinBoundaries, overHosts, validator);
        }

        // - Render - //

        public render(_props: Props): UIRenderOutput | UIMiniFunction<Props> { return uiDom.Content; }

    }
}
export interface UIMini<Props = {}> {

    // - Members - //

    /** Ref to the dedicated boundary. */
    uiBoundary: UIMiniBoundary;

    /** Fresh props. */
    readonly props: Props;

    /** Settable updateMode: "always" | "changed" | "shallow" | "double" | "deep".
     * - See UIUpdateCompareMode for details.
     * - Note that for UIMini, you can't define the needs for children.
     *   .. The setting is always in the default host based mode for children, by default it's "changed".
     *   .. Accordingly children are not part of the .uiShouldUpdate(prevProps, nextProps). */
    updateMode: UIUpdateCompareMode | null;


    // - Update mode - //

    /** Set the update mode for this particular renderer instance.
     * - If null uses settings.updateMiniMode from uiHost.
     * - Note that you can also assign the .uiShouldUpdate method to affect this. */
    setUpdateMode(updateMode: UIUpdateCompareMode | null): void;


    // - Getters - //

    isMounted(): boolean;
    queryDomElement<T extends Element = Element>(selector: string, withinBoundaries?: boolean, overHosts?: boolean): T | null;
    queryDomElements<T extends Element = Element>(selector: string, maxCount?: number, withinBoundaries?: boolean, overHosts?: boolean): T[];
    findDomNodes<T extends Node = Node>(maxCount?: number, withinBoundaries?: boolean, overHosts?: boolean, validator?: (treeNode: UITreeNode) => any): T[];
    findComponents<Component extends UIComponent = UIComponent>(maxCount?: number, withinBoundaries?: boolean, overHosts?: boolean, validator?: (treeNode: UITreeNode) => any): Component[];
    findTreeNodes(types?: RecordableType<UITreeNodeType>, maxCount?: number, withinBoundaries?: boolean, overHosts?: boolean, validator?: (treeNode: UITreeNode) => any): UITreeNode[];


    // - Children - //

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


    // - Render - //

    /** The renderer will be assigned here. */
    render(props: Props): UIRenderOutput | UIMiniFunction<Props>;


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

}

export class UIMini<Props = {}> extends _UIMiniMixin(Object) {
    // Needed for TSX.
    constructor(props: Props, boundary?: UISourceBoundary) { super(props, boundary); }
}

export const createMini = <Props = {}>( func: (mini: UIMini<Props>, props: Props) => ReturnType<UIMiniFunction<Props>>): UIMiniFunction<Props> =>
    function(props) { return func(this, props); };

/** There are two ways you can use this:
 * 1. Call this to give basic UIMini features with types for Props and such being empty.
 *      * For example: `class MyMix extends UIMiniMixin(MyBase) {}`
 * 2. If you want to define Props and such, use this simple trick instead:
 *      * For example: `class MyMix extends (UIMiniMixin as ClassBaseMixer<UIMini<MyProps>>)(MyBase) {}`
 */
export const UIMiniMixin = _UIMiniMixin as ClassBaseMixer<UIMini>;
