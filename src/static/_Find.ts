
// - Imports - //

import { _Lib } from "./_Lib";
import {
    UITreeNode,
    UITreeNodeDom,
    UITreeNodeType,
    UIBoundary,
} from "./_Types";
import { _Defs } from "./_Defs";
import { UIContentBoundary, UISourceBoundary } from "../classes/UIBoundary";


// - _Find static features - //

export const _Find = {


    // - Finders - //

    /** This is a very quick way to find all boundaries within and including the given one - recursively if includeNested is true.
     * - Note that this stays inside the scope of the host (as .innerBoundaries doesn't contain the root boundary of a host). */
    boundariesWithin(origBoundary: UIBoundary, includeNested: boolean = true): (UISourceBoundary | UIContentBoundary)[] {
        // Prepare.
        const list: UIBoundary[] = [];
		let bLeft : UIBoundary[] = [origBoundary];
		let boundary : UIBoundary | undefined;
        let i = 0;
        // Loop recursively in tree order.
		while (boundary = bLeft[i]) {
            // Next.
            i++;
            // Skip inactive.
            if (boundary.isMounted === null)
                continue;
            // Accepted.
            list.push(boundary);
            // Skip going further.
            if (!includeNested && origBoundary !== boundary)
                continue;
			// Add child defs to top of queue.
			if (boundary.innerBoundaries[0]) {
			    bLeft = boundary.innerBoundaries.concat(bLeft.slice(i));
                i = 0;
            }
		}
        return list
    },

    /** Finds treeNodes of given types within the given rootTreeNode (including it).
     * - If includeNested is true, searches recursively inside sub boundaries - not just within the render scope. (Normally stops after meets a source or content boundary.)
     * - If includeInHosts is true, extends the search to inside nested hosts as well. (Not recommended.)
     * - If includeInInactive is true, extends the search to include inactive boundaries and treeNodes inside them. */
    treeNodesWithin(rootTreeNode: UITreeNode, okTypes?: Partial<Record<UITreeNodeType, boolean>>, maxCount: number = 0, includeNested: boolean = false, includeInHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): UITreeNode[] {
        // Prepare.
        const list: UITreeNode[] = [];
		let treeNodesLeft : UITreeNode[] = [rootTreeNode];
		let treeNode : UITreeNode | undefined;
        let i = 0;
        const origBoundary = rootTreeNode.boundary;
        // Loop recursively in tree order.
		while (treeNode = treeNodesLeft[i]) {
            // Next.
            i++;
            // Skip inactive.
            if (treeNode.boundary && treeNode.boundary.isMounted === null)
                continue;
            // Accepted.
            if (!okTypes || okTypes[treeNode.type]) {
                if (!validator || validator(treeNode)) {
                    const count = list.push(treeNode);
                    if (maxCount && count >= maxCount)
                        return list;
                }
            }
            // Skip going further.
            if (treeNode.boundary && !includeNested && treeNode.boundary !== origBoundary)
                continue;
            else if (treeNode.type === "host" && !includeInHosts)
                continue;
			// Add child defs to top of queue.
			if (treeNode.children[0]) {
			    treeNodesLeft = treeNode.children.concat(treeNodesLeft.slice(i));
                i = 0;
            }
		}
        return list
    },

    rootDomTreeNodes(rootNode: UITreeNode, inNestedBoundaries: boolean = false, includeEmpty: boolean = false, maxCount: number = 0): UITreeNodeDom[] {
        // Loop each root node.
        let collected: UITreeNodeDom[] = [];
        for (const treeNode of rootNode.children) {
            // Skip - doesn't have any.
            if (!treeNode.domNode && !includeEmpty)
                continue;
            // Handle by type.
            switch(treeNode.type) {
                // Collect.
                case "dom":
                    collected.push(treeNode);
                    if (maxCount && collected.length >= maxCount)
                        return collected;
                    break;
                // If does not want nested boundaries (including nested uiHosts), skip.
                // .. Otherwise continue to collect root nodes (below).
                case "boundary":
                case "pass":
                case "host":
                    if (!inNestedBoundaries)
                        break;
                // Collect root nodes inside.
                case "contexts":
                case "root":
                    collected = collected.concat(_Find.rootDomTreeNodes(treeNode, inNestedBoundaries, includeEmpty, maxCount - collected.length));
                    if (maxCount && collected.length >= maxCount)
                        return collected.slice(0, maxCount);
                    break;
            }
        }
        // Return collection.
        return collected;
    },


    // - Shortcuts - //

    // treeNodesIn(treeNode: UITreeNode, types: RecordableType<UITreeNodeType>, maxCount: number = 0, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): UITreeNode[] {
    //     return _Find.treeNodesWithin(treeNode, _Lib.buildRecordable<UITreeNodeType>(types), maxCount, allowWithinBoundaries, allowOverHosts, validator);
    // },
    //
    // componentsIn<Component extends UIComponent = UIComponent>(treeNode: UITreeNode, maxCount: number = 0, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): Component[] {
    //     return _Find.treeNodesWithin(treeNode, { boundary: true }, maxCount, allowWithinBoundaries, allowOverHosts, validator).map(t => (t.boundary && (t.boundary.live || t.boundary.mini)) as unknown as Component);
    // },

    domElementByQuery<T extends Element = Element>(treeNode: UITreeNode, selectors: string, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false): T | null {
        const validator = (tNode: UITreeNode) => tNode.domNode && tNode.domNode instanceof Element && tNode.domNode.matches(selectors);
        const foundNode = _Find.treeNodesWithin(treeNode, { dom: true }, 1, allowWithinBoundaries, allowOverHosts, validator)[0];
        return foundNode && foundNode.domNode as T || null;
    },

    domElementsByQuery<T extends Element = Element>(treeNode: UITreeNode, selectors: string, maxCount: number = 0, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false): T[] {
        const validator = (tNode: UITreeNode) => tNode.domNode && tNode.domNode instanceof Element && tNode.domNode.matches(selectors);
        return _Find.treeNodesWithin(treeNode, { dom: true }, maxCount, allowWithinBoundaries, allowOverHosts, validator).map(tNode => tNode.domNode as T);
    },

}
