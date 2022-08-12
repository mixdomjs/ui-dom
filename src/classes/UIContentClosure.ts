

// - Imports - //

import {
    UITreeNode,
    UIBoundary,
    UIChangeInfos,
    UIContentEnvelope,
    UIDefApplied,
    UIDomRenderInfo,
    UISourceBoundaryChange
} from "../static/_Types";
import { _Apply } from "../static/_Apply";
import { UIContentBoundary, UISourceBoundary } from "./UIBoundary";


// - Content closure - //

export class UIContentClosure {

    thruBoundary: UISourceBoundary | UIContentBoundary;
    sourceBoundary: UISourceBoundary | null;
    envelope: UIContentEnvelope | null;
    truePassDef: UIDefApplied | null;
    groundedDefsMap: Map<UIDefApplied, [UISourceBoundary | UIContentBoundary, UITreeNode, any]>;
    pendingDefs: Set<UIDefApplied>;

    constructor(thruBoundary: UISourceBoundary, sourceBoundary?: UISourceBoundary | null) {
        this.thruBoundary = thruBoundary;
        this.sourceBoundary = sourceBoundary || null;
        this.envelope = null;
        this.truePassDef = null;
        this.groundedDefsMap = new Map();
        this.pendingDefs = new Set();
    }

    // If was grounded for the first time, updates the internals and returns render infos and boundary updates for the content.
    // .. If was grounded already returns [] for infos.
    contentGrounded(groundingDef: UIDefApplied, gBoundary: UISourceBoundary | UIContentBoundary, treeNode: UITreeNode, copyKey?: any): UIChangeInfos {

        // Note that we don't collect listener boundaries.
        // .. Instead it's handled by downward flow (as content is rarely passed super far away).
        // .. To make it easier to handle not calling update on boundary many times, we just return a list of interested boundaries on .preRefresh().
        // .. The rest is then handled externally by the applyDefPairs process (after this function has returned).

        // Already grounded.
        // .. There's no changes upon retouching the ground - it was the parent that rendered, we don't care and nor does it.
        // .. However, we must still detect moving, and add according renderInfos (for all our dom roots) if needed.
        const info = this.groundedDefsMap.get(groundingDef);
        if (info) {
            // Check if should move the content.
            if (groundingDef.action === "moved" && treeNode.boundary) {
                // If so, it's just a simple move by collecting all root nodes inside.
                const rInfos = treeNode.boundary.getTreeNodesForDomRoots(true).map( treeNode => ({ treeNode, move: true }) as UIDomRenderInfo );
                return [rInfos, []];
            }
            // Nothing to do.
            return [[], []];
        }

        // Update mapping.
        this.groundedDefsMap.set(groundingDef, [gBoundary, treeNode, copyKey]);

        // Update now and return the infos to the flow - we do this only upon grounding for the first time.
        // .. Otherwise, our content is updated on .applyRefresh(), which will be called after.
        return this.applyContentDefs([groundingDef]);

    }

    contentUngrounded(groundingDef: UIDefApplied): [UIDomRenderInfo[], UISourceBoundaryChange[]] {
        // Not ours - don't touch.
        const info = this.groundedDefsMap.get(groundingDef);
        if (!info)
            return [[], []];
        // Was the real pass - free it up.
        if (this.truePassDef === groundingDef)
            this.truePassDef = null;
        // Remove from groundDefs and put its childDefs back to empty.
        this.groundedDefsMap.delete(groundingDef);
        this.pendingDefs.delete(groundingDef);
        // Destroy the content boundary (attached to the treeNode in our info).
        // .. We must nullify the defs too.
        const boundary = info[1].boundary;
        return boundary ? _Apply.destroyBoundary(boundary) : [[], []];
    }

    preRefresh(newEnvelope: UIContentEnvelope | null): UISourceBoundary[] {

        // Special quick exit: already at nothing.
        if (!this.envelope && !newEnvelope)
            return [];

        // Collect old kids.
        const oldKids = this.envelope ? this.envelope.targetDef.childDefs.slice() : [];
        // Set envelope.
        this.envelope = newEnvelope;
        // Mark all as pending.
        this.pendingDefs = new Set(this.groundedDefsMap.keys());

        // Go and collect all those that were interested in our contents (by children needs).
        // ... This is done by getting our landing boundaries and going up checking each until our sourceBoundary.
        const interested: UISourceBoundary[] = [];
        for (const [gBoundary] of this.groundedDefsMap.values()) {
            // Go up and collect interests.
            let pBoundary: UIBoundary | null = gBoundary;
            while (pBoundary) {
                // Check interests - only the source boundaries will have contextApi.
                const cApi = pBoundary.contentApi;
                if (cApi) {
                    if (cApi.childrenNeeds) {
                        // Add to interested.
                        interested.push(pBoundary as UISourceBoundary);
                        // Add to pre updates.
                        if (!pBoundary._preUpdates)
                            pBoundary._preUpdates = { children: oldKids };
                        else if (!pBoundary._preUpdates.children)
                            pBoundary._preUpdates.children = oldKids;
                    }
                    // No more content passing - the chain has been broken.
                    if (!(pBoundary as UISourceBoundary).closure.envelope)
                        break;
                }
                // Get next up - until the source.
                pBoundary = pBoundary.sourceBoundary;
                if (pBoundary === this.sourceBoundary)
                    break;
            }
        }

        // Return the interested in tree order - this is reverse to the flow above (where we look from the innermost envelope outwards).
        if (interested[0])
            interested.reverse();
        return interested;
    }

    applyRefresh(forceUpdate: boolean = false): UIChangeInfos {

        // Prepare outcome.
        let renderInfos: UIDomRenderInfo[] = [];
        let boundaryChanges: UISourceBoundaryChange[] = [];

        // Apply closure content to all pending and still existing grounders.
        // .. Note that the only time there's a grounder that's not pending is that when it was just grounded.
        // .. In that case its render info was returned in that part of flow.
        if (this.pendingDefs.size)
            [ renderInfos, boundaryChanges ] = this.applyContentDefs(this.pendingDefs, forceUpdate);

        // There's no true pass def at all - clean up all inside in relation to original defs.
        if (!this.truePassDef && this.envelope) {
            const devLog = this.thruBoundary.uiHost.settings.devLogCleanUp;
            for (const def of this.envelope.appliedDef.childDefs) {
                // Nothing to clean up.
                const treeNode = def.treeNode;
                if (!treeNode)
                    continue;
                // - DEVLOG - //
                // Log.
                if (devLog)
                    console.log("__UIContentClosure.applyRefresh dev-log - clean up treeNode (no true pass): ", treeNode);
                // Dom node.
                if (treeNode.type === "dom")
                    renderInfos.push({treeNode, remove: true });
                // Boundary.
                else if (treeNode.boundary) {
                    const [ rInfos, bUpdates ] = _Apply.destroyBoundary(treeNode.boundary);
                    renderInfos = renderInfos.concat(rInfos);
                    boundaryChanges = boundaryChanges.concat(bUpdates);
                }
                // Remove.
                treeNode.parent = null;
                treeNode.sourceBoundary = null;
                delete def.treeNode;
            }
        }

        // All had been updated already.
        return [renderInfos, boundaryChanges];
    }

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
    private applyContentDefs(groundedDefs?: Iterable<UIDefApplied> | null, forceUpdate: boolean = false): UIChangeInfos {

        // Collect rendering infos basis once.
        // .. They are the same for all copies, except that the appliedDef is different for each.
        if (!groundedDefs)
            groundedDefs = this.groundedDefsMap.keys();
        // Loop each given groundedDef.
        let renderInfos: UIDomRenderInfo[] = [];
        let boundaryChanges: UISourceBoundaryChange[] = [];
        for (const groundingDef of groundedDefs) {
            // Mark as non-pending in any case.
            this.pendingDefs.delete(groundingDef);
            // Get.
            const info = this.groundedDefsMap.get(groundingDef);
            if (info === undefined)
                continue;
            let [gBoundary, treeNode, copyKey] = info;
            let contentBoundary = treeNode.boundary as UIContentBoundary | null;
            // Remove.
            if (!this.envelope || !this.sourceBoundary) {
                // Destroy.
                if (contentBoundary) {

                    // Note that we must call destroyBoundary with nullifyDefs=false (for true pass at least).
                    // .. The reason is that otherwise we might be messing up with treeNodes that maybe were reused in original render scope.
                    // .... It was verified earlier that there was a recursively adding bug because of nullifying defs.
                    // .. Note that alternatively we can just do: contentBoundary._innerDef.childDefs = []. This will essentially make nullifyDefs not run on the boundary.
                    // .... However, doing this sounds a bit wrong in case there are nested passes inside - because we should not nullify their defs either.

                    // Destroy and collect render infos - do not nullify defs (see above why).
                    renderInfos = renderInfos.concat(_Apply.destroyBoundary(contentBoundary, false)[0]);

                    // We are the ones doing bookkeeping for the treeNode.boundary when it's a content boundary.
                    treeNode.boundary = null;
                }
            }
            // Create / update.
            else {
                let isTruePass = true;
                // Create.
                if (!contentBoundary) {
                    // Create a new content boundary.
                    contentBoundary = new UIContentBoundary(groundingDef, this.envelope.targetDef, treeNode, this.sourceBoundary);
                    // Create basis for content copy - forces copy if already has a grounded def for truePass.
                    // .. Each copy grounding starts from an empty applied def, so we don't need to do anything else.
                    // .. For true pass we assign the childDefs directly to the innerDef's childDefs - the innerDef is a fragment.
                    isTruePass = copyKey == null && (!this.truePassDef || this.truePassDef === groundingDef);
                    if (isTruePass) {
                        contentBoundary._innerDef.childDefs = this.envelope.appliedDef.childDefs;
                        this.truePassDef = groundingDef;
                    }
                    // Assign common stuff.
                    contentBoundary.parentBoundary = gBoundary;
                    treeNode.boundary = contentBoundary;
                }
                // Update existing content boundary.
                else {
                    isTruePass = this.truePassDef === groundingDef;
                    contentBoundary.updateEnvelope(this.envelope.targetDef, isTruePass ? this.envelope.appliedDef : null);
                }
                // Apply defs to pass/copy.
                const [rInfos, bChanges] = isTruePass ?
                    _Apply.runContentPassUpdate(contentBoundary, forceUpdate) :
                    _Apply.runBoundaryUpdate(contentBoundary, forceUpdate);
                // Collect infos.
                renderInfos = renderInfos.concat(rInfos);
                boundaryChanges = boundaryChanges.concat(bChanges);
            }
        }
        // Return infos.
        return [renderInfos, boundaryChanges];

    }

}
