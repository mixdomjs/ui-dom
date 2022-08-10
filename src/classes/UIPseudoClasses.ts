

// - Imports - //

import {
    HTMLTags,
    UICloneNodeBehaviour,
    UIGenericProps,
    UIHTMLProps,
    UIRenderOutput,
} from "../static/_Types";


// - Export pseudo classes - //
//
// Has a constructor just for typescript TSX, as these classes will never be instanced (only their static side used).
// .. So even though programmer defines: <uiDom.Portal />, the uiDom.portal is not actually ever instanced.
// .. Instead it's just turned into a target def describing portal (or other) functionality - as the features are handled directly (for better performance).

export type UIFragmentProps = UIGenericProps<{ needsChildren?: boolean; }>;
export class UIFragment {
    public static UI_DOM_TYPE = "Fragment";
    constructor(_props?: UIFragmentProps | null) { }
}
export type UIFragmentType = {
	new (_props?: UIFragmentProps | null): UIFragment;
    readonly UI_DOM_TYPE: "Fragment";
}

export type UIPortalProps = UIGenericProps & {
    container: Node | null;
    content?: UIRenderOutput;
}
export class UIPortal {
    public static UI_DOM_TYPE = "Portal";
    constructor(_props?: UIPortalProps) { };
}
export type UIPortalType = {
	new (_props?: UIPortalProps): UIPortal;
    readonly UI_DOM_TYPE: "Portal";
}

export type UIElementProps<Type extends HTMLTags = HTMLTags> = UIGenericProps & UIHTMLProps<Type> & {
    element: HTMLElement | SVGElement | null;
    /** Determines what happens when meeting duplicates. If == null, uses the uiHost based setting.
     * - If boolean, then is either "deep" or nothing. */
    cloneMode?: boolean | UICloneNodeBehaviour | null;
};
export class UIElement<Type extends HTMLTags = HTMLTags> {
    public static UI_DOM_TYPE = "Element";
    constructor(_props?: UIElementProps<Type>) { }
}
export type UIElementType<Type extends HTMLTags = HTMLTags> = {
	new (_props?: UIElementProps): UIElement<Type>;
    readonly UI_DOM_TYPE: "Element";
}
