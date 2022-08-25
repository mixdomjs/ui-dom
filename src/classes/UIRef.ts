

// - Imports - //

import {
    UITreeNode,
    UIHTMLDiffs,
    UIContentSimple,
    ClassType,
    ClassBaseMixer
} from "../static/_Types";
import { _Find } from "../static/_Find";
import { UIContentBoundary, UISourceBoundary } from "./UIBoundary";


// - UIRef - //

function _UIRefMixin<Type extends Node | UISourceBoundary = Node | UISourceBoundary>(Base: ClassType) {

    return class _UIRef extends Base {

        public static UI_DOM_TYPE = "Ref";

        public treeNodes: Set<UITreeNode>;

        constructor(...args: any[]) {
            super(...args);
            this.treeNodes = new Set();
        }


        // - Getters - //

        public getTreeNode(): UITreeNode | null {
            return [...this.treeNodes][this.treeNodes.size - 1] || null;
        }
        public getTreeNodes(): UITreeNode[] {
            return [...this.treeNodes];
        }
        public getDomNode(onlyForDomRefs: boolean = false): Type & Node | null {
            let i = this.treeNodes.size - 1;
            const treeNodes = [...this.treeNodes];
            while (i >= 0) {
                const treeNode = treeNodes[i];
                if (treeNode.domNode && (!onlyForDomRefs || treeNode.type === "dom"))
                    return treeNode.domNode as Type & Node;
            }
            return null;
        }
        public getDomNodes(onlyForDomRefs: boolean = false): Array<Type & Node> {
            let nodes: Array<Type & Node> = [];
            for (const treeNode of this.treeNodes) {
                if (!treeNode.domNode)
                    continue;
                if (treeNode.type === "dom")
                    nodes.push(treeNode.domNode as (Type & Node));
                else if (!onlyForDomRefs)
                    nodes = nodes.concat(_Find.rootDomTreeNodes(treeNode, true).map(tNode => tNode.domNode as (Type & Node)));
            }
            return nodes;
        }
        public getRefBoundary(): Type & UISourceBoundary | null {
            const lastRef = [...this.treeNodes][this.treeNodes.size - 1];
            return lastRef && lastRef.type === "boundary" && lastRef.boundary as (Type & UISourceBoundary) || null;
        }
        public getRefBoundaries(): Array<Type & UISourceBoundary> {
            const boundaries: Array<Type & UISourceBoundary> = [];
            for (const treeNode of this.treeNodes)
                if (treeNode.type === "boundary" && treeNode.boundary)
                    boundaries.push(treeNode.boundary as (Type & UISourceBoundary));
            return boundaries;
        }


        // - Static managers - //

        // Override.
        static didAttachOn(ref: UIRef, treeNode: UITreeNode) {
            // Already mounted.
            if (ref.treeNodes.has(treeNode))
                return;
            // Add.
            ref.treeNodes.add(treeNode);
            // Call.
            if (treeNode.type === "dom") {
                if (ref.domDidAttach && treeNode.domNode)
                    ref.domDidAttach(treeNode.domNode);
            }
            else if (treeNode.type === "boundary") {
                if (ref.uiDidAttach && treeNode.boundary)
                    ref.uiDidAttach(treeNode.boundary);
            }
        }

        // Override.
        static willDetachFrom(ref: UIRef, treeNode: UITreeNode) {
            // Call, if was mounted.
            if (ref.treeNodes.has(treeNode)) {
                if (treeNode.type === "dom") {
                    if (ref.domWillDetach && treeNode.domNode)
                        ref.domWillDetach(treeNode.domNode);
                }
                else if (treeNode.type === "boundary") {
                    if (ref.uiWillDetach && treeNode.boundary)
                        ref.uiWillDetach(treeNode.boundary);
                }
            }
            // Remove.
            ref.treeNodes.delete(treeNode);
        }
    }
}
export interface UIRef<Type extends Node | UISourceBoundary = Node | UISourceBoundary> {

    /** The collection (for clarity) of tree nodes where is attached to.
     * It's not needed internally but might be useful for custom needs. */
    treeNodes: Set<UITreeNode>;

    // - Getters - //

    /** This gets the last reffed treeNode.
     * - It works as if the behaviour was to always override with the last one.
     * - Except that if the last one is removed, falls back to earlier existing. */
    getTreeNode(): UITreeNode | null;
    getTreeNodes(): UITreeNode[];
    getDomNode(onlyForDomRefs?: boolean): Type & Node | null;
    getDomNodes(onlyForDomRefs?: boolean): Array<Type & Node>;
    getRefBoundary(): Type & UISourceBoundary | null;
    getRefBoundaries(): Array<Type & UISourceBoundary>;

    // - Overrideables - //

    // Only for dom refs.
    domDidAttach?(domNode: Type & Node): void;
    domWillDetach?(domNode: Type & Node): void;
    domDidMount?(domNode: Type & Node): void;
    domDidMove?(domNode: Type & Node, fromContainer: Node | null, fromNextSibling: Node | null): void; // , movedOut: "in" | "out" | "within"): void;
    domDidUpdate?(domNode: Type & Node, diffs: UIHTMLDiffs): void;
    domDidContent?(domNode: Type & Node, simpleContent: UIContentSimple | null): void;
    /** Return true to salvage the element: won't be removed from dom.
     * This is only useful for fade out animations, when the parenting elements also stay in the dom (and respective children). */
    domWillUnmount?(domNode: Type & Node): boolean | void;

    // Only for boundary refs.
    uiDidAttach?(boundary: Type & UISourceBoundary): void;
    uiWillDetach?(boundary: Type & UISourceBoundary | UIContentBoundary): void;
    uiDidMount?(boundary: Type & UISourceBoundary): void;
    uiDidMove?(boundary: Type & UISourceBoundary): void;
    uiWillUnmount?(boundary: Type & UISourceBoundary): void;

    // <-- Should we have uiDidUpdate here..?

}
export class UIRef<Type extends Node | UISourceBoundary = Node | UISourceBoundary> extends _UIRefMixin(Object) {}
export const createRef = <Type extends Node | UISourceBoundary = Node | UISourceBoundary>() => new UIRef<Type>();

/** There are two ways you can use this:
 * 1. Call this to give basic UIRef features.
 *      * For example: `class MyMix extends UIRefMixin(MyBase) {}`
 * 2. If you want to define Type, use this simple trick instead:
 *      * For example: `class MyMix extends (UIRefMixin as ClassBaseMixer<UIRef<MyType>>)(MyBase) {}`
 */
export const UIRefMixin = _UIRefMixin as ClassBaseMixer<UIRef>;
