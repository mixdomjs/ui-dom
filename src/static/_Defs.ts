


// - Imports - //

import { _Lib } from "./_Lib";
import {
    UIGenericProps,
    UIGenericPostProps,
    UIDefTarget,
    UIDefType,
    UIDefApplied,
    UIPreTag,
    UIBoundaryTag,
    UIDomTag,
    UIRenderOutput,
    UIContentValue,
    Dictionary,
} from "./_Types";
import {
    UIPortalProps,
    UIElementProps,
} from "../classes/UIPseudoClasses";
import { UIContentClosure } from "../classes/UIContentClosure";
import { UISpread } from "../classes/UISpread";
import { UIRef } from "../classes/UIRef";
import { UIHost } from "../classes/UIHost";
import { UIContextsProps } from "../classes/UIContext";


// - Exports - //

export const _Defs = {

    // - CREATE DEFS - //

    /** Note that "content" and "host" defs are created from the ...contents[], while "pass" type comes already as a def.
     * .. This gives any other type. If there's no valid type, returns "". */
    getDefType(tag: UIPreTag): UIDefType | "spread" | "" {
        // Dom.
        if (typeof tag === "string")
            return "dom";
        // Functions.
        const uiDomType = tag["UI_DOM_TYPE"];
        if (!uiDomType)
            return typeof tag === "function" ? "boundary" : "";
        // Class/Mixin or pseudo class.
        switch(uiDomType) {
            case "Live":
            case "Mini":
            case "Wired":
                return "boundary";
            case "Spread":
            case "Fragment":
            case "Portal":
            case "Element":
            case "Contexts": // Note that "Context" as singular should not appear here anymore after v1.7.0.
            case "Host":
                return uiDomType.toLowerCase() as UIDefType;
            default:
                return "";
        }
    },

	// Note. The created DEF has the props.children removed and cleaned into its own property here.
	// .. When the props are applied to a component the children will be added back into props.
    // .. Returns null only if has no tagOrClass and no contentPass defined.
    createDef<Props extends Dictionary = {}>(tagOrClass: UIPreTag = "div", origProps: UIGenericProps<Props> | null = null, ...contents: UIRenderOutput[]): UIDefTarget | null {

        // Get type.
        const defType = _Defs.getDefType(tagOrClass);
        if (!defType)
            return null;

        // Add childDefs to the def.
        const childDefs: UIDefTarget[] = [];
        for (const content of contents) {
            const def = _Defs.createDefFromContent(content);
            if (def)
                childDefs.push(def);
        }

        // Static, render immediately and return the def.
        if (defType === "spread")
            return (tagOrClass as typeof UISpread).unfold(origProps || {}, childDefs);

        // Special case - return null, if the def is practically an empty fragment (has no simple content either).
        // .. Note that due to how the flow works, this functions like a "remove empty fragments recursively" feature.
        // .... This is because the flow goes up: first children defs are created, then they are fed to its parent def's creation as content, and so on.
        // .... So we don't need to do (multiple) recursions down, but instead do a single check in each scope, and the answer is ready when it's the parent's turn.
        if (defType === "fragment" && !childDefs[0])
            return null;

        // Create the basis for the def.
        const tag = defType === "dom" && tagOrClass as UIDomTag || defType === "boundary" && tagOrClass as UIBoundaryTag || defType === "element" && "_" || (defType === "content" ? "" : null);
		const targetDef = {
            _uiDefType: defType,
            tag,
            childDefs
		} as UIDefTarget;

        // Props.
        const needsProps = !!tag;
        if (defType === "fragment") {
            if (origProps && origProps.needsChildren !== undefined)
                targetDef.props = { needsChildren: origProps.needsChildren };
        }
        else if (origProps) {
            // Copy.
            const { key, ref, contexts, ...passProps } = origProps;
            if (key != null)
                targetDef.key = key;
            if (ref) {
                const forwarded: UIRef[] = [];
                if (ref.constructor["UI_DOM_TYPE"] === "Ref")
                    forwarded.push(ref as UIRef);
                else {
                    for (const f of (ref as UIRef[]))
                        if (f && f.constructor["UI_DOM_TYPE"] === "Ref" && forwarded.indexOf(f) === -1)
                            forwarded.push(f);
                }
                targetDef.attachedRefs = forwarded;
            }
            if (contexts && defType === "boundary")
                targetDef.attachedContexts = { ...contexts };
            if (needsProps)
                targetDef.props = typeof tag === "string" ? _Lib.cleanHtmlProps(passProps) : passProps as UIGenericPostProps;
        }
        // Empty props.
        else if (needsProps)
            targetDef.props = {};

        // Specialities.
        switch(targetDef._uiDefType) {
            case "portal": {
                const props = (origProps || {}) as UIPortalProps;
                targetDef.domPortal = props.container || null;
                if (!childDefs[0] && props && (props.content != null))
                    contents = [ props.content ];
                break;
            }
            case "contexts": {
                targetDef.contexts = (origProps || {} as UIContextsProps).cascade || null;
                break;
            }
            case "element": {
                const props = (origProps || {}) as UIElementProps;
                targetDef.domElement = props.element || null;
                targetDef.domCloneMode = props.cloneMode != null ? (typeof props.cloneMode === "boolean" ? (props.cloneMode ? "deep" : "") : props.cloneMode) : null;
                delete targetDef.props["element"];
                delete targetDef.props["cloneMode"];
                break;
            }
        }
        // Return def.
        return targetDef;
	},

    // Create a def out of the content.
	createDefFromContent(renderContent: UIRenderOutput): UIDefTarget | null {

        // Object type.
        if (renderContent && (typeof renderContent === "object")) {
            // Def - we check it first, because it's the most common. (Although typescript would prefer it below by neglating other options.)
            if (typeof renderContent["_uiDefType"] === "string") {
                // We pass defs directly, as they contents have been cleaned already.
                // .. At least for practical performance reasons, we assume that - let's not account for external def hacks.
                return renderContent as UIDefTarget;
            }
            // Dom node.
            if (renderContent instanceof Node) {
                return {
                    _uiDefType: "content",
                    tag: "",
                    childDefs: [],
                    domContent: renderContent
                };
            }
            // UIHost.
            if (renderContent.constructor["UI_DOM_TYPE"] === "Host") {
                return {
                    _uiDefType: "host",
                    tag: null,
                    host: renderContent as UIHost,
                    key: renderContent, // Unique key, so does wide.
                    childDefs: [],
                };
            }
            // Is an array or array like.
            if (Array.isArray(renderContent) || renderContent instanceof HTMLCollection || renderContent instanceof NodeList) {
                // Process array with localKeys support.
                const childDefs = [...renderContent].map(item => _Defs.createDefFromContent(item)).filter(def => def) as UIDefTarget[];
                if (!childDefs.length)
                    return null;
                // Create a single fragment item to hold the array and mark as array.
                return {
                    _uiDefType: "fragment",
                    tag: null,
                    isArray: true,
                    childDefs
                };
            }
            // Otherwise it's unknown data, stringify it.
            renderContent = String(renderContent) as UIContentValue;
        }
        // Is simple content as a string or number.
        if (renderContent != null)
            return {
                _uiDefType: "content",
        		tag: "",
                domContent: renderContent,
                childDefs: [],
        	};
        // Is empty.
        return null;
	},

    /** Copies everything from targetDef that defines its type, but not any "updatable" properties (except key). */
    newAppliedDefBy(targetDef: UIDefTarget, contentClosure: UIContentClosure | null): UIDefApplied {
        // Basics.
        const aDef = {
            _uiDefType: targetDef._uiDefType,
            tag: targetDef.tag,
            key: targetDef.key,
            childDefs: [],
            action: "mounted"
        } as UIDefApplied;
        // Other non-changing based on type.
        if (targetDef.isArray)
            aDef.isArray = true;
        else if (aDef._uiDefType === "pass")
            aDef.contentPass = contentClosure || null;
        else if (targetDef.host)
            aDef.host = targetDef.host;
        if (targetDef.keyScope !== undefined)
            aDef.keyScope = targetDef.keyScope;
        // Return applied def ready to go.
        return aDef;
    },

    newContentPassDef(key?: any, isCopy? : boolean): UIDefTarget {
        // Create basis.
        const def: UIDefTarget = {
            _uiDefType: "pass",
            tag: null,
            childDefs: [],
            contentPassType: isCopy ? "copy" : "pass",
        };
        // Apply key.
        if (key != null)
            def.key = key;
        // We always need to have a key for true content pass.
        // .. and it should be unique and common to all Q.Content defs unless specifically given a key.
        else if (!isCopy)
            def.key = _Defs.ContentKey;
        // Return def.
        return def;
    },

    newContentCopyDef(key?: any): UIDefTarget {
        return _Defs.newContentPassDef(key, true);
    },

    // A unique but common to all key for Q.Content defs - used unless specifically given a key.
    ContentKey: {},

}
