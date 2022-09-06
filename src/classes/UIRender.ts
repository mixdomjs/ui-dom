
// - Imports - //

import {
    DomElement,
    ListenerAttributeNames,
    UITreeNode,
    UITreeNodeDom,
    UITreeNodeType,
    UIHTMLDiffs,
    UIGenericPostProps,
    UIHostSettings,
    UIContentValue,
    UIDomRenderInfo,
    UIDomTag,
} from "../static/_Types";
import { _Lib } from "../static/_Lib";
import { UIRef } from "./UIRef";


// - Exports - //

// Settings.
export type UIRenderSettings = Pick<UIHostSettings,
    "renderTextContent" |
    "renderTextTag" |
    "renderHtmlDefTag" |
    "renderSvgNamespaceURI" |
    "renderDomPropsOnSwap" |
    "noRenderValuesMode" |
    "callRefMoveEvenIfNoDomMove" |
    "duplicateDomNodeHandler" |
    "duplicateDomNodeBehaviour" |
    "devLogWarnings" |
    "devLogRenderInfos"
>;

// This is exported as a class, so that can hold externalElements (and settings).
export class UIRender {


    // - Q-Host based - //

    /** Collection of settings. */
    settings: UIRenderSettings;
    /** To keep track of featured external dom elements. */
    externalElements: Set<Node>;

    constructor(settings: UIRenderSettings) {
        this.settings = settings;
        this.externalElements = new Set();
    }

    getApprovedNode(newEl: Node, treeNode: UITreeNodeDom): Node | null {
        let el : Node | null = newEl;
        const behaviour = treeNode.def.domCloneMode != null ? treeNode.def.domCloneMode : this.settings.duplicateDomNodeBehaviour;
        if (behaviour === "always" || this.externalElements.has(newEl)) {
            if (this.settings.duplicateDomNodeHandler)
                el = this.settings.duplicateDomNodeHandler(newEl, treeNode);
            else {
                el = behaviour ? newEl.cloneNode(behaviour === "deep" || behaviour === "always") : null;
            }
        }
        if (el)
            this.externalElements.add(el);
        return el;
    }

    createDomNodeBy(treeNode: UITreeNodeDom): Node | null {
        // Invalid.
        const origTag = treeNode.def.tag;
        if (typeof origTag !== "string")
            return null;
        // Pseudo.
        if (origTag === "_")
            return treeNode.def.domElement && this.getApprovedNode(treeNode.def.domElement, treeNode) || null;
        // Direct element pass.
        const simpleContent = treeNode.def.domContent;
        if (simpleContent instanceof Node) {
            // Handle multiple passes.
            // .. Note that they are not keyed. So will "remove" and "create" (<- insert) them.
            return this.getApprovedNode(simpleContent, treeNode);
        }
        // Inner html.
        const htmlMode = treeNode.def.domHtmlMode;
        if (htmlMode && simpleContent != null && simpleContent !== "")
            return UIRender.domNodeFrom(simpleContent.toString(), (origTag as UIDomTag) || this.settings.renderHtmlDefTag, true);
        // Html or svg element.
        if (origTag)
            return origTag === "svg" || treeNode.parent && treeNode.parent.domNode && treeNode.parent.domNode["ownerSVGElement"] !== undefined ?
                document.createElementNS(this.settings.renderSvgNamespaceURI || "http://www.w3.org/2000/svg", origTag) :
                document.createElement(origTag);

        // Tagless.
        // .. Note, that because there's always a def and treeNode for the simple content itself (with tag ""),
        // .. the only case where we insert text is for such treeNodes nodes. So the above cases can just return before this.

        // Text node.
        let domNode: Node | null = null;
        let tag = "";
        let text = "";
        // Get by setting.
        if (simpleContent != null) {
            // Get text by callback or stringify directly.
            text = (this.settings.renderTextContent ? this.settings.renderTextContent(simpleContent) : simpleContent).toString();
            // Get custom tag / node.
            const renderTextTag = this.settings.renderTextTag;
            if (renderTextTag) {
                // If is function.
                if (typeof renderTextTag === "string")
                    tag = renderTextTag;
                else if (typeof renderTextTag === "function") {
                    // Get by callback.
                    const output = renderTextTag(simpleContent);
                    // Use directly.
                    if (output instanceof Node)
                        domNode = output;
                }
            }
        }
        // Create new domNode.
        if (!domNode)
            domNode = tag ? document.createElement(tag) : document.createTextNode(text);
        // Add text.
        if (tag && text)
            domNode.textContent = text;
        // Return.
        return domNode;
    }

    /** The main method to apply renderInfos. Everything else serves this. */
    applyToDom(renderInfos: UIDomRenderInfo[]) {

        /** This is used to skip unnecessary dom removals, in the case that the a parent in direct parent chain was just removed. */
        const newlyKilled: Array<Node> = [];
        let salvaged: Array<Node> | null = null;
        const toMove: Array<[UIDomRenderInfo, Node | null]> = [];

        // - DEVLOG - //
        // This tiny log is super useful when debugging (especially with preEqualCheckDomProps = true).
        if (this.settings.devLogRenderInfos)
            console.log("__UIRender.applyToDom: Dev-log: Received rendering infos: ", renderInfos);

        // Loop each renderInfo.
        for (const renderInfo of renderInfos) {

            // Prepare common.
            const treeNode = renderInfo.treeNode;

            // Remove.
            if (renderInfo.remove) {
                // Normal case - refers to a dom tag.
                if (treeNode.type === "dom" && treeNode.domNode) {
                    // Prepare.
                    const domNode = treeNode.domNode;
                    const parentNode = domNode.parentNode;
                    // const domRef = treeNode.def.ref;
                    const attachedRefs = treeNode.def.attachedRefs;
                    // Handle ref.
                    let doSalvage: boolean | void | undefined = false;
                    // Remove forwarded ref.
                    if (attachedRefs) {
                        for (const attachedRef of attachedRefs) {
                            if (attachedRef && attachedRef.domWillUnmount && attachedRef.domWillUnmount(domNode))
                                doSalvage = true;
                            UIRef.willDetachFrom(attachedRef, treeNode);
                        }
                    }
                    // Salvage.
                    if (doSalvage)
                        salvaged ? salvaged.push(domNode) : salvaged = [ domNode ];
                    // Remove from dom.
                    else if (parentNode && newlyKilled.indexOf(parentNode) === -1 && (!salvaged || !salvaged.some(node => node.contains(domNode))))
                        parentNode.removeChild(domNode);
                    // Bookkeeping.
                    const isElement = treeNode.def._uiDefType === "element";
                    if (isElement || treeNode.def._uiDefType === "content")
                        this.externalElements.delete(domNode);
                    // .. Don't mark to newlyKilled if was "element" type. We want its contents to actually be removed.
                    if (!isElement)
                        newlyKilled.push(domNode);
                    treeNode.domNode = null;
                    UIRender.updateDomChainBy(treeNode, null);

                }
                // We know there's nothing else.
                continue;
            }

            // Prepare.
            let doUpdate = false;
            let didCreate = false;

            // Refresh.
            if (renderInfo.refresh && treeNode.domNode && treeNode["domProps"]) {
                (treeNode as UITreeNodeDom).domProps = renderInfo.refresh === "read" ? UIRender.readFromDom(treeNode.domNode) : {};
                doUpdate = true;
            }

            // Create.
            if (renderInfo.create) {
                switch(treeNode.type) {
                    // Normal case - refers to a dom tag.
                    case "dom":
                        // Create.
                        const domNode = this.createDomNodeBy(treeNode);
                        if (domNode) {
                            // Update ref.
                            treeNode.domNode = domNode;
                            // Add to smart bookkeeping.
                            didCreate = true;
                            // newlyCreated.push(domNode);
                        }
                        break;
                    // QPortal - just define the domNode ref.
                    case "portal":
                        treeNode.domNode = treeNode.def.domPortal || null;
                        break;
                }
            }

            // Move (or finish create).
            if (didCreate || renderInfo.move) {
                // Host.
                if (treeNode.type === "host") {
                    // Call the host's refresh softly to trigger moving.
                    const host = treeNode.def.host || null;
                    if (host)
                        host.refresh(false, null, null);
                    // Update bookkeeping.
                    treeNode.domNode = treeNode.parent && host && host.getRootDomNode() || null;
                    UIRender.updateDomChainBy(treeNode, treeNode.domNode);
                }
                // Normal case.
                else {
                    // For actual moving.
                    const domNode = treeNode.domNode;
                    if (domNode) {
                        // Mark to be moved (done in reverse order below).
                        const domParentWas = domNode.parentNode;
                        toMove.push([renderInfo, domParentWas]);
                        // Before moving though, let's remove from wherever was.
                        // .. Note also that removing (regardless of insertion), supports a special case for nested qHosts:
                        // .. This is when the root nodes of a host are "moved to nothing". (They are not "removed" nor "created" - instead always "moved".)
                        if (domParentWas)
                            domParentWas.removeChild(domNode as Node);
                    }
                    // Update bookkeeping.
                    UIRender.updateDomChainBy(treeNode, domNode);
                }
            }

            // Swap elements (for Q.Portal and Q.Element).
            if (renderInfo.swap) {
                // Parse.
                const oldEl = treeNode.domNode;
                let newEl: Node | null = (treeNode.type === "portal" ? treeNode.def.domPortal : treeNode.def.domElement) || null;
                // If had changed.
                if (oldEl !== newEl) {

                    // For Q.Portal, we just need to swap the children.
                    // .. So nothing to do at this point.

                    // For Q.Element, the swapping is more thorough.
                    if (treeNode.type === "dom") {
                        const tNode = treeNode as UITreeNodeDom;
                        const oldParent = oldEl && oldEl.parentNode;
                        if (newEl) {
                            newEl = this.getApprovedNode(newEl, tNode);
                            // Add.
                            if (newEl) {
                                let [parent, sibling] = oldParent ? [ oldParent, oldEl ] : UIRender.findInsertionNodes(treeNode);
                                if (parent)
                                    parent.insertBefore(newEl, sibling);
                            }
                        }
                        // Remove.
                        if (oldEl) {
                            // Remove from bookkeeping.
                            this.externalElements.delete(oldEl);
                            // Remove event listeners.
                            if (tNode.domProps && oldEl instanceof Element) {
                                for (const prop in tNode.domProps) {
                                    const listenerProp = UIRender.LISTENER_PROPS[prop];
                                    if (listenerProp)
                                        oldEl.removeEventListener(listenerProp, tNode.domProps[prop]);
                                }
                            }
                            // Remove from dom.
                            if (oldParent)
                                oldParent.removeChild(oldEl);
                        }
                        // Reapply.
                        if (tNode.domProps) {
                            tNode.domProps = newEl && (this.settings.renderDomPropsOnSwap === "read") ? UIRender.readFromDom(newEl) : {};
                            doUpdate = true;
                        }
                    }

                    // Swap the kids.
                    for (const tNode of treeNode.children) {
                        const node = tNode.domNode;
                        if (node) {
                            if (node.parentNode)
                                node.parentNode.removeChild(node);
                            if (newEl)
                                newEl.appendChild(node);
                        }
                    }
                    // Update dom chain.
                    treeNode.domNode = newEl;
                    UIRender.updateDomChainBy(treeNode, newEl);
                }
            }

            // Content.
            if (renderInfo.content) {
                if (treeNode.type === "dom" && treeNode.domNode) {
                    // Prepare.
                    const content = treeNode.def.domContent;
                    const nodeWas = treeNode.domNode;
                    let newNode : Node = nodeWas;
                    // Text type content.
                    if (treeNode.def._uiDefType === "content") {
                        // Set innerHTML - if amounts to nothing, use an empty text node instead.
                        const htmlMode = treeNode.def.domHtmlMode;
                        if (htmlMode && content != null && content !== "") {
                            // Create a dom node.
                            newNode = UIRender.domNodeFrom(content.toString(), (treeNode.def.tag as UIDomTag) || this.settings.renderHtmlDefTag, true);
                            // Clear the previously applied props (if any), and mark for re-update.
                            if (treeNode.domProps) {
                                doUpdate = true;
                                treeNode.domProps = {};
                            }
                        }
                        // Set / clear text content.
                        else {
                            // Get text.
                            const newText = content == null ? "" : (this.settings.renderTextContent ? this.settings.renderTextContent(content as UIContentValue) : content).toString();
                            // If wasn't a Text node.
                            if (nodeWas.nodeType !== 3)
                                newNode = document.createTextNode(newText);
                            // Modify Text node content.
                            else
                                nodeWas.textContent = newText;
                        }
                    }
                    // Replace with node.
                    else {
                        if (content instanceof Node) {
                            // Remove from where was.
                            const cParent = content.parentNode;
                            if (cParent)
                                cParent.removeChild(content);
                        }
                        else
                            nodeWas.textContent = "";
                    }
                    // Did change node.
                    if (nodeWas !== newNode) {
                        // Remove old and insert new.
                        const parent = nodeWas.parentNode;
                        if (parent) {
                            treeNode.domNode = newNode;
                            parent.insertBefore(newNode, nodeWas);
                            parent.removeChild(nodeWas);
                        }
                        // Update chain.
                        UIRender.updateDomChainBy(treeNode, treeNode.domNode);
                    }
                    // Call.
                    // const domRef = treeNode.def.ref;
                    const attachedRefs = treeNode.def.attachedRefs;
                    if (attachedRefs) {
                        for (const attachedRef of attachedRefs)
                            if (attachedRef && attachedRef.domDidContent)
                                attachedRef.domDidContent(treeNode.domNode, content != null ? content : null);
                    }
                }
            }

            // Update.
            if (didCreate || doUpdate || renderInfo.update) {
                // For dom nodes.
                if (treeNode.type === "dom" && treeNode.domNode && treeNode.domNode instanceof Element) {
                    // Modify dom props.
                    const [ appliedProps, diffs ] = UIRender.domApplyProps(treeNode, this.settings.devLogWarnings);
                    treeNode.domProps = appliedProps;
                    // Call update.
                    if (diffs && renderInfo.update) {
                        const attachedRefs = treeNode.def.attachedRefs;
                        if (attachedRefs) {
                            for (const attachedRef of attachedRefs)
                                if (attachedRef && attachedRef.domDidUpdate)
                                    attachedRef.domDidUpdate(treeNode.domNode, diffs);
                        }
                    }
                }
            }

            // This is only a technical update for bookkeeping.
            // .. It's needed whenever a first child was moved out of a parent.
            // .. They are typically pre-pended to the render infos.
            if (renderInfo.emptyMove) {
                UIRender.updateDomChainBy(treeNode, null, true);
            }

        }

        // Move - in reverse order.
        // .. The reversed order is needed to handle cases where siblings move together.
        // .. At least theoretically, it should also be same / better performance-wise:
        // ... This is because we are doing the heavy stuff (updating and insertions) before we insert elements into actual dom tree.
        // ... Due to the reverse flow, we actually insert stuff into dom tree only at the latest steps and fewest times.
        //
        let iMove = toMove.length - 1;
        if (iMove >= 0) {
            type ToMoveBefore = [UIDomRenderInfo, Node | null, (Node | null)?, UIRef[]? ];
            type ToMoveAfter = [UIDomRenderInfo, Node | null, Node | null, UIRef[] ];
            let info: ToMoveBefore | ToMoveAfter | undefined;
            let hasCalls = false;
            while (info = toMove[iMove--]) {
                // Prepare.
                const [{move, treeNode}] = info;
                const domNode = treeNode.domNode;
                // Get insertion point.
                const [ domParent, domSibling ] = domNode ? UIRender.findInsertionNodes(treeNode) : [ null, null ];
                // Insert.
                if (domParent && domNode) {
                    // Prepare.
                    const siblingWas = domNode.nextSibling;
                    // const domRef = treeNode.def && treeNode.def.ref;
                    // Execute - unless there's no reason to move.
                    // .. This check prevents from moving in such cases like [ a, b, c ] <=> [ b, c ].
                    // .. It's simple that [ a ] is removed, or in the reverse case, it's added.
                    const didInsert = domParent !== domNode.parentNode || domSibling !== siblingWas;
                    if (didInsert) {
                        // Add.
                        // .. Note that removing from dom has already been done above.
                        if (domParent)
                            domParent.insertBefore(domNode, domSibling);
                    }
                    // Call for forwarded refs.
                    const attachedRefs = treeNode.def && treeNode.def.attachedRefs;
                    if (attachedRefs && (didInsert || move && this.settings.callRefMoveEvenIfNoDomMove)) {
                        hasCalls = true;
                        info[2] = siblingWas;
                        info[3] = attachedRefs;
                    }
                }

                // - DEVLOG - //
                else if (this.settings.devLogWarnings && !domNode && !domParent)
                    console.warn("__UIRender.applyToDom: Error: Cannot move element: ", domNode, " into parent: ", domParent, " for treeNode: ", treeNode);

            }

            // Call run - we must do it after. (Otherwise might call domDidMount before parent is inserted into dom tree.)
            // .. And we can do it in the natural tree order.
            // .. From the domDidMount's perspective, it seems more natural and useful.
            if (hasCalls) {
                for (iMove=0; info = toMove[iMove]; iMove++) {
                    // No refs.
                    if (!info[3])
                        continue;
                    // Prepare call.
                    const [ rInfo, domParentWas, siblingWas, attachedRefs ] = info as ToMoveAfter;
                    const domNode = rInfo.treeNode.domNode as Node;
                    // Call each.
                    for (const attachedRef of attachedRefs) {
                        if (!rInfo.move) {
                            UIRef.didAttachOn(attachedRef, rInfo.treeNode);
                            if (attachedRef && attachedRef.domDidMount)
                                attachedRef.domDidMount(domNode);
                        }
                        else if (attachedRef.domDidMove)
                            attachedRef.domDidMove(domNode, domParentWas, siblingWas);
                    }
                }
            }
        }
    }


    // - Static - //

    static SPECIAL_PROPS: Record<string, "other" | "render" | undefined> = { innerHTML: "render", outerHTML: "render", textContent: "render", innerText: "render", outerText: "render", style: "other", data: "other", className: "other" };
    static PASSING_TYPES: Partial<Record<UITreeNodeType, true>> = { boundary: true, pass: true, contexts: true, host: true };
    static LISTENER_PROPS = [
    "Abort","Activate","AnimationCancel","AnimationEnd","AnimationIteration","AnimationStart","AuxClick","Blur","CanPlay","CanPlayThrough","Change","Click","Close","ContextMenu","CueChange","DblClick","Drag","DragEnd","DragEnter","DragLeave","DragOver","DragStart","Drop","DurationChange","Emptied","Ended","Error","Focus","FocusIn","FocusOut","GotPointerCapture","Input","Invalid","KeyDown","KeyPress","KeyUp","Load","LoadedData","LoadedMetaData","LoadStart","LostPointerCapture","MouseDown","MouseEnter","MouseLeave","MouseMove","MouseOut","MouseOver","MouseUp","Pause","Play","Playing","PointerCancel","PointerDown","PointerEnter","PointerLeave","PointerMove","PointerOut","PointerOver","PointerUp","Progress","RateChange","Reset","Resize","Scroll","SecurityPolicyViolation","Seeked","Seeking","Select","Stalled","Submit","Suspend","TimeUpdate","Toggle","TouchCancel","TouchEnd","TouchMove","TouchStart","TransitionCancel","TransitionEnd","TransitionRun","TransitionStart","VolumeChange","Waiting","Wheel"].reduce((acc,curr) => (acc["on" + curr]=curr.toLowerCase(),acc), {}) as Record<ListenerAttributeNames, (e: Event) => void>;

    static findInsertionNodes(treeNode: UITreeNode): [ Node, Node | null ] | [ null, null ] {

        // Situation example:
        //
        //  <div>                               // domNode: <div/>
        //      <Something>                     // domNode: <span/> #1
        //          <Onething>                  // domNode: <span/> #1
        //              <span>Stuff 1</span>    // domNode: <span/> #1
        //          </Onething>                 //
        //          <Onething>                  // domNode: <span/> #2
        //              <span>Stuff 2</span>    // domNode: <span/> #2
        //              <span>Stuff 3</span>    // domNode: <span/> #3
        //          </Onething>                 //
        //          <Onething>                  // domNode: <span/> #4
        //              <span>Stuff 4</span>    // domNode: <span/> #4
        //          </Onething>                 //
        //      </Something>                    //
        //      <Something>                     // domNode: <span/> #5
        //          <Onething>                  // domNode: <span/> #5
        //              <span>Stuff 5</span>    // domNode: <span/> #5
        //              <span>Stuff 6</span>    // domNode: <span/> #6
        //          </Onething>                 //
        //          <Onething>                  // domNode: <span/> #7
        //              <span>Stuff 7</span>    // domNode: <span/> #7
        //          </Onething>                 //
        //      </Something>                    //
        //  </div>                              //
        //
        // LOGIC FOR INSERTION (moving and creation):
        // 1. First find the domParent by simply going up until hits a treeNode with a dom tag.
        //    * If none found, stop. We cannot insert the element. (Should never happen - except for swappable elements, when it's intended to "remove" them.)
        //    * If the domParent was found in the newlyCreated smart bookkeeping, skip step 2 below (there are no next siblings yet).
        // 2. Then find the next domSibling reference element.
        //    * Go up and check your index.
        //    * Loop your next siblings and see if any has .domNode. If has, stop, we've found it.
        //    * If doesn't find any (or no next siblings), repeat the loop (go one up and check index). Until hits the domParent.
        // 3. Insert the domElement into the domParent using the domSibling reference if found (otherwise null -> becomes the last one).
        //
        // CASE EXAMPLE FOR FINDING NEXT SIBLING - for <span/> #2 above:
        // 1. We first go up to <Onething/> and see if we have next siblings.
        //    * If <span /3> has .domNode, we are already finished.
        // 2. There are no more siblings after it, so we go up to <Something/> and do the same.
        //    * If the third <Onething/> has a .domNode, we are finished.
        // 3. Otherwise we go up to <div> and look for siblings.
        //    * If the second <Something/> has a .domNode, we are finished.
        // 4. Otherwise we are finished as well, but without a .domNode. We will be inserted as the last child.
        //
        // BOOKKEEPING (see updateDomChainBy() below):
        // - The bookkeeping is done by whenever an element is moved / created,
        //   it goes to update domNode up the chain until is not the first child of parent or hits a dom tag.
        // - In the case of removing, the procedure is a bit more complex:
        //   * Goes up level by level until not the first child anymore or hits a dom tag.
        //     - On each tries to find a next sibling, unless already did find earlier.
        //     - Then applies that node to the current (boundary) treeNode.
        // - So if <span/> #2 is inserted above, after creating the element (and before inserting it),
        //   will go one up to update <Onething/>, but then is not anymore the first child (of <Something>), so stops.


        // 1. First, find parent.
        let domParent: Node | null = null;
        let tParentNode = treeNode.parent;
        while (tParentNode) {
            // If is a fully passing type, allow to pass through.
            // .. If half passing referring to "root" type and it has a parent, allow to continue further up still - to support nested qHosts.
            // .. Essentially we are then skipping the treeNode's .domNode (= the qHost's dom container's) existence, if there even was one.
            if (UIRender.PASSING_TYPES[tParentNode.type] || tParentNode.type === "root" && tParentNode.parent) {
                tParentNode = tParentNode.parent;
                continue;
            }
            // Not fully passing type - we should stop and take its domNode.
            // .. If there's none, then there shouldn't be any anywhere up the flow either.
            domParent = tParentNode.domNode;
            break;
        }
        if (!domParent)
            return [ null, null ];

        // 2. Find sibling.
        let domSibling: Node | null = null;
        // Loop up.
        let tNode: UITreeNode | null = treeNode;
        while (tNode) {
            // Get parent.
            tParentNode = tNode.parent;
            if (!tParentNode)
                break;
            let iNext = tParentNode.children.indexOf(tNode) + 1;
            // Look for domNode in next siblings.
            let nextNode: UITreeNode | undefined;
            while (nextNode = tParentNode.children[iNext]) {
                // Found.
                if (nextNode.domNode && nextNode.type !== "portal") {
                    domSibling = nextNode.domNode;
                    break;
                }
                // Next.
                iNext++;
            }
            // No more.
            if (domSibling || tParentNode.domNode === domParent)
                break;
            // Next.
            tNode = tParentNode;
        }

        // 3. Return info for insertion.
        return [ domParent, domSibling ];
    }

    /** This should be called (after the dom action) for each renderInfo that has action: create / move / remove.
     * - The respective action is defined by whether gives a domNode or null. If null, it's remove, otherwise it's like moving (for creation too).
     * - In either case, it goes and updates the bookkeeping so that each affected boundary always has a .domNode reference that points to its first element.
     * - This information is essential (and as minimal as possible) to know where to insert new domNodes in a performant manner. (See above findInsertionNodes().)
     * - Note that if the whole boundary unmounts, this is not called. Instead the one that was "moved" to be the first one is called to replace this.
     *   .. In dom sense, we can skip these "would move to the same point" before actual dom moving, but renderInfos should be created - as they are automatically by the basic flow. */
    static updateDomChainBy(fromTreeNode: UITreeNode, domNode: Node | null, fromSelf: boolean = false) {
        // Note, in the simple case that we have a domNode, the next sibling part is simply skipped. See the logic above in findInsertionNodes.
        // Prepare.
        let tNode: UITreeNode | null = fromTreeNode;
        let tParent: UITreeNode | null = fromSelf ? fromTreeNode : fromTreeNode.parent;
        let newDomNode: Node | null = domNode;
        // Go up level by level until we're not the first child.
        while (tParent) {
            // No more, we are not the first one anymore - or we've hit a non-passing tag.
            // .. However, on fromSelf mode, let's continue if this was the first one, in which case tParent === tNode.
            if (!UIRender.PASSING_TYPES[tParent.type] || tParent.children[0] !== tNode && tParent !== tNode)
                break;
            // Try to get the next sibling, unless we already have one.
            if (!newDomNode) {
                // Check in next siblings if finds a domNode.
                // .. Note that if tParent === tNode (<-- fromSelf = true), this works to give us the desired index 0.
                let iNext = tParent.children.indexOf(tNode) + 1;
                let nextNode: UITreeNode | undefined;
                while (nextNode = tParent.children[iNext]) {
                    // Found.
                    if (nextNode.domNode && nextNode.type !== "portal") {
                        newDomNode = nextNode.domNode;
                        break;
                    }
                    // Next.
                    iNext++;
                }
            }
            // Update.
            tParent.domNode = newDomNode;
            // Next.
            tNode = tParent;
            tParent = tParent.parent;
        }
    }

    static readFromDom(domNode: HTMLElement | SVGElement | Node): UIGenericPostProps {
        // Prepare.
        const domProps: UIGenericPostProps = {};
        if (!(domNode instanceof Element))
            return domProps;
        // Attributes, including className as class.
        for (const prop of domNode.getAttributeNames())
            domProps[prop] = domNode.getAttribute(prop);
        // Style.
        const cssText = (domNode as HTMLElement | SVGElement).style.cssText;
        if (cssText)
            domProps.style = _Lib.cleanHtmlStyle(cssText);
        // Return found.
        return domProps;
    }

    /** Returns a single html element.
     * - In case, the string refers to multiple, returns a fallback element containing them - even if has no content. */
    static domNodeFrom (innerHtml: string, fallbackTagOrEl: UIDomTag | HTMLElement = "div", keepTag: boolean = false): Node {
        const dummy = fallbackTagOrEl instanceof Element ? fallbackTagOrEl : document.createElement(fallbackTagOrEl);
        dummy.innerHTML = innerHtml;
        return keepTag ? dummy : dummy.children[1] ? dummy : dummy.children[0];
    }

    // /** Returns a list of html elements. */
    // static domNodesFrom (innerHtml: string): Node[] {
    //     const dummy = document.createElement("div");
    //     dummy.innerHTML = innerHtml;
    //     return [...dummy.children];
    // }
    // <-- Unused.

    /** Apply properties to dom elements for the given treeNode. Returns [ appliedProps, diffs? ]. */
    static domApplyProps(treeNode: UITreeNodeDom, logWarnings: boolean = false): [ UIGenericPostProps, UIHTMLDiffs? ] {

        // Parse.
        const domElement = treeNode.domNode as DomElement | null;
        const appliedProps: UIGenericPostProps = {};
        if (!domElement)
            return [ appliedProps ];

        // Collect all.
        const oldProps = treeNode.domProps || {};
        const nextProps = treeNode.def.props || {};
        const allDiffs = _Lib.getDictionaryDiffs(oldProps, nextProps);
        if (!allDiffs)
            return [ nextProps ];

        // Loop all.
        const diffs: UIHTMLDiffs = {};
        for (const prop in allDiffs) {

            // Special cases.
            const specialProp = UIRender.SPECIAL_PROPS[prop];
            if (specialProp) {
                // Not renderable.
                if (specialProp === "render") {
                    if (logWarnings)
                        console.warn("__UIRender.domApplyProps: Warning: Is using an ignored dom prop: ", prop, " for treeNode: ", treeNode);
                }
                // Specialities: className, style and data.
                else {
                    // Classname.
                    if (prop === "className") {
                        const classDiffs = _Lib.getClassNameDiffs(oldProps.className, nextProps.className);
                        if (classDiffs) {
                            // Diffs.
                            diffs.classNames = classDiffs;
                            // Apply.
                            for (const name in classDiffs)
                                domElement.classList[classDiffs[name] ? "add" : "remove"](name);
                            // Bookkeeping.
                            nextProps.className ? appliedProps.className = nextProps.className : delete appliedProps.className;
                        }
                    }
                    // The prop is "style" or "data".
                    else {
                        // Get diffs.
                        const nextVal = nextProps[prop];
                        const subDiffs = _Lib.getDictionaryDiffs(oldProps[prop] || {}, nextVal || {});
                        if (subDiffs) {
                            // Diffs.
                            diffs[prop] = subDiffs;
                            // Apply.
                            if (prop === "data") {
                                for (const subProp in subDiffs)
                                    subDiffs[subProp] !== undefined ? domElement.dataset[subProp] = subDiffs[subProp] : delete domElement.dataset[subProp];
                            }
                            // For styles, we use the very flexible element.style[prop] = value. If value is null, then will remove.
                            // .. This way, we support both ways to input styles: "backgroundColor" and "background-color".
                            else
                                for (const subProp in subDiffs)
                                    domElement.style[subProp] = subDiffs[subProp] != null ? subDiffs[subProp] : null;
                            // Bookkeeping.
                            nextVal ? appliedProps[prop] = nextVal : delete appliedProps[prop];
                        }
                    }
                }
                // Skip in any case.
                continue;
            }
            // Prepare.
            const val = allDiffs[prop];
            const hasValue = val !== undefined;
            const listenerProp = UIRender.LISTENER_PROPS[prop];
            // Listener.
            if (listenerProp) {
                // Diffs.
                if (!diffs.listeners)
                    diffs.listeners = {};
                diffs.listeners[prop] = val;
                // Remove old, if had.
                const oldListener = oldProps[prop];
                if (oldListener)
                    domElement.removeEventListener(listenerProp, oldListener);
                // Add new.
                if (hasValue)
                    domElement.addEventListener(listenerProp, val);
            }
            // Normal case - set/remove attribute.
            // .. Note, the value will be stringified automatically.
            else {
                // Diffs.
                if (!diffs.attributes)
                    diffs.attributes = {};
                diffs.attributes[prop] = val;
                // Apply.
                hasValue ? domElement.setAttribute(prop, val) : domElement.removeAttribute(prop);
            }
            // Bookkeeping.
            hasValue ? appliedProps[prop] = val : delete appliedProps[prop];
        }

        // Return info for the actually applied situation as well as diffs for each type.
        for (const _prop in diffs)
            return [ appliedProps, diffs ];
        // No diffs.
        return [ appliedProps ];
    }

}
