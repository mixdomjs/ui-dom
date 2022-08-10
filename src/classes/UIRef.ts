

// - Imports - //

import { GroundedTreeNode, UIHTMLDiffs, UIContentSimple, ClassType } from "../static/_Types";
import { UIContentBoundary, UISourceBoundary } from "./UIBoundary";


// - UIRef - //

export function UIRefMixin<Type extends Node | UISourceBoundary = Node | UISourceBoundary>(Base: ClassType) {

    return class _UIRef extends Base {

        public static UI_DOM_TYPE = "Ref";

        public attachedTo: Set<GroundedTreeNode>;

        constructor(...args: any[]) {
            super(...args);
            this.attachedTo = new Set();
        }


        // - Getters - //

        /** This gets the last reffed treeNode.
         * - It works as if the behaviour was to always override with the last one.
         * - Except that if the last one is removed, falls back to earlier existing. */
        public getTreeNode(): GroundedTreeNode | null {
            return [...this.attachedTo][this.attachedTo.size - 1] || null;
        }
        public getTreeNodes(): GroundedTreeNode[] {
            return [...this.attachedTo];
        }
        public getDomNode(onlyForDomRefs: boolean = false): Type & Node | null {
            let i = this.attachedTo.size - 1;
            const attachedTo = [...this.attachedTo];
            while (i >= 0) {
                const treeNode = attachedTo[i];
                if (treeNode.domNode && (!onlyForDomRefs || treeNode.type === "dom"))
                    return treeNode.domNode as Type & Node;
            }
            return null;
        }
        public getDomNodes(onlyForDomRefs: boolean = false): Array<Type & Node> {
            const nodes: Array<Type & Node> = [];
            for (const treeNode of this.attachedTo)
                if (treeNode.domNode && (!onlyForDomRefs || treeNode.type === "dom"))
                    nodes.push(treeNode.domNode as (Type & Node));
            return nodes;
        }
        public getRefBoundary(): Type & UISourceBoundary | null {
            const lastRef = [...this.attachedTo][this.attachedTo.size - 1];
            return lastRef && lastRef.type === "boundary" && lastRef.boundary as (Type & UISourceBoundary) || null;
        }
        public getRefBoundaries(): Array<Type & UISourceBoundary> {
            const boundaries: Array<Type & UISourceBoundary> = [];
            for (const treeNode of this.attachedTo)
                if (treeNode.type === "boundary" && treeNode.boundary)
                    boundaries.push(treeNode.boundary as (Type & UISourceBoundary));
            return boundaries;
        }


        // - Static managers - //

        // Override.
        static didAttachOn(ref: UIRef, treeNode: GroundedTreeNode) {
            // Already mounted.
            if (ref.attachedTo.has(treeNode))
                return;
            // Add.
            ref.attachedTo.add(treeNode);
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
        static willDetachFrom(ref: UIRef, treeNode: GroundedTreeNode) {
            // Call, if was mounted.
            if (ref.attachedTo.has(treeNode)) {
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
            ref.attachedTo.delete(treeNode);
        }
    }
}
export interface UIRef<Type extends Node | UISourceBoundary = Node | UISourceBoundary> {

    /** The collection (for clarity) of tree nodes where is attached to.
     * It's not needed internally but might be useful for custom needs. */
    attachedTo: Set<GroundedTreeNode>;

    // - Getters - //

    /** This gets the last reffed treeNode.
     * - It works as if the behaviour was to always override with the last one.
     * - Except that if the last one is removed, falls back to earlier existing. */
    getTreeNode(): GroundedTreeNode | null;
    getTreeNodes(): GroundedTreeNode[];
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

}
export class UIRef<Type extends Node | UISourceBoundary = Node | UISourceBoundary> extends UIRefMixin(Object) {}
export type UIRefType<Type extends Node | UISourceBoundary = Node | UISourceBoundary> = {
    new (): UIRef<Type>;
    readonly UI_DOM_TYPE: "Ref";
    didAttachOn(ref: UIRef, treeNode: GroundedTreeNode): void;
    willDetachFrom(ref: UIRef, treeNode: GroundedTreeNode): void;
}
export const createRef = <Type extends Node | UISourceBoundary = Node | UISourceBoundary>() => new UIRef<Type>();
