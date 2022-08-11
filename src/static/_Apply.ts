
// - Imports - //

import { _Lib } from "./_Lib";
import {
    Dictionary,
    UITreeNode,
    UITreeNodeDom,
    UITreeNodeBoundary,
    UITreeNodeHost,
    UITreeNodeContexts,
    UITreeNodePortal,
    UITreeNodeType,
    UIDefKeyTag,
    UIDefTarget,
    UIDefApplied,
    UIDefTargetPseudo,
    UIDefAppliedPseudo,
    UIUpdateCompareMode,
    UISourceBoundaryChange,
    UIDomRenderInfo,
    UIChangeInfos,
    UILiveUpdates,
    UILiveNewUpdates,
    UIContentSimple,
    UIContentEnvelope,
    UIBoundary,
    UIHostSettings,
    UIContextRefresh,
    RecordableType,
} from "./_Types";
import { _Defs } from "./_Defs";
import { uiContent } from "../uiDom";
import { UIRender } from "../classes/UIRender";
import { UIContentBoundary, UISourceBoundary, UILiveSource } from "../classes/UIBoundary";
import { UIRef } from "../classes/UIRef";
import { UILive } from "../classes/UILive";
import { UIWired, UIWiredType } from "../classes/UIWired";
import { UIContext } from "../classes/UIContext";


// - Methods - //

type OuterContexts = Record<string, UIContext | null>;
type ToApplyPair = [UIDefTarget, UIDefApplied, UITreeNode, OuterContexts];

export const _Apply = {

    /** For the special types, just anything unique other than string and function - and not !!false. */
    SEARCH_TAG_BY_TYPE: {
        "fragment": 1,
        "portal": 2,
        "pass": 3,
        "contexts": 4,
        "host": 5,
    }, // as Record<UIDefType, number>,


    // - Closure update process - //

    // Visual analogy: ContentClosure as a SEALED ENVELOPE:
    //
    // - Think of the ContentClosure as a sealed envelope that gets passed from the original boundary to a sub-boundary in it.
    //   * The contents of the envelope describe the contents that this particular sub-boundary has from its direct parent boundary.
    //   * The contents also contain a direct reference to the paired def branch of the original boundary (to update its treeNode assignments on grounding, or clear on ungrounding).
    //
    // - If the sub-boundary does not ground the content directly, but passes it to another sub-sub-boundary, then a new envelope is written for it.
    //   * Again the envelope contains whatever the sub-boundary assigned to its sub-sub-boundary, which in case case includes the earlier envelope.
    //   * In other words, the new envelope contains (amongst other content) another envelope from up the tree.
    //
    // - When the content is finally grounded (if at all), the last (freshest) envelope is opened.
    //   - On grounding the closure also gets a treeNode reference that should be used similarly to boundary's baseTreeNode.
    //     * Otherwise the rendering wouldn't know where to insert the contents.
    //   a) For a TRUE PASS:
    //     1. After opening the envelope, the pairing process is finished (by attaching treeNodes) and an array of pairs to be grounded is formed.
    //     2. The pairs are fed to a new grounding process, which grounds dom elements and mounts/updates sub-boundaries within collecting getting render infos.
    //     3. If the newly grounded defs contained more envelopes, then they get opened similarly to this envelope and render infos from it are added to the flow.
    //        .. Note that we only open the grounded envelopes - envelopes nested in sub-boundaries will be open when they are grounded (if ever).
    //   b) For a CONTENT COPY:
    //     - It's basically the same routine as on boundary mount/update, but just done for closure via UIContentBoundary instead of UISourceBoundary.
    //     - This is because, although sharing the same target defs, each copy is independent from the original render scope's applied defs - each copy has its own applied def root and should do its own pairing.
    //
    // - If the content gets ungrounded by a nested component that earlier grounded it:
    //     * All its contents get destroyed, which includes destroying any nested sub-boundaries and envelopes - collecting infos for all this.
    //     * For a TRUE PASS this means modifying the original applied defs treeNode assignments accordingly.
    //       .. If the content later gets re-grounded, then it's like it was grounded for the first time.
    //     * For a CONTENT COPY, it's simply the destruction - it also gets removed from the map that maps copies.
    //
    // - When the original boundary re-renders:
    //   * Any new sub-boundaries will trigger writing new envelopes for them, just like on the first render - collecting infos.
    //   * Any sub-boundaries no longer present will be destroyed, which includes destroying all their envelopes and nested sub-boundaries as well - collecting infos.
    //   * Any kept sub-boundaries (by def pairing) with sealed envelopes will get new envelopes in their place.
    //     .. This causes a re-render of the contents for all the grounded passes and copies.
    //   a) For a TRUE PASS:
    //      - The situation is like on grounding, except that our def pairing has changed.
    //         .. So likewise we start by finishing the pairing process: adding any missing treeNodes.
    //      - Otherwise it's the same: the pairs are fed to a grounding process, and so on.
    //   b) For a CONTENT COPY:
    //      - It's simply the same routine as on boundary mount/update but for closures.
    //
    // Using getChildren():
    // - Using the getChildren method results in reading the child defs that are held inside the sealed envelope.
    //   * In other words, it's like a spying technology that allows to read what's inside the envelope without opening it.
    // - The boundary that does the spying also needs to be updated when contents have changed - to refresh the info, otherwise would have old info.
    //   * This is marked into the closure, by using .getChildren() and/or .needsChildren(needs: boolean | null).
    //     .. You can also just read the children without updating needs by .getChildren(false) - this is useful if you use it outside the render method.
    //   * So whenever a new sealed copy (with same "id") is passed to replace the old one, the spying boundaries will also update.
    //     .. The flow also takes care of that the spying boundaries won't be updated multiple times (because they are kids, might be updated anyway).


    /**
     * For true ContentPass, the situation is very distinguished:
     *   - Because we are in a closure, our target defs have already been mapped to applied defs and new defs created when needed.
     *   - However, the treeNode part of the process was not handled for us. So we must do it now.
     *   - After having updated treeNodes and got our organized toApplyPairs, we can just feed them to _Apply.applyDefPairs to get renderInfos and boundaryUpdates.
     */
    runContentPassUpdate(contentBoundary: UIContentBoundary, forceUpdate: boolean = false): UIChangeInfos {

        // 1. Make a pre loop to assign groundable treeNodes.
        const [ toApplyPairs, toCleanUp, emptyMovers ] = _Apply.assignTreeNodesForPass(contentBoundary);

        // 2. Apply the target defs recursively until each boundary starts (automatically limited by our toApplyPairs).
        // .. We update each def collecting render infos, and on boundaries create/update content closure and call mount/update.
        let [ renderInfos, boundaryChanges ] = _Apply.applyDefPairs(contentBoundary, toApplyPairs, forceUpdate);

        // If we have custom clean ups.
        if (toCleanUp[0]) {
            // Go through the clean-uppable and collect.
            const unusedDefs: Set<UIDefApplied> = new Set();
            for (const treeNode of toCleanUp) {
                // Was reused further inside.
                if (treeNode.sourceBoundary)
                    continue;
                // Add to clean up.
                if (treeNode.def)
                    unusedDefs.add(treeNode.def);
                // Just in case.
                treeNode.parent = null;
            }
            // Clean up any defs that were detected by custom clean up.
            if (unusedDefs.size) {
                const rInfos = _Apply.cleanUpBoundaryDefs(unusedDefs, contentBoundary.uiHost.settings.devLogCleanUp);
                // Add to the beginning.
                renderInfos = rInfos.concat(renderInfos);
            }
        }

        // Prepend empty movers.
        if (emptyMovers[0])
            renderInfos = emptyMovers.map(treeNode => ({ treeNode, emptyMove: true } as UIDomRenderInfo)).concat(renderInfos);

        // Mark as having been activated. (We use this for the mount vs. update checks.)
        contentBoundary.isMounted = true;

        // 3. Return collected render infos.
        return [ renderInfos, boundaryChanges ];
    },


    // - BOUNDARY UPDATE PROCESS - //

    /** The main method to update the boundary.
     *
     * - MAIN IDEA - //
     *
     * PHASE I - pre-map reusability - "PRE-MANGLING LOOP":
     * 1. Handle boundary type: either render the SourceBoundary to get preDef tree or reuse it from existing ContentBoundary (copy!).
     * 2. Collect keys and contentPasses from already appliedDefs for reusing them.
     * 3. Go over the preDef tree and assign appliedDef to each targetDef.
     *    - We update our appliedDef tree (half-separately from old appliedDefs) as we go, and try to reuse as much as we can.
     *    - We also create / reuse treeNodes on the go.
     *    - The finding reusables also includes handling uiDom.Content's.
     *      .. For any (generic or keyed) uiDom.Content found, convert them into a contentPassDef and assign the contentClosure given by our hostBoundary to it (if any).
     *      .. Like with normal defs, try to look for a fitting contentPass (from the earlier applied contentPasses) with keys and order.
     *    - As an output, we collect toApplyPairs for the next step below.
     *
     * PHASE II - apply defs and collect render infos - "GROUNDING LOOP":
     * 4. Start applying defs down the targetDef tree by given toApplyPairs and collect render infos.
     *    - a) For any fragment, we just continue to next (the kids will be there in the loop).
     *    - b) For any domtag def, collect render info (the kids will be in the loop).
     *    - c) For any sub-boundary, apply the def to the sub-boundary (with targetDefs with our appliedDefs attached) collecting its render info.
     *       * .. Note. Kids will not be in the loop - we need not go any further here. (This is pre-handled in toApplyPairs.)
     *       * .. Note that this will prevent from any uiDom.Content within from being detected in our scope - note that they were already converted to contentClosures above.
     *       * .... This is how it should be, because these contentClosures will not be grounded by us - maybe by the nested boundary, maybe not.
     *    - d) For any contentPassDef, ground them - as they are now in direct contact with the dom tag chain.
     *       * .. This means, triggering the contentClosure found in them (originally created by our host boundary, and might go way back).
     *       * .. So we won't go further, but we will trigger the process to go further down from here (by the contentClosure).
     * 5. Clean up old defs and their content: destroy old dom content and unused boundaries with their closures and collect render infos for all the related destruction.
     * 6. Return the render infos.
     *
     */
    runBoundaryUpdate(byBoundary: UISourceBoundary | UIContentBoundary, forceUpdate: boolean = false): UIChangeInfos {


        // - 1. Handle source vs. content boundary. - //

        // If source boundary, render it to get the preDef tree.
        let preDef : UIDefTarget | null = null;
        let appliedDef: UIDefApplied | null = byBoundary._innerDef;
        if (byBoundary.uiId) {
            // Render.
            preDef = _Defs.createDefFromContent(byBoundary.render());
            // Make sure has appliedDef for a preDef.
            if (preDef && !appliedDef)
                appliedDef = _Defs.newAppliedDefBy(preDef, byBoundary.contentClosure);
        }
        // For content boundary, just get the already rendered def tree.
        else
            preDef = (byBoundary as UIContentBoundary).targetDef;


        // - 2. Collect a map of current tags and applied defs - //
        // .. These maps will be used for wide pairing as well as for clean up.
        // .. Note that we should always build the map, even on boundary mount.
        // .... This is because in that case we were given a newly created appliedDef in runBoundaryUpdate, and it needs to be reusable, too.
        // .... Note that it will only be created if there wasn't an appliedDef and there is a preDef - for null -> null, this is not called.

        // const [ defsByTags, unusedDefs ] = !byBoundary.isMounted || !appliedDef ? [ new Map<UIDefKeyTag, UIDefApplied[]>(), new Set<UIDefApplied>() ] : _Apply.buildDefMaps(appliedDef);
        const [ defsByTags, unusedDefs ] = !appliedDef ? [ new Map<UIDefKeyTag, UIDefApplied[]>(), new Set<UIDefApplied>() ] : _Apply.buildDefMaps(appliedDef);

        // Prepare to collect.
        let renderInfos: UIDomRenderInfo[];
        let boundaryChanges: UISourceBoundaryChange[];
        const emptyMovers: UITreeNode[] = [];

        // Normal case.
        if (preDef) {

            // - 3. Go over the preDef tree and assign appliedDef to each targetDef (including smart assigning for multiple uiDom.Contentes). - //
            // .. We collect the new appliedDef tree as we go - as a separate copy from the original.
            // .. We also collect toApplyPairs already for a future phase of the process.

            const toCleanUpDefs: UIDefApplied[] = [];
            const toApplyPairs = _Apply.pairDefs(byBoundary, preDef, appliedDef as UIDefApplied, defsByTags, unusedDefs, toCleanUpDefs, emptyMovers);

            // Update the _innerDef.
            // .. There is always a pair, if there was a preDef.
            // .. Note that we can't rely on that it's still the appliedDef - due to that root might have been swapped.
            byBoundary._innerDef = toApplyPairs[0][1];

            // - 4. Apply the target defs recursively until each boundary starts (automatically limited by our toApplyPairs). - //
            // .. We update each def collecting render infos, and on boundaries create/update content closure and call mount/update.
            const appliedInfos = _Apply.applyDefPairs(byBoundary, toApplyPairs, forceUpdate);
            renderInfos = appliedInfos[0];
            boundaryChanges = appliedInfos[1];


            // - 5a. Extra clean ups - //

            // The toCleanUpDefs are defs that might need clean up.
            // .. Now that all the grounding has been done, we can check if they really should be cleaned up.
            if (toCleanUpDefs[0]) {
                for (const def of toCleanUpDefs) {
                    // Only for the ones that really were not landed after all.
                    const treeNode = def.treeNode;
                    if (!treeNode || (treeNode.sourceBoundary !== null))
                        continue;
                    unusedDefs.add(def);
                }
            }

        }
        // Go to null / stay at null.
        else {
            // Define infos.
            // .. Let's add in an emptyMove. Let's add it in even if was not mounted yet.
            // .. Not sure if is needed, but certainly can't hurt - maybe is even required (if appeared as a first child).
            renderInfos = [ { treeNode: byBoundary.baseTreeNode, emptyMove: true } as UIDomRenderInfo ];
            boundaryChanges = [];
            // Nullify and cut.
            // .. The innerBoundaries are normally reassigned on .applyDefPairs.
            byBoundary.innerBoundaries = [];
            // .. Note. The cutting would normally be done in the processing in .assignTreeNodesForChildren (part of .pairDefs).
            byBoundary.baseTreeNode.children = [];
            // .. Note that the appliedDef will never be null for content boundary. Otherwise it wouldn't have gotten here.
            byBoundary._innerDef = null;
        }


        // - 5b. Main clean up - handle removing unused applied defs. - //
        // .. Note, we put here all the render infos for destruction at the start of the array.

        // Clean up any defs that were unused by the pairing process.
        if (unusedDefs.size) {
            const rInfos = _Apply.cleanUpBoundaryDefs(unusedDefs, byBoundary.uiHost.settings.devLogCleanUp);
            // Add to the beginning.
            renderInfos = rInfos.concat(renderInfos);
        }

        // Prepend empty movers.
        if (emptyMovers[0])
            renderInfos = emptyMovers.map(treeNode => ({ treeNode, emptyMove: true } as UIDomRenderInfo)).concat(renderInfos);

        // Mark as having been activated.
        if (!byBoundary.isMounted)
            byBoundary.isMounted = true;

        // Clear that contexts were updated - because we did update.
        delete byBoundary._outerContextsWere;


        // - 6. Return collected render infos. - //

        return [ renderInfos, boundaryChanges ];

	},



    // - CORE METHOD FOR APPLYING PAIRS - //

    /** This is the core method for actually applying the meaning of defs into reality.
     * - The process includes applying dom tags into dom elements (not rendering yet) and instancing/updating sub boundaries.
     * - The array of toApplyPairs to be fed here should only include the "groundable" ones and in tree order (use .pairDefs method).
     *   .. All the other content (= not included in toApplyPairs) gets passed on as a contentClosure by creating/updating it from .childDefs.
     * - Each item in the toApplyPairs is [toDef, aDef, treeNode, outerContexts ]
     * - Importantly this collects and returns ordered renderInfos and boundaryCalls, which can be later executed.
     */
    applyDefPairs(byBoundary: UISourceBoundary | UIContentBoundary, toApplyPairs: ToApplyPair[], forceUpdate: boolean = false): UIChangeInfos {

        // Main idea:
        // - Start applying defs down the targetDef tree by given toApplyPairs and collect render infos.
        //    a) For any fragment, we just continue to next (the kids will be there in the loop).
        //    b) For any domtag def, collect render info (the kids will be in the loop).
        //    c) For any sub-boundary, apply the def to the sub-boundary (with targetDefs with our appliedDefs attached) collecting its render info.
        //       .. Note. Kids will not be in the loop - we need not go any further here. (This is pre-handled in toApplyPairs.)
        //       .. Note that this will prevent from any uiDom.Content within from being detected in our scope - note that they were already converted to contentClosures above.
        //       .... This is how it should be, because these contentClosures will not be grounded by us - maybe by the nested boundary, maybe not.
        //    d) For any contentPassDef, ground them - as they are now in direct contact with the dom tag chain.
        //       .. This means, triggering the contentClosure found in them (originally created by our host boundary, and might go way back).
        //       .. So we won't go further, but we will trigger the process to go further down from here (by the contentClosure).

        // Apply the target defs recursively until each boundary starts (automatically limited by our toApplyPairs).
        // .. We update each def collecting render infos, and on boundaries create/update content closure and call mount/update.

    	// Prepare.
        const sourceBoundary = (byBoundary.uiId ? byBoundary : byBoundary.sourceBoundary) as UISourceBoundary;
        const movedNodes: UITreeNode[] = [];
        const domPreCheckType = byBoundary.uiHost.settings.preEqualCheckDomProps;

        // Clear innerBoundaries and innerPasses, they will be added again below.
        byBoundary.innerBoundaries = [];

        // Loop all toApplyPairs.
        let renderInfos: UIDomRenderInfo[] = [];
        let boundaryChanges: UISourceBoundaryChange[] = [];
        for (const defPair of toApplyPairs) {

            // Prepare.
            const [ toDef, aDef, treeNode, outerContexts ] = defPair;
            const fullChange = aDef.action === "mounted";

            // Detect move. (For dom tags, boundaries and passes handled separately.)
            if (!fullChange && aDef.action === "moved") {
                switch (aDef._uiDefType) {
                    // For clarity and robustness, boundary's move is not handled here but in updateSourceBoundary.
                    // case "boundary":
                    case "contexts":
                    case "fragment":
                        // Move roots.
                        for (const node of _Apply.getTreeNodesForDomRootsUnder(treeNode, true, true)) {
                            if (movedNodes.indexOf(node) !== -1)
                                continue;
                            movedNodes.push(node);
                            renderInfos.push({ treeNode: node, move: true });
                        }
                        break;
                    case "host":
                        // Verify that the host is dedicated to us (might be stolen).
                        if (aDef.host && aDef.host.groundedTree.parent === treeNode)
                            renderInfos.push({ treeNode, move: true } as UIDomRenderInfo);
                        break;
                }
            }

            // For fragments, there's nothing else.
            if (aDef._uiDefType === "fragment")
                continue;


            // - Special case: content passing - //

            // If the treeNode refers to a pass, let's handle it here and stop.
            if (treeNode.type === "pass") {

                // If it's not an actual pass, but a def related to the same treeNode, we can just skip.
                // .. It's then actually a fragment - either a real one or the one at the root of the content boundary (by design).
                // .. We only want to run the procedures below once for every pass.
                // .. Note. Actually, we don't need this check anymore - fragments have been cut out above - but just in case / for completion.
                if (aDef._uiDefType !== "pass")
                    continue;

                // Ground and collect changes.
                // .. Note that we always have contentPass here, but for typescript put an if clause.
                // .... The reason for this is that targetDef's have .contentPassType and appliedDef's have .contentPass.
                // .... In the typing, it's just defined commonly for both, so both are optional types.
                if (aDef.contentPass) {
                    const [ rInfos, bUpdates ] = aDef.contentPass.contentGrounded(aDef, byBoundary, treeNode, aDef.key !== uiContent.key ? aDef.key : null);
                    renderInfos = renderInfos.concat(rInfos);
                    boundaryChanges = boundaryChanges.concat(bUpdates);
                }

                // Add content boundary to collection.
                if (treeNode.boundary)
                    byBoundary.innerBoundaries.push(treeNode.boundary);

                // Nothing more to do.
                // .. Note that all around below, there's no case for "pass" - it's been completely handled here.
                continue;
            }


            // - Normal case: detect & update changes - //

            // Collect.
            const propsWere = aDef.props;
            let contentChanged = false;

            // Props.
            // .. They are for types: "element", "dom" and "boundary".
            // .. Also for "content" if has .domHtmlMode = true.
            if (toDef.props) {
                if (aDef.props !== toDef.props) {
                    // Add to pre-updates.
                    if (treeNode.boundary)
                        _Apply.preSetUpdates(treeNode.boundary as UISourceBoundary, { props: toDef.props });
                    // Update.
                    aDef.props = toDef.props || {};
                }
            }

            // Apply special properties and detect swaps.
            switch(aDef._uiDefType) {

                // Content.
                case "content":
                    // Detect.
                    const htmlMode = toDef.domHtmlMode;
                    contentChanged = aDef.domContent !== toDef.domContent || htmlMode !== toDef.domHtmlMode;
                    // Update.
                    if (contentChanged) {
                        aDef.domContent = toDef.domContent as UIContentSimple;
                        htmlMode !== undefined ? aDef.domHtmlMode = htmlMode : delete aDef.domHtmlMode;
                    }
                    break;

                // Element: swapping, .element, .cloneMode and .props.
                case "element":
                    if (aDef.domElement !== toDef.domElement) {
                        // Element swap.
                        if (!fullChange)
                            renderInfos.push({ treeNode: treeNode as UITreeNodeDom, swap: true });
                        // Apply.
                        aDef.domElement = toDef.domElement || null;
                    }
                    // Note. There's no real time mode change support - other than this.
                    aDef.domCloneMode = toDef.domCloneMode != null ? toDef.domCloneMode : null;
                    break;

                // // Dom & boundary (& element): just .props.
                // case "dom":
                // case "boundary":
                //     if (aDef.props !== toDef.props) {
                //         // Add to pre-updates.
                //         if (treeNode.boundary)
                //             _Apply.preSetUpdates(treeNode.boundary as UISourceBoundary, { props: toDef.props });
                //         // Update.
                //         aDef.props = toDef.props || {};
                //     }
                //     break;

                // Portal: swapping and .domPortal.
                case "portal":
                    if (aDef.domPortal !== toDef.domPortal) {
                        // Portal swap.
                        if (!fullChange)
                            renderInfos.push({ treeNode: treeNode as UITreeNodePortal, swap: true });
                        // Apply.
                        aDef.domPortal = toDef.domPortal || null;
                    }
                    break;

                // Contexts (insertion, removal, swapping).
                case "contexts": {
                    const aContexts = aDef.contexts;
                    const toContexts = toDef.contexts || null;
                    if (aContexts !== toContexts) {
                        // Remove treeNode from the contexts.
                        if (aContexts) {
                            for (const name in aContexts) {
                                const aCtx = aContexts[name];
                                if (aCtx && aCtx !== (toContexts && toContexts[name] || null)) {
                                    if (aCtx.onRemoveFrom)
                                        aCtx.onRemoveFrom(treeNode as UITreeNodeContexts);
                                    aCtx.roots.delete(treeNode as UITreeNodeContexts);
                                }
                            }
                        }
                        // Add treeNode to the context.
                        for (const name in toContexts) {
                            const toCtx = toContexts[name];
                            if (toCtx && toCtx !== (aContexts && aContexts[name] || null)) {
                                if (toCtx.onInsertInto)
                                    toCtx.onInsertInto(treeNode as UITreeNodeContexts, name);
                                toCtx.roots.set(treeNode as UITreeNodeContexts, name);
                            }
                        }
                        // Apply.
                        aDef.contexts = toContexts;
                    }
                    break;
                }

                // Case: Host.
                // .. It's non-changing, each has its unique key.
            }

            // Handle changes by type.
            switch(toDef._uiDefType) {

                // Case: Dom tags. Collect render info (the kids will be in the loop).
                case "dom":
                case "content":
                case "element":
                    // Create.
                    if (fullChange)
                        renderInfos.push( {
                            treeNode: treeNode as UITreeNodeDom,
                            create: true,
                        } );
                    // Prop updates to existing dom element.
                    else {
                        // Check if should.
                        const move = aDef.action === "moved" && (movedNodes.indexOf(treeNode) === -1);
                        // .. Note that simpleContent never has props, so if aDef.tag === "" we never need to update (nor move, just content).
                        const update = aDef.tag ? !domPreCheckType || ((domPreCheckType === "contextual") && (contentChanged || move)) || !_Lib.equalDomProps(propsWere || {}, toDef.props || {}) : false;
                        // Add to rendering.
                        if (update || contentChanged || move) {
                            const info: UIDomRenderInfo = { treeNode: treeNode as UITreeNodeDom };
                            if (update)
                                info.update = true;
                            if (contentChanged)
                                info.content = true;
                            if (move) {
                                info.move = true;
                                movedNodes.push(treeNode);
                            }
                            renderInfos.push( info );
                        }
                    }
                    break;

                // Case: Sub boundary.
                // .. We only create it here, updating it is handled below.
                case "boundary":
                    if (fullChange) {
                        // Create new boundary.
                        const boundary = new UISourceBoundary(byBoundary.uiHost, aDef, treeNode, sourceBoundary);
                        boundary.parentBoundary = byBoundary;
                        boundary.outerContexts = { ...outerContexts };
                        treeNode.boundary = boundary;
                    }
                    break;

                // Case: Portal.
                case "portal":
                    if (fullChange) {
                        renderInfos.push( {
                            treeNode: aDef.treeNode as UITreeNodePortal,
                            create: true,
                        } );
                    }
                    break;

                // Case: Context - handled above already.

                // Case: Host.
                case "host":
                    if (aDef.host && aDef.host.groundedTree.parent === null) {
                        // Reassign.
                        aDef.host.groundedTree.parent = treeNode;
                        treeNode.children = [ aDef.host.groundedTree ];
                        // Render.
                        renderInfos.push( { treeNode: treeNode as UITreeNodeHost, move: true } );
                        // Outer contexts.
                        if (aDef.host.settings.welcomeContextsUpRoot)
                            aDef.host.services.onContextPass( outerContexts );
                    }
                    break;

                // Case: Fragment - nothing to do.
                // Case: ContentPass - nothing to do. And actually not even in here - cut out above.

            }

            // We do these two specialities after potentially creating a new boundary (but before updating it).
            // 1. Attached ref. When we are landing forwarded refs from host boundaries.
            if (aDef.attachedRefs || toDef.attachedRefs)
                _Apply.handleAttachedRefs(aDef, toDef);
            // 2. Attached contexts by tunneling.
            if (aDef.attachedContexts || toDef.attachedContexts)
                _Apply.handleAttachedContexts(aDef, toDef);


            // - Special case: Updating a source boundary - //

            // Handle source boundary - upon creation or updating.
            // .. For any sub-boundary, apply the def to the sub-boundary (with targetDefs with our appliedDefs attached) collecting its render info.
            // .... Note. Kids will not be in the loop - we need not go any further here. (This is pre-handled in toApplyPairs.)
            // .... Note that this will prevent from any uiDom.Content within from being detected in our scope - note that they were already converted to contentClosures above.
            // ...... This is how it should be, because these contentClosures will not be grounded by us - maybe by the nested boundary, maybe not.
            if (treeNode.boundary) {

                // - Before updating - //

                // Shortcut.
                // .. Note that we already cut the "pass" type above, so this here will always be a source boundary - not content passing boundary.
                const boundary = treeNode.boundary as UISourceBoundary;

                // Add source or content boundary to collection.
                byBoundary.innerBoundaries.push(boundary);

                // Collect a new envelope for the content.
                // .. Note, there will not be a situation that toDef is a boundary and also has simple content - so always has childDefs.
                let newEnvelope: UIContentEnvelope | null = null;
                if (toDef.childDefs[0]) {
                    // Create new fragment to hold the childDefs, and keep the reference for aDef.childDefs (needed for true content pass)..!
                    const oldEnvelope = boundary.contentClosure.envelope;
                    if (!oldEnvelope) {
                        newEnvelope = {
                            appliedDef: { tag: null, _uiDefType: "fragment", childDefs: aDef.childDefs, action: "mounted" },
                            targetDef: { tag: null, _uiDefType: "fragment", childDefs: toDef.childDefs }
                        };
                    }
                    // Just create a new envelope based on existing.
                    else {
                        newEnvelope = {
                            appliedDef: { ...oldEnvelope.appliedDef, childDefs: aDef.childDefs, action: aDef.action },
                            targetDef: { ...oldEnvelope.targetDef, childDefs: toDef.childDefs },
                        };
                    }
                }
                // Do a "pre-refresh" to update the info for the update runs below.
                // .. But we will not yet apply the content to grounded - maybe they will not be there anymore, or maybe there'll be more.
                let bInterested = boundary.contentClosure.preRefresh(newEnvelope);
                const nOrigInterested = bInterested.length;

                // If the context did change, let's mark it here.
                // .. If the boundary will update, it will automatically (by background architecture)
                // .... find that contexts have changed for sub boundaries, and handle it.
                // .. If it will not update, we will collect the interested ones below.
                if (!fullChange) { //  && !_Lib.areEqual(boundary.outerContexts, outerContexts, 1)
                    // Check old.
                    let didChange: UIContextRefresh = 0;
                    const cApi = boundary.contextApi;
                    for (const name in boundary.outerContexts) {
                        // No change, or is overridden at a more important level - no change.
                        const oldCtx = boundary.outerContexts[name];
                        if (outerContexts[name] === oldCtx || cApi && cApi.getContext(name) !== undefined)
                            continue;
                        didChange |= UIContextRefresh.Otherwise;
                        // Update.
                        if (cApi)
                            didChange |= _Apply.helpUpdateContext(boundary as UILiveSource, name, outerContexts[name] || null, oldCtx);
                    }
                    // Check new.
                    for (const name in outerContexts) {
                        // Already handled above.
                        if (boundary.outerContexts[name] !== undefined)
                            continue;
                        // No change, or is overridden at a more important level - no change.
                        const newCtx = outerContexts[name];
                        if (boundary.outerContexts[name] === newCtx || cApi && cApi.getContext(name) !== undefined)
                            continue;
                        // Remove from context.
                        didChange |= UIContextRefresh.Otherwise;
                        if (cApi)
                            didChange |= _Apply.helpUpdateContext(boundary as UILiveSource, name, newCtx, null);
                    }
                    // Changed - mark for contextual updates.
                    if (didChange) {
                        // Collect old and update.
                        // .. By doing this we also mark that it if it didn't update, we will update the contexts (below).
                        boundary._outerContextsWere = boundary.outerContexts;
                        boundary.outerContexts = { ...outerContexts };
                        // Let's mark that it has contextual updates.
                        if (cApi && _Apply.shouldUpdateContextually(didChange)) {
                            if (!boundary._preUpdates)
                                boundary._preUpdates = {};
                            boundary._preUpdates.contextual = true;
                        }
                    }
                }


                // - Run updates - //

                // Run updates. It's done with an if-should check, but in either case it will clear the pending updates.
                const updates = byBoundary.uiHost.services.updateSourceBoundary(boundary, forceUpdate, movedNodes, bInterested);
                if (updates) {
                    renderInfos = renderInfos.concat(updates[0]);
                    boundaryChanges = boundaryChanges.concat(updates[1]);
                }


                // - After updating - //

                // Update contexts down the tree if was not updated and contexts were changed.
                // .. Also add them to / merge them with bInterested, if found any interested.
                if (boundary._outerContextsWere) {
                    // Apply context changes down and collect interested.
                    const collected = _Apply.afterOuterContexts(boundary);
                    // Loop through locally interested.
                    if (collected[0]) {
                        // Merge from both (without duplicates) and sort.
                        if (bInterested[0]) {
                            // Add each.
                            for (const b of collected) {
                                if (bInterested.indexOf(b) === -1)
                                    bInterested.push(b);
                            }
                        }
                        // Replace - the order is clean within our contextual collection.
                        else
                            bInterested = collected;
                    }
                }

                // Mount attached ref.
                if (aDef.attachedRefs) {
                    for (const attachedRef of aDef.attachedRefs)
                        UIRef.didAttachOn(attachedRef, treeNode);
                }

                // Update interested boundaries.
                // .. Each is a child boundary of ours (sometimes nested deep inside).
                // .. We have them from 3 sources: 1. interested in our content, 2. contextual changes cascaded down, 3. wired renderers.
                if (bInterested[0]) {
                    const uInfos = _Apply.updateInterested(bInterested, bInterested[1] && nOrigInterested !== bInterested.length || false);
                    renderInfos = renderInfos.concat(uInfos[0]);
                    boundaryChanges = boundaryChanges.concat(uInfos[1]);
                }

                // Finally, apply the content to the groundable spots inside.
                // .. As can be seen, we will first let their do their updates.
                // .... That is why we pre-refreshed them, so they have fresh info.
                // .... So that if any grounds, they can ground immediately.
                // .. But now is time to apply to any "still existing oldies" (excluding dead and newly grounded).
                const closureInfos = boundary.contentClosure.applyRefresh(forceUpdate);
                renderInfos = renderInfos.concat(closureInfos[0]);
                boundaryChanges = boundaryChanges.concat(closureInfos[1]);

            }
        }

        return [ renderInfos, boundaryChanges ];
    },


    // - Def & treeNode sub routines - //


    /** This does the pairing for the whole render output, and prepares structure for applying defs.
     * - Returns toApplyPairs array for feeding into applyDefPairs.
     *   .. This includes only the ones to be "grounded" - the others will be passed inside a contentClosure.
     * - Reuses, modifies and creates appliedDefs on the go. (Modifies properties: parent, children, treeNode.)
     * - Reuses, modifies and creates treeNodes on the go.
     */
    pairDefs(byBoundary: UISourceBoundary | UIContentBoundary, preDef: UIDefTarget, newAppliedDef: UIDefApplied, defsByTags: Map<UIDefKeyTag, UIDefApplied[]>, unusedDefs: Set<UIDefApplied>, toCleanUpDefs?: UIDefApplied[], emptyMovers?: UITreeNode[] | null): ToApplyPair[] {
        // Typescript.
        type DefLoopPair = [UIDefTargetPseudo | UIDefTarget, UIDefAppliedPseudo | UIDefApplied, UITreeNode, OuterContexts, boolean ];
        // Prepare.
        const settings = byBoundary.uiHost.settings;
        const toApplyPairs: [UIDefTarget, UIDefApplied, UITreeNode, OuterContexts][] = [];
        const sourceBoundary = byBoundary.uiId ? byBoundary as UISourceBoundary : byBoundary.sourceBoundary;
        let defPairs: DefLoopPair[] = [[ { childDefs: [ preDef ] as UIDefTarget[] }, { childDefs: [ newAppliedDef ] as UIDefApplied[] }, byBoundary.baseTreeNode, { ...byBoundary.outerContexts }, false ]];
        let defPair: DefLoopPair | undefined;
        let i = 0;
        // Start looping the target defs.
        while (defPair = defPairs[i]) {
            // Next.
            i++;
            // Parse.
            const [toDef, aDef, pTreeNode, outerContexts, toDefIsFragment ] = defPair;
            // Just clear.
            if (!toDef.childDefs[0])
                aDef.childDefs = [];
            // If has children, explore.
            else {
                // Find correct applied defs - with null for any unfound.
                const appliedChildDefs = _Apply.findAppliedChildDefs(aDef, toDef, defsByTags, unusedDefs, sourceBoundary, settings);
                // Set children.
                aDef.childDefs = appliedChildDefs;
                // Get tree nodes for kids.
                // .. For pseudo elements, we only ground if there's an element defined.
                const treeNodes = pTreeNode && toDef._uiDefType !== "boundary" && (toDef._uiDefType !== "element" || toDef.domElement) ?
                    _Apply.assignTreeNodesForChildren(appliedChildDefs, pTreeNode, toDefIsFragment, sourceBoundary, emptyMovers) : [];
                // Loop each kid.
                const newDefPairs: DefLoopPair[] = [];
                for (let i=0, toChildDef: UIDefTarget; toChildDef=toDef.childDefs[i]; i++) {
                    // Get.
                    const tNode = treeNodes[i];
                    const aChildDef = appliedChildDefs[i];
                    // Check if should be removed.
                    if (!tNode && aChildDef.treeNode) {
                        // Mark as pre-cleaneable, if doesn't get sourceBoundary back, should be cleaned away.
                        aChildDef.treeNode.sourceBoundary = null;
                        if (toCleanUpDefs)
                            toCleanUpDefs.push(aChildDef);
                    }
                    // Contexts.
                    const myOuterContexts = toChildDef.contexts ? _Apply.mergeOuterContexts(outerContexts, toChildDef.contexts) : outerContexts;
                    // Add to loop.
                    newDefPairs.push([toChildDef, aChildDef, treeNodes[i] || null, myOuterContexts, toChildDef._uiDefType === "fragment" ] as DefLoopPair);
                }

                // Add new generation to the start of the loop.
                defPairs = newDefPairs.concat(defPairs.slice(i));
                i = 0;
            }

            // Add for phase II loop - unless was a pseudo-def.
            if (pTreeNode && toDef._uiDefType && aDef._uiDefType)
                toApplyPairs.push([toDef, aDef, pTreeNode, outerContexts]);

        }
        // Return ready to apply pairs.
        return toApplyPairs;
    },

    /** This finds the applied children non-recursively for given appliedParentDef and targetParentDef.
      *
      * 1. The logic is primarily based on matching tags.
      *    - To reuse an applied def, must have `===` same tag.
      *    - Accordingly for scope-wide key reusing, we get a map of `Map<QTag, UIDefApplied[]>`.
      *
      * 2. The process is categorized followingly:
      *    - Arrays (very much like in React).
      *       A) Item with key:
      *          1. Look for matching tag & key from the equivalent array set.
      *             * If not found, look no further: clearly there's no match this time.
      *       B) Item with no key:
      *          1. Look for matching tag from the equivalent array set, but only ones that (likewise) have no key defined.
      *       C) Array with non-array: no matches.
      *    - Non-arrays.
      *       A) Item with key:
      *          1. Look for matching tag & key from siblings.
      *          2. If not found, look for matching tag & key from the whole scope (by the given tag based map).
      *          3. If not found, don't look further.
      *             * We had a key defined, and now there's clearly no match - let's not force one.
      *       B) Item with no key:
      *          1. Look from siblings with same tag based on order, but only the ones that (likewise) have no key defined.
      *             * It makes no sense to match undefined keys with defined keys - clearly they were not meant to refer to the same thing.
      *       C) Non-array with array: no matches.
      *
      * 3. Further notes.
      *    - Note that for render scope wide matching, there's a unusedDefs set given.
      *      * If a def has already been used, it's not found in the set, and we should not allow it - so it's skipped and the process continues.
      *      * However, when we reuse a def, if modifyBookKeeping is true, we remove it from the set and defsByTags.
      *      * This list is further used for knowing what defs were not reused - to remove them.
      *    - However, everytime finds a match (that is not vetoed by not found in unusedDefs), it's just accepted and the process stops.
      *      * So there's no post-processing to find the best of multiple fitting matches - we don't even continue to find more fitting matches.
      *      * In the context of sibling matches, this is actually desired behaviour, because it mixes in a secondary ordered based matching.
      *        .. However, for wide matching the order is non-important, but it's still consistent and reasonable: it's the tree-order for each tag.
      *    - Note. The logical outcome for the function is as described above, but it's instead organized into a more simple format.
      */
    findAppliedChildDefs(parentAppliedDef: UIDefApplied | UIDefAppliedPseudo | null, parentDef: UIDefTarget | UIDefTargetPseudo, defsByTags: Map<UIDefKeyTag, UIDefApplied[]>, unusedDefs: Set<UIDefApplied>, sourceBoundary?: UISourceBoundary | null, settings?: Pick<UIHostSettings, "wideKeysInArrays" | "reuseSiblingTags" | "noRenderValuesMode">): UIDefApplied[] {
        // Handle trivial special case - no children asked for.
        let nChildDefs = parentDef.childDefs.length;
        if (!nChildDefs)
            return [];
        // Not compatible - shouldn't find matches.
        const wideArrKeys: boolean = settings ? settings.wideKeysInArrays : false;
        const allowWide = wideArrKeys || !parentDef.isArray;
        if (!wideArrKeys && (parentDef.isArray != (parentAppliedDef && parentAppliedDef.isArray)))
            return parentDef.childDefs.map(def => _Defs.newAppliedDefBy(def, sourceBoundary && sourceBoundary.contentClosure || null));
        // Get other settings.
        const reuseSiblings: boolean | "dom" | "dom-mini" = settings ? settings.reuseSiblingTags : true;
        const noValuesMode: boolean | any[] = settings ? settings.noRenderValuesMode : false;
        // Loop children and collect defs.
        const siblingDefs = parentAppliedDef && parentAppliedDef.childDefs.slice() || null;
        const childAppliedDefs: UIDefApplied[] = [];
        for (let i=0; i<nChildDefs; i++) {

            // Get childDef.
            const childDef = parentDef.childDefs[i];

            // Extra routine, remove unwanted defs.
            let skipChild = false;
            // If the simple content should be skipped, we actually remove it from the original def, and don't add to new.
            // .. As target defs should never be reused, it's okay - in the case that settings change back and would now allow it.
            if (noValuesMode && childDef._uiDefType === "content")
                skipChild = noValuesMode === true ? !childDef.domContent : noValuesMode.indexOf(childDef.domContent) !== -1;
            // If is a fragment that requires children, skip it if there's no content to be delivered.
            else if (childDef._uiDefType === "fragment" && childDef.withContent)
                skipChild = !sourceBoundary || !sourceBoundary.contentClosure.envelope;
            // Skip.
            if (skipChild) {
                parentDef.childDefs.splice(i, 1);
                nChildDefs--;
                i--;
                continue;
            }

            // Prepare.
            const hasKey = childDef.key != null;
            const sTag = _Apply.SEARCH_TAG_BY_TYPE[childDef._uiDefType] || childDef.tag;
            let aDef: UIDefApplied | null = null;
            // Look for matching tag & key from siblings.
            if (siblingDefs && (hasKey || reuseSiblings)) {
                let ii = -1;
                for (const def of siblingDefs) {
                    // Prepare.
                    ii++;
                    const sThisTag = _Apply.SEARCH_TAG_BY_TYPE[def._uiDefType] || def.tag;
                    // Not matching.
                    if (sThisTag !== sTag || (hasKey ? def.key !== childDef.key : def.key != null) || !unusedDefs.has(def))
                        continue;
                    // Not allowed to reuse a boundary tag.
                    if (!hasKey && reuseSiblings !== true && def.tag && typeof def.tag !== "string") {
                        if (reuseSiblings === "dom" || reuseSiblings === "dom-mini" && (def.tag["UI_DOM_TYPE"] ? def.tag["UI_DOM_TYPE"] !== "Mini" : def.tag.length >= 2))
                            continue;
                    }
                    // Accepted.
                    aDef = def;
                    siblingDefs.splice(ii, 1);
                    unusedDefs.delete(def);
                    break;
                }
            }
            // If not found, look for matching tag & key from the whole scope (by the given tag based map).
            if (!aDef && hasKey && allowWide) {
                const cousinDefs = defsByTags && defsByTags.get(sTag);
                if (cousinDefs) {
                    let ii = -1;
                    for (const def of cousinDefs) {
                        ii++;
                        if (def.key !== childDef.key || def.keyScope !== childDef.keyScope || !unusedDefs.has(def))
                            continue;
                        aDef = def;
                        unusedDefs.delete(def);
                        cousinDefs.splice(ii, 1);
                        break;
                    }
                }
            }
            // Create.
            if (!aDef)
                aDef = _Defs.newAppliedDefBy(childDef, sourceBoundary && sourceBoundary.contentClosure || null);
            // Mark whether was moved or just updated.
            else
                aDef.action = !parentAppliedDef || parentAppliedDef.childDefs[i] !== aDef ? "moved" : "updated";
            //
            // <-- Should we also check for the previous if its next sibling had moved - do we need it logically ?
            // ... Anyway, if needed, could be done right here in the loop by storing prevDef. (But don't think it's needed.)

            // Add to collection in the children order.
            childAppliedDefs.push(aDef);
        }

        return childAppliedDefs;
    },


    /** This assigns treeNodes to an array of applied child defs.
     * Functionality:
     * - It tries to reuse the treeNode from the def if had, otherwise creates a new.
     *   .. In either case assigns the treeNode parent-children relations for the main node.
     * - It modifies the appliedDef.treeNode accordingly and finally returns an array of treeNodes matching the given aChilds.
     * - It also knows how to handle fragments, so if the nodeIsFragment is true, it will treat the given workingTreeNode as a placeholder.
     * Note that this procedure assumes that there are no (nestedly) empty fragments in the flow. (This is already handled in the defs creation flow.)
     *   .. This makes it easy for us to know that whenever there's a child, it should have a node. So we can safely create new ones for all in the list (if cannot reuse).
     *   .. Of course, fragments are not actually worth tree nodes, but we use them as placeholders in the flow. (But because of above, we know there will be something to replace them.)
     */
    assignTreeNodesForChildren(aChilds: UIDefApplied[], workingTreeNode: UITreeNode, nodeIsFragment?: boolean, sourceBoundary?: UISourceBoundary | null, emptyMovers?: UITreeNode[] | null): UITreeNode[] {

        // A preassumption of using this function is that it's called flowing down the tree structure.
        // .. Due to this, we will always clear the kids of the workingTreeNode, and reassign them afresh below.
        if (workingTreeNode.children[0])
            workingTreeNode.children = [];

        // Quick exit.
        const count = aChilds.length;
        if (!count)
            return [];

        // Prepare.
        const treeNodes: UITreeNode[] = [];
        let iAddPoint = 0;
        let firstAvailable: UITreeNode | null = null;
        let pTreeNode: UITreeNode = workingTreeNode;

        // Prepare functionality for when is inside a fragment.
        // .. We need to get the parentTreeNode's child position for adding siblings next to it.
        if (nodeIsFragment) {
            // No parent node.
            // .. Just return an empty array - things would be messed up anyway.
            if (!workingTreeNode.parent)
                return [];
            // Reassign.
            pTreeNode = workingTreeNode.parent;
            firstAvailable = workingTreeNode;
            iAddPoint = pTreeNode.children.indexOf(workingTreeNode);
            // The child node is not a child of the parent.
            // .. Just return an empty array - things would be messed up anyway.
            if (iAddPoint === -1)
                return [];
        }

        // Loop target defs.
        for (let i=0; i<count; i++) {
            // Prepare.
            const aChild = aChilds[i];
            let myTreeNode: UITreeNode | null = null;
            // Had an existing treeNode, reuse it.
            if (aChild.treeNode)
                myTreeNode = aChild.treeNode;
            // Otherwise mark as mounted.
            // .. Unless is a fragment: we don't know it by checking .treeNode, as they never have treeNodes.
            else if (aChild._uiDefType !== "fragment")
                aChild.action = "mounted";
            // If has firstAvailable, handle it now.
            if (firstAvailable) {
                // If has myTreeNode, always reuse it.
                // .. In that remove firstAvailable, it will be forgotten. (We don't need to correct its parent.)
                if (myTreeNode)
                    pTreeNode.children.splice(iAddPoint, 1);
                else
                    myTreeNode = firstAvailable;
                // Clear, it's only for the first time.
                firstAvailable = null;
            }
            // Correct type.
            const aType = aChild._uiDefType;
            const type = aType === "content" || aType === "element" ? "dom" : (aType === "fragment" ? "" : aType as UITreeNode["type"]);
            // No tree node.
            if (!myTreeNode) {
                // Create.
                myTreeNode = {
                    type,
                    parent: pTreeNode,
                    children: [],
                    sourceBoundary: sourceBoundary || null,
                    domNode: null,
                } as UITreeNode;
                // Add domProps.
                if (myTreeNode.type === "dom")
                    myTreeNode.domProps = {};
            }
            // Update changes to existing.
            else {

                // Note that we must never clear away children from the child treeNodes here (unlike we do for the parent above).
                // .. This is because we don't know where they were from originally.
                // .... Specifically when they were previously nested inside a boundary within us (the source boundary),
                // .... and that sub boundary does not get updated due to "should"-smartness,
                // .... then we would end up messing the unupdated tree structure by clearing children away from here n there..!
                // .. For the same reason, it's actually okay to clear them for the parent (and should do so): as it's currently being processed (= updated).
                // .... Note also that it's impossible that the treeNode we reuse would have already been processed earlier in the flow.
                // .... This is because 1. we only reuse from aChild.treeNode, 2. each def has its unique treeNode (if any), 3. and def pairing process never double-uses defs.

                // Dislogde from parent in any case - the child will be (re-) added below.
                if (myTreeNode.parent) {
                    // Get index.
                    const iMe = myTreeNode.parent.children.indexOf(myTreeNode);
                    // Detect empty movers.
                    // .. We need this to update bookkeeping when something moves away from being a first child.
                    if (iMe === 0 && myTreeNode.parent !== pTreeNode && UIRender.PASSING_TYPES[myTreeNode.parent.type] === true && emptyMovers) {
                        if (emptyMovers.indexOf(myTreeNode.parent) === -1)
                            emptyMovers.push(myTreeNode.parent);
                    }
                    // Remove.
                    if (iMe !== -1)
                        myTreeNode.parent.children.splice(iMe, 1);
                }
                // Set parent and source.
                myTreeNode.parent = pTreeNode;
                myTreeNode.sourceBoundary = sourceBoundary || null;

                // We set the type in case was just created before fed to us.
                // .. The type should in practice stay the same - because treeNodes are tied to def's, execpt when doing swapping.
                myTreeNode.type = type;

            }

            // Pair with the def.
            if (aChild._uiDefType !== "fragment") {
                myTreeNode.def = aChild;
                aChild.treeNode = myTreeNode;
            }

            // Add to tree node's children at the right spot, and to our return collection.
            pTreeNode.children.splice(iAddPoint + i, 0, myTreeNode);
            treeNodes.push(myTreeNode);
        }
        // Return the treeNodes matching the given aChilds.
        return treeNodes;
    },

    // We assign treeNodes and their def relations here.
    assignTreeNodesForPass(contentBoundary: UIContentBoundary): [ToApplyPair[], UITreeNode[], UITreeNode[]] {
        // Prepare.
        const appliedDef = contentBoundary._innerDef;
        const sourceBoundary = contentBoundary.sourceBoundary;
        const targetDef = contentBoundary.targetDef;
        const toCleanUp: UITreeNode[] = [];
        const emptyMovers: UITreeNode[] = [];
        // Prepare loop.
        type DefLoopPair = [UIDefTarget, UIDefApplied, UITreeNode | null, OuterContexts, boolean ];
        const toApplyPairs: ToApplyPair[] = [];
        let defPairs: DefLoopPair[] = [[ targetDef, appliedDef, contentBoundary.baseTreeNode, { ...contentBoundary.outerContexts }, false ]];
        let defPair: DefLoopPair | undefined;
        let i = 0;
        // Start looping the target defs.
        while (defPair = defPairs[i]) {
            // Next.
            i++;
            // Parse.
            const [toDef, aDefNew, pTreeNode, outerContexts, toDefIsFragment ] = defPair;
            // Explore, if has children and is not a boundary def (in that case, our grounding branch ends to it).
            if (toDef.childDefs[0]) {
                // Get tree nodes for kids.
                // .. For <uiDom.Element>'s, we only ground if there's an element defined.
                const treeNodes = pTreeNode && toDef._uiDefType !== "boundary" && (toDef._uiDefType !== "element" || toDef.domElement) ?
                    _Apply.assignTreeNodesForChildren(aDefNew.childDefs, pTreeNode, toDefIsFragment, sourceBoundary, emptyMovers) : [];
                // After clean up.
                let iKid = 0;
                const newDefPairs: DefLoopPair[] = [];
                for (const aChildDef of aDefNew.childDefs) {
                    // Add to pre-clean up - they might get reused later, so we just mark sourceBoundary null and collect.
                    // .. If upon final clean up they still have sourceBoundary null, it means they were not used.
                    // .. Note that we must not here do an actual clean up yet - this is because there might be nested true pass content boundaries within us.
                    const tNode: UITreeNode | undefined = treeNodes[iKid];
                    if (!tNode && aChildDef.treeNode) {
                        toCleanUp.push(aChildDef.treeNode);
                        aChildDef.treeNode.sourceBoundary = null;
                    }
                    // Contexts.
                    const toChildDef = toDef.childDefs[iKid];
                    const myOuterContexts = toChildDef.contexts ? _Apply.mergeOuterContexts(outerContexts, toChildDef.contexts) : outerContexts;
                    // Add to loop.
                    newDefPairs.push([toChildDef, aChildDef as UIDefApplied, tNode, myOuterContexts, aChildDef._uiDefType === "fragment" ]);
                    // Next.
                    iKid++;
                }
                // Add new generation to the start of the loop.
                defPairs = newDefPairs.concat(defPairs.slice(i));
                i = 0;
            }
            // Add for phase II loop.
            if (pTreeNode)
                toApplyPairs.push([toDef, aDefNew, pTreeNode, outerContexts]);
        }
        // Return pairs.
        return [ toApplyPairs, toCleanUp, emptyMovers ];
    },


    // - Build up helper - //

    buildDefMaps(appliedDef: UIDefApplied): [Map<UIDefKeyTag, UIDefApplied[]>, Set<UIDefApplied> ] {
        // Prepare.
        const unusedDefs: Set<UIDefApplied> = new Set();
        const defsByTags = new Map<UIDefKeyTag, UIDefApplied[]>();
        let defsToSearch: UIDefApplied[] = [appliedDef];
        let searchDef: UIDefApplied | undefined;
        let i = 0;
        // Loop the appliedDef and its childDefs recursively (in tree order).
        while (searchDef = defsToSearch[i]) {
            // Next.
            i++;
            // Add to the base collection.
            unusedDefs.add(searchDef);
            // Add to defsByTags.
            const sTag = _Apply.SEARCH_TAG_BY_TYPE[searchDef._uiDefType] || searchDef.tag;
            const byTags = defsByTags.get(sTag);
            byTags ? byTags.push(searchDef) : defsByTags.set(sTag, [ searchDef ]);
            // Add child defs to top of queue.
            if (searchDef.childDefs[0]) {
                defsToSearch = searchDef.childDefs.concat(defsToSearch.slice(i));
                i = 0;
            }
            // Note. We don't search within nested boundaries, they have their own key scope.
        }
        return [ defsByTags, unusedDefs ];
    },


    // - Clean up routines - //

    cleanUpBoundaryDefs(unusedDefs: Iterable<UIDefApplied>, devLog: boolean = false): UIDomRenderInfo[] {
        // - DEVLOG - //
        // Log.
        if (devLog)
            console.log("___Apply.cleanUpBoundaryDefs: Dev-log: Clean up unused defs: ", [...unusedDefs]);
        // Loop each and destroy accordingly.
        let rInfos: UIDomRenderInfo[] = [];
        for (const aDef of unusedDefs) {
            // Nothing to do.
            const treeNode = aDef.treeNode;
            if (!treeNode)
                continue;

            // // Detach tunnels - except for boundaries it's done in destroyBoundary.
            // // .. No need to do this. Tunnels are only meaningful for live boundaries.
            // if (aDef._uiDefType !== "boundary" && aDef.attachedContexts) {
            //     const tunnels = aDef.attachedContexts;
            //     for (const name in tunnels) {
            //         const tunnel = tunnels[name];
            //         if (tunnel)
            //             tunnel.onRemoveFrom(treeNode);
            //     }
            // }

            // Remove.
            switch(aDef._uiDefType) {

                // The ones that will handle refs by themselves - use break.
                case "dom":
                case "element":
                case "content":
                    rInfos.push( { treeNode: treeNode as UITreeNodeDom, remove: true });
                    break;
                case "boundary":
                    // Note that we must not nullifyDefs.
                    // .. Otherwise, we cannot swap away stuff from the to-be-destroyed boundary's content pass (defined by us).
                    if (treeNode.boundary)
                        rInfos = rInfos.concat(_Apply.destroyBoundary(treeNode.boundary, false)[0]);
                    break;

                // Don't break for the below one - we want to generally detach attachedRefs from all of them.
                case "pass":
                    if (aDef.contentPass)
                        rInfos = rInfos.concat(aDef.contentPass.contentUngrounded(aDef)[0]);
                case "host":
                    if (aDef.host && aDef.host.groundedTree.parent === treeNode) {
                        // Reassign.
                        aDef.host.groundedTree.parent = null;
                        treeNode.children = [];
                        // Render.
                        rInfos.push( { treeNode: treeNode as UITreeNodeHost, move: true });
                    }
                case "contexts":
                    if (aDef.contexts) {
                        for (const name in aDef.contexts) {
                            const aCtx = aDef.contexts[name];
                            if (aCtx.onRemoveFrom)
                                aCtx.onRemoveFrom(treeNode as UITreeNodeContexts);
                            aCtx.roots.delete(treeNode as UITreeNodeContexts);
                        }
                    }
                default:
                    if (aDef.attachedRefs && aDef._uiDefType)
                        for (const attachedRef of aDef.attachedRefs)
                            UIRef.willDetachFrom(attachedRef, treeNode);

            }
            // Nullify.
            treeNode.parent = null;
            treeNode.sourceBoundary = null;
            delete aDef.treeNode;
        }
        return rInfos;
    },

    /** This destroys a given boundary and all the stuff in it. */
    destroyBoundary(boundary: UISourceBoundary | UIContentBoundary, nullifyDefs : boolean = true, destroyDom : boolean = true): UIChangeInfos {
        // Prepare.
        let renderInfos: UIDomRenderInfo[] = [];
        const boundaries = _Apply.findBoundariesWithin(boundary, true);
        // Destroy each in tree order.
        // .. Note. In a way, it'd be more natural to do it in reverse tree order.
        // .. However, we want to do the ref unmounting in tree order, in order to allow "salvaging" to work more effectively.
        // .... And we don't want live.uiWillUnmount to run in reverse tree order while ref.domWillUnmount runs in tree order.
        // .. So as a result, we do the unmounting process in tree order.
        // .... If needed later, can be changed - just should handle salvaging in coherence with this.
        for (const boundary of boundaries) {
            // Already destroyed.
            if (boundary.isMounted === null)
                continue;
            // Source boundary.
            const sBoundary = boundary.uiId ? boundary : null;
            if (sBoundary) {
                // If has live component.
                const live = sBoundary.live;
                if (live) {
                    // Call.
                    if (live.uiWillUnmount)
                        live.uiWillUnmount();
                    // Clear timers.
                    live.clearTimers();
                    // Detach tunnels - other than cascading.
                    const cBoundary = sBoundary as UILiveSource;
                    const namedCtxs = cBoundary.contextApi.getContexts();
                    for (const name in namedCtxs) {
                        const ctx = namedCtxs[name];
                        // We don't care for didChange flags, but just want to disentagle from contexts and call the onContextsChange callback.
                        if (ctx)
                            _Apply.helpUpdateContext(cBoundary, name, null, ctx);
                    }
                }
            }
            // Remove from wired bookkeeping.
            if (boundary.mini && boundary.mini instanceof UIWired) {
                const Wired = boundary.mini.constructor as UIWiredType;
                if (Wired.wiredWillUnmount)
                    Wired.wiredWillUnmount(boundary.mini, boundary);
                Wired.instanced.delete(boundary);
            }
            // Add root removals for rendering info.
            const domUnmounts: UITreeNode[] = destroyDom ? boundary.getTreeNodesForDomRoots(false) : []; // <-- shouldn't we get nested..? No but we are in a loop.. okay..
            // Search for special defs inside.
            // .. The nullifyDefs process is only needed if has kids.
            if (boundary._innerDef && boundary._innerDef.childDefs[0]) {
                // Loop each.
                let defs: UIDefApplied[] = [ boundary._innerDef ];
                let def: UIDefApplied | undefined;
                let i = 0;
                while (def = defs[i]) {
                    // Next.
                    i++;
                    // Add kids to the front of the queue.
                    if (def.childDefs[0]) {
                        defs = def.childDefs.concat(defs.slice(i));
                        i = 0;
                    }
                    // Handle.
                    const tNode = def.treeNode;
                    if (tNode) {
                        // Ref.
                        const isDomNode = tNode.type === "dom";
                        if (def.attachedRefs) {
                            for (const attachedRef of def.attachedRefs) {
                                // Dom - handle it by renderInfos.
                                if (isDomNode) {
                                    if (destroyDom && domUnmounts.indexOf(tNode) === -1)
                                        domUnmounts.push(tNode)
                                }
                                // Boundary.
                                else if (attachedRef.uiWillUnmount && tNode.boundary && tNode.type === "boundary")
                                    attachedRef.uiWillUnmount(tNode.boundary);
                                // Technical.
                                UIRef.willDetachFrom(attachedRef, tNode);
                            }
                        }
                        // For content boundaries.
                        // .. We must go and clear the treeNode from any def that has it.
                        // .. Otherwise causes an issue when a source boundary switches to not displaying content and tries to reuse an element by swapping it away.
                        if (isDomNode && !sBoundary && nullifyDefs) {
                            tNode.sourceBoundary = null;
                            tNode.parent = null;
                            delete def.treeNode;
                            //
                            // Note that we don't need rendering info for these - this is because our roots are already collected.
                            // .. And because we don't have refs - but they would be handled separately anyhow.
                            //
                            // Note also that we don't include a clean up dev log here - even though we are clearing defs & treeNodes.
                        }
                    }
                }
            }
            // Remove attached.
            if (boundary._outerDef.attachedRefs) {
                for (const attachedRef of boundary._outerDef.attachedRefs) {
                    if (sBoundary && attachedRef.uiWillUnmount)
                        attachedRef.uiWillUnmount(sBoundary);
                    UIRef.willDetachFrom(attachedRef, boundary.baseTreeNode);
                }
            }
            // Remove from updates, if was there.
            if (sBoundary)
                sBoundary.uiHost.services.removeFromUpdates(sBoundary);
            // Collect render infos - we collect them in tree order for correct salvaging behaviour.
            // .. Note that if reverse the order above, should change this to newOnes.concat(renderInfos).
            // .. But while running both in tree order, we do renderInfos.concat(newOnes).
            if (destroyDom)
                renderInfos = renderInfos.concat(domUnmounts.map(treeNode => ({ treeNode: treeNode as (UITreeNodeDom | UITreeNodeBoundary), remove: true }) as UIDomRenderInfo ));
            // Mark as destroyed.
            boundary.isMounted = null;
        }
        return [ renderInfos, [] ];
    },


    // - Handle attached helpers - //

    handleAttachedRefs(aDef: UIDefApplied, toDef: UIDefTarget) {
        // Prepare.
        const treeNode = aDef.treeNode;
        // Remove.
        if (aDef.attachedRefs && treeNode) {
            for (const fRef of aDef.attachedRefs) {
                if (!toDef.attachedRefs || toDef.attachedRefs.indexOf(fRef) === -1)
                    UIRef.willDetachFrom(fRef, treeNode);
            }
        }
        // // Add.
        // if (toDef.attachedRefs && treeNode) {
        //     for (const fRef of toDef.attachedRefs) {
        //         if (!aDef.attachedRefs || aDef.attachedRefs.indexOf(fRef) === -1)
        //             UIRef.willAttachOn(fRef, treeNode);
        //     }
        // }
        //
        // <-- The will call didAttachOn when they do mount: for boundaries below, and for dom in UIRender.
        //
        // Set.
        aDef.attachedRefs = toDef.attachedRefs;

    },

    handleAttachedContexts(aDef: UIDefApplied, toDef: UIDefTarget) {
        // Nothing to do.
        if (!aDef.treeNode || !aDef.attachedContexts && !toDef.attachedContexts)
            return;
        // Prepare.
        const treeNode: UITreeNode = aDef.treeNode;
        const cBoundary = treeNode.type === "boundary" && treeNode.boundary as UILiveSource || null;
        const fromTunnels = aDef.attachedContexts || {};
        // Update.
        aDef.attachedContexts = toDef.attachedContexts;
        // Bookkeeping and calling.
        // .. This feature is only for boundaries with a live component.
        // .. If has no action needs nor context needs, nothing to do.
        const cApi = cBoundary && cBoundary.contextApi;
        if (cApi && (cApi.actionNeeds || cApi.contextNeeds.size)) {
            // Prepare.
            const overridden = cApi.overriddenContexts || {};
            const toTunnels = toDef.attachedContexts || {};
            const changed = new Set( [ ...Object.keys(fromTunnels), ...Object.keys(toTunnels) ])
            let didChange: UIContextRefresh = 0;
            // Loop.
            for (const name of changed) {
                // If overridden, no change - we are at a less important level.
                if (overridden[name] !== undefined)
                    continue;
                // Not changed.
                const oldTunnel = fromTunnels[name] === undefined ? cBoundary.outerContexts[name] : fromTunnels[name];
                const newTunnel = toTunnels[name];
                if (newTunnel === oldTunnel)
                    continue;
                // Did change.
                didChange |= UIContextRefresh.Otherwise;
                didChange |= _Apply.helpUpdateContext(cBoundary, name, newTunnel, oldTunnel);
            }
            // Mark for contextual changes.
            if (_Apply.shouldUpdateContextually(didChange)) {
                if (!cBoundary._preUpdates)
                    cBoundary._preUpdates = {};
                cBoundary._preUpdates.contextual = true;
            }
        }
    },


    // - Context helpers - //

    helpUpdateContext(boundary: UILiveSource, name: string, newContext: UIContext | null, oldContext: UIContext | null): UIContextRefresh {
        // Data interests.
        let changed: UIContextRefresh = 0;
        if (boundary.contextApi.contextNeeds.has(name)) {
            if (oldContext)
                oldContext.services.onDisInterest("data", boundary, name);
            if (newContext)
                newContext.services.onInterest("data", boundary, name)
            changed |= UIContextRefresh.Data;
        }
        // Action interests.
        if (boundary.contextApi.actionNeeds.has(name)) {
            if (oldContext)
                oldContext.services.onDisInterest("actions", boundary, name);
            if (newContext)
                newContext.services.onInterest("actions", boundary, name);
            changed |= UIContextRefresh.Actions;
        }
        // On context change.
        if (boundary.live.onContextChange) {
            const should = boundary.live.onContextChange(name as never, newContext as never, oldContext as never);
            if (should !== null)
                changed |= should ? UIContextRefresh.DoRefresh : UIContextRefresh.NoRefresh;
        }
        // Return changed.
        return changed;
    },

    mergeOuterContexts(outerContexts: OuterContexts, modContexts: OuterContexts): OuterContexts {
        // Take copy and add / remove each.
        const newContexts = { ...outerContexts };
        for (const name in modContexts) {
            const ctx = modContexts[name];
            ctx ? newContexts[name] = ctx : delete newContexts[name];
        }
        // Return pruned.
        return newContexts;
    },

    /** This only runs (and should only be called) if the boundary didn't update, but it contexts were changed.
     * - In that case, it will go down the tree and update the contexts as well as collect interested ones until no need to go further.
     * - Note that this will not collect interested boundaries within nested hosts, but instead collects the hosts if settings allow. */
    afterOuterContexts(sourceBoundary: UISourceBoundary): UISourceBoundary[] {

        // Prepare.
        const collected: UISourceBoundary[] = [];
        if (!sourceBoundary._outerContextsWere)
            return collected;

        // Collect all changed names.
        const origOldContexts: Record<string, UIContext | null> = {};
        const newContexts = sourceBoundary.outerContexts;
        for (const name in sourceBoundary.outerContexts) {
            const oldContext = sourceBoundary._outerContextsWere[name];
            if (sourceBoundary.outerContexts[name] !== oldContext)
                origOldContexts[name] = oldContext; // Might be undefined, but it's just what we want.
        }
        for (const name in sourceBoundary._outerContextsWere) {
            if (sourceBoundary.outerContexts[name] === undefined)
                origOldContexts[name] = sourceBoundary._outerContextsWere[name];
        }
        // Set the outerContexts back temporarily, so won't stop the flow before it starts.
        sourceBoundary.outerContexts = sourceBoundary._outerContextsWere;
        delete sourceBoundary._outerContextsWere;

        // Loop down the tree until the branches die (out of nothing to update).
        // .. We will go down with oldContexts that gradually narrows down if a sub context replaces it.
        type LoopPair = [UITreeNode, typeof origOldContexts];
        let infos: LoopPair[] = [ [ sourceBoundary.baseTreeNode, origOldContexts ] ];
        let info: LoopPair | undefined;
        let i = 0;
        while (info = infos[i]) {
            // Next.
            i++;
            // Parse.
            const treeNode = info[0];
            const oldContexts = info[1];
            // Host.
            // .. If allowed to pass contexts from host to host,
            // .. Set the boundary to the host's root boundary, so we can do the update routine.
            // .. Instead of checking interests, will collect to hosts instead.
            if (treeNode.type === "host") {
                // Collect new outer contexts, while checking if there's any diffs.
                const host = treeNode.def.host;
                if (host && host.settings.welcomeContextsUpRoot) {
                    const boundary = host.rootBoundary;
                    const hostContext = { ...boundary.outerContexts };
                    let hadDiffs = false;
                    for (const name in oldContexts) {
                        if (boundary.outerContexts[name] === oldContexts[name]) {
                            hadDiffs = true;
                            const newCtx = newContexts[name];
                            newCtx ? hostContext[name] = newCtx : delete hostContext[name];
                        }
                    }
                    if (hadDiffs)
                        host.services.onContextPass(hostContext);
                }
            }
            // Has a boundary.
            else if (treeNode.boundary) {
                // Check if finds a match to the old that needs to be updated.
                const boundary = treeNode.boundary;
                const myOldContexts: typeof oldContexts = {};
                let didChange: UIContextRefresh = 0;
                for (const name in oldContexts) {
                    // Refers to the old - so, needs a refresh.
                    // .. Note that in the case was added (= oldContexts[name] === undefined),
                    // .. Then the check still works: will only work on it, if it was removed before.
                    if (boundary.outerContexts[name] === oldContexts[name]) {
                        // Update.
                        const newCtx = newContexts[name];
                        const oldCtx = myOldContexts[name];
                        newCtx ? boundary.outerContexts[name] = newCtx : delete boundary.outerContexts[name];
                        myOldContexts[name] = oldCtx;
                        didChange |= UIContextRefresh.Otherwise;
                        // Add to interests boundaries, if was interested.
                        if (boundary.contextApi) {
                            // Check if is overriden on a more important level - if so, nothing to do.
                            if (newCtx !== boundary.contextApi.getContext(name))
                                continue;
                            // Remove / Add.
                            didChange |= _Apply.helpUpdateContext(boundary as UILiveSource, name, newCtx, oldCtx);
                            // Is interested.
                            if (boundary.contextApi.contextNeeds.get(name) !== undefined && collected.indexOf(boundary) === -1)
                                collected.push(boundary as UISourceBoundary);
                        }
                    }
                    // Otherwise drop out by not including into myOldContexts.
                }
                // Remove pending flag, if had.
                delete boundary._outerContextsWere;
                // No diffs, can stop on this branch.
                if (!didChange)
                    continue;
                // Add contextual changes.
                if (boundary.uiId && _Apply.shouldUpdateContextually(didChange)) {
                    if (!boundary._preUpdates)
                        boundary._preUpdates = {};
                    boundary._preUpdates.contextual = true;
                }
                // Add kids.
                if (treeNode.children[0]) {
                    infos = treeNode.children.map(t => [ t, myOldContexts ] as LoopPair).concat(infos.slice(i));
                    i = 0;
                }
            }
            // Otherwise, just add kids.
            else if (treeNode.children[0]) {
                // Found contexts: remove from the flow, if matches our oldContext name, as it then replaces us down the flow.
                const ctxs = treeNode.type === "contexts" ? treeNode.def.contexts : null;
                let addKidsContexts: typeof oldContexts | null = oldContexts;
                if (ctxs) {
                    // Collect matches.
                    const found: string[] = [];
                    for (const name in oldContexts) {
                        // Found - remove the name from going further as it has been replaced.
                        if (ctxs[name] !== undefined)
                            found.push(name);
                    }
                    // Did find.
                    if (found[0]) {
                        // Copy oldContexts and set it to be set for kids.
                        addKidsContexts = { ...oldContexts };
                        // Remove found names from it.
                        for (const name of found)
                            delete addKidsContexts[name];
                        // Has no more names to go on with.
                        if (Object.keys(addKidsContexts)[0] === undefined)
                            addKidsContexts = null;
                    }
                }
                // Add kids.
                if (addKidsContexts) {
                    infos = treeNode.children.map(t => [ t, addKidsContexts ] as LoopPair).concat(infos.slice(i));
                    i = 0;
                }
            }
        }

        // Return the interested in tree order.
        return collected;
    },


    // - Update contextually - //

    shouldUpdateContextually(didChange: UIContextRefresh): boolean {
        return (didChange & UIContextRefresh.NoRefresh) === 0 && (didChange & (UIContextRefresh.DoRefresh | UIContextRefresh.Data)) !== 0;
    },

    shouldUpdateBy(boundary: UISourceBoundary, preUpdates: UILiveUpdates | null, updates: UILiveUpdates): boolean {
        // Prepare.
        const settings = boundary.uiHost.settings;
        const modes = boundary.live ? boundary.live.updateModes : { props: boundary.mini && (boundary.mini.updateMode || (boundary.mini.constructor as UIWiredType).updateMode) || settings.updateMiniMode };
        // If anything tells us to update, we do the update: so can return true from within, but not false.
        let didCheck = false;
        if (preUpdates) {
            for (const type in preUpdates) {
                // Prepare.
                didCheck = true;
                const mode: UIUpdateCompareMode = modes[type] || settings.updateLiveModes[type];
                // Do the check.
                switch(mode) {
                    case "always":
                        return true;
                    case "changed":
                        if (preUpdates[type] !== updates[type])
                            return true;
                        break;
                    case "shallow":
                        if (!_Lib.areEqual(preUpdates[type] || {}, updates[type], 1))
                            return true;
                        break;
                    case "double":
                        if (!_Lib.areEqual(preUpdates[type] || {}, updates[type], 2))
                            return true;
                        break;
                    case "deep":
                        if (!_Lib.areEqual(preUpdates[type] || {}, updates[type], -1))
                            return true;
                        break;
                }
            }
        }
        // If didn't even check.
        if (!didCheck) {
            // With functional, we can use its general behaviour.
            if (boundary.mini)
                return settings.updateMiniMode === "always";
            // Otherwise do the default.
            return settings.shouldUpdateWithNothing;
        }
        // No reason to update.
        return false;
    },

    callBoundaryChanges(boundaryChanges: UISourceBoundaryChange[]) {
        // Loop each.
        for (const info of boundaryChanges) {
            // Parse.
            const [ boundary, change, myPreUpdates, myUpdates ] = info;
            // Call the component about updates - for mount/unmount also handle a bit more.
            switch(change) {
                case "updated":
                    if (boundary.live && boundary.live.uiDidUpdate)
                        boundary.live.uiDidUpdate(myPreUpdates || {}, myUpdates || {});
                    break;
                case "mounted": {
                    // Component calls.
                    const live = boundary.live;
                    if (live) {
                        // Call uiDidMount.
                        if (live.uiDidMount)
                            live.uiDidMount();
                    }
                    // Call on all that reffed us.
                    if (boundary._outerDef.attachedRefs) {
                        for (const ref of boundary._outerDef.attachedRefs)
                            if (ref.uiDidMount)
                                ref.uiDidMount(boundary);
                    }
                    break;
                }
                case "moved":
                    if (boundary.live && boundary.live.uiDidMove)
                        boundary.live.uiDidMove();
                    break;
                case "updated-n-moved":
                    if (boundary.live && boundary.live.uiDidMove)
                        boundary.live.uiDidMove();
                    if (boundary.live && boundary.live.uiDidUpdate)
                        boundary.live.uiDidUpdate(myPreUpdates || {}, myUpdates || {});
                    break;
            }
        }
    },


    // - Update boundaries helpers - //

    preSetUpdates(boundary: UISourceBoundary, updates: UILiveNewUpdates): void {

        // Prepare.
        // We set a readonly value here - it's on purpose: we want it to be readonly for all others except in this method.
        // const live = boundary.live as UILive & { props: Dictionary; state: Dictionary; } | undefined;
        const live = boundary.live as UILive & { props: Dictionary; } | undefined;
        let preUpdates = boundary._preUpdates;
        if (!preUpdates)
            boundary._preUpdates = (preUpdates = {});

        // Update new values and preUpdates.
        // .. Props.
        if (updates.props) {
            if (!preUpdates.props)
                preUpdates.props = boundary._outerDef.props || {};
            boundary._outerDef.props = updates.props;
            if (live)
                live.props = updates.props;
            else if (boundary.mini)
                // We set a readonly value here - it's on purpose: we want it to be readonly for all others except in this method.
                (boundary.mini as { props: UILiveNewUpdates["props"]; }).props = updates.props;
        }
        // .. State.
        if (updates.state && live) {
            if (!preUpdates.state)
                preUpdates.state = live.state;
            live.state = updates.state;
        }
        // .. Children. This is actually set externally due to timing, but we provide it here anyway.
        if (updates.children && boundary.contentClosure) {
            if (!preUpdates.children)
                preUpdates.children = boundary.contentClosure.envelope ? boundary.contentClosure.envelope.targetDef.childDefs.slice() : [];
        }
        // .. Context.
        if (updates.contextual && live) {
            if (!preUpdates.contextual)
                preUpdates.contextual = true;
        }
        // .. Force update mode.
        if (updates.force)
            preUpdates.force = ((updates.force === "all") || (preUpdates.force === "all")) ? "all" : true;

    },


    /** Sorting principles:
     * 1. We do it by collecting a uiId parent chain (with ">" splitter, and parent first).
     *    .. Note that any inner siblings will have the same key chain - we inner sort them by index.
     * 2. And then sort the uiId chains according to .startsWith() logic.
     * 3. Finally we reassign the updates - unraveling the nested order of same keys. */
    sortBoundaries(boundaries: UISourceBoundary[]): void {

        // 1. Collect uiId chains.
        const keysMap: Map<string, UISourceBoundary[]> = new Map();
        for (const boundary of boundaries) {
            // Prepare.
            let key = boundary.uiId;
            // Go up the parent chain.
            // .. If is a content boundary, just add an empty splitter.
            let pBoundary: UIBoundary | null = boundary.parentBoundary;
            while (pBoundary) {
                key = (pBoundary.uiId || "") + ">" + key;
                pBoundary = pBoundary.parentBoundary;
            }
            // Add amongst cousins - optimization to get better tree order even in not-so-important cases.
            // .. We find the correct spot by comparing index in innerBoundaries.
            const collected = keysMap.get(key);
            if (collected) {
                let iSub = 0;
                if (boundary.parentBoundary) {
                    const inner = boundary.parentBoundary.innerBoundaries;
                    const iMe = inner.indexOf(boundary);
                    for (const kid of collected) {
                        if (iMe < inner.indexOf(kid))
                            break;
                        iSub++;
                    }
                }
                collected.splice(iSub, 0, boundary);
            }
            // First one in the cousin family.
            else
                keysMap.set(key, [boundary]);
        }

        // 2. Sort by keys.
        const sortedKeys: string[] = [];
        for (const thisKey of keysMap.keys()) {
            let iInsert = 0;
            let shouldBreak = false;
            for (const thatKey of sortedKeys) {
                // Is earlier.
                if (thatKey.startsWith(thisKey + ">"))
                    break;
                // Is related, should break after.
                if (thisKey.startsWith(thatKey + ">"))
                    shouldBreak = true;
                // Break now, relations have ended.
                else if (shouldBreak)
                    break;
                // Next location.
                iInsert++;
            }
            sortedKeys.splice(iInsert, 0, thisKey);
        }

        // 3. Reassign in correct order.
        let i = 0;
        for (const key of sortedKeys) {
            // Unravel any of the same cousin family.
            for (const boundary of keysMap.get(key) as UISourceBoundary[]) {
                boundaries[i] = boundary;
                i++;
            }
        }
    },

    updateInterested(bInterested: UISourceBoundary[], sortBefore: boolean = true): UIChangeInfos {
        // Prepare return.
        let renderInfos: UIDomRenderInfo[] = [];
        let boundaryChanges: UISourceBoundaryChange[] = [];
        // Sort, if needs and has at least two entries.
        if (sortBefore)
            _Apply.sortBoundaries(bInterested);
        // Update each - if still needs to be updated (when the call comes).
        for (const thruBoundary of bInterested) {
            // Was already updated.
            if (!thruBoundary._preUpdates)
                continue;
            // Update and collect.
            const uInfos = thruBoundary.uiHost.services.updateSourceBoundary(thruBoundary);
            if (uInfos) {
                renderInfos = renderInfos.concat(uInfos[0]);
                boundaryChanges = boundaryChanges.concat(uInfos[1]);
            }
        }
        // Return infos.
        return [ renderInfos, boundaryChanges ];
    },

    /** Generic helper for classes with timer and method to call to execute rendering.
     * - Returns the value that should be assigned as the stored timer (either existing one, new one or null). */
    refreshWithTimeout<Obj extends object>(obj: Obj, callback: (this: Obj) => void, currentTimer: number | null, defaultTimeout: number | null, forceTimeout?: number | null): number | null {
        // Clear old timer if was given a specific forceTimeout (and had a timer).
        if (currentTimer !== null && forceTimeout !== undefined) {
            window.clearTimeout(currentTimer);
            currentTimer = null;
        }
        // Execute immediately.
        const timeout = forceTimeout === undefined ? defaultTimeout : forceTimeout;
        if (timeout === null)
            callback.call(obj);
        // Or setup a timer - unless already has a timer to be reused.
        else if (currentTimer === null)
            currentTimer = window.setTimeout(() => callback.call(obj), timeout);
        // Return the timer.
        return currentTimer;
    },


    // - Finders - //

    /** This is a very quick way to find all boundaries within and including the given one - recursively if includeNested is true.
     * - Note that this stays inside the scope of the host (as .innerBoundaries doesn't contain the root boundary of a host). */
    findBoundariesWithin(origBoundary: UIBoundary, includeNested: boolean = true): (UISourceBoundary | UIContentBoundary)[] {
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

    /** Finds treeNodes of given types within the baseTreeNode (including it).
     * - If includeNested is true, searches recursively inside sub boundaries - not just within the render scope. (Normally stops after meets a source or content boundary.)
     * - If includeInHosts is true, extends the search to inside nested hosts as well. (Not recommended.)
     * - If includeInInactive is true, extends the search to include inactive boundaries and treeNodes inside them. */
    findTreeNodesWithin(baseTreeNode: UITreeNode, okTypes: Partial<Record<UITreeNodeType, boolean>>, maxCount: number = 0, includeNested: boolean = false, includeInHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): UITreeNode[] {
        // Prepare.
        const list: UITreeNode[] = [];
		let treeNodesLeft : UITreeNode[] = [baseTreeNode];
		let treeNode : UITreeNode | undefined;
        let i = 0;
        const origBoundary = baseTreeNode.boundary;
        // Loop recursively in tree order.
		while (treeNode = treeNodesLeft[i]) {
            // Next.
            i++;
            // Skip inactive.
            if (treeNode.boundary && treeNode.boundary.isMounted === null)
                continue;
            // Accepted.
            if (okTypes[treeNode.type]) {
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


    // - Static helpers - //

    queryDomElement<T extends Element = Element>(treeNode: UITreeNode, selector: string, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false): T | null {
        const validator = (tNode: UITreeNode) => tNode.domNode && tNode.domNode instanceof Element && tNode.domNode.matches(selector);
        const foundNode = _Apply.findTreeNodesWithin(treeNode, { dom: true }, 1, allowWithinBoundaries, allowOverHosts, validator)[0];
        return foundNode && foundNode.domNode as T || null;
    },

    queryDomElements<T extends Element = Element>(treeNode: UITreeNode, selector: string, maxCount: number = 0, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false): T[] {
        const validator = (tNode: UITreeNode) => tNode.domNode && tNode.domNode instanceof Element && tNode.domNode.matches(selector);
        return _Apply.findTreeNodesWithin(treeNode, { dom: true }, maxCount, allowWithinBoundaries, allowOverHosts, validator).map(tNode => tNode.domNode as T);
    },

    findTreeNodes(treeNode: UITreeNode, types: RecordableType<UITreeNodeType>, maxCount: number = 0, allowWithinBoundaries: boolean = false, allowOverHosts: boolean = false, validator?: (treeNode: UITreeNode) => any): UITreeNode[] {
        return _Apply.findTreeNodesWithin(treeNode, _Lib.buildRecordable<UITreeNodeType>(types), maxCount, allowWithinBoundaries, allowOverHosts, validator);
    },

    getTreeNodesForDomRootsUnder(rootNode: UITreeNode, inNestedBoundaries: boolean = false, includeEmpty: boolean = false, maxCount: number = 0): UITreeNodeDom[] {
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
                    collected = collected.concat(_Apply.getTreeNodesForDomRootsUnder(treeNode, inNestedBoundaries, includeEmpty, maxCount - collected.length));
                    if (maxCount && collected.length >= maxCount)
                        return collected.slice(0, maxCount);
                    break;
            }
        }
        // Return collection.
        return collected;
    },

}
