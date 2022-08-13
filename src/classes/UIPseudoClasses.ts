

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
// These have a constructor just for typescript TSX, as these classes will never be instanced (only their static side used).
// .. So even though they are used like: <uiDom.Portal />, the uiDom.Portal class is actually never instanced.
// .. Instead it's just turned into a target def describing portal (or other) functionality - as the features are handled directly (for better performance).

export type UIFragmentProps = UIGenericProps & {
    withContent?: boolean;
};
export class UIFragment {
    public static UI_DOM_TYPE = "Fragment";
    constructor(_props?: UIFragmentProps | null) { }
}

export type UIPortalProps = UIGenericProps & {
    container: Node | null;
    content?: UIRenderOutput;
}
export class UIPortal {
    public static UI_DOM_TYPE = "Portal";
    constructor(_props?: UIPortalProps) { };
}

export type UIElementProps<Type extends HTMLTags = HTMLTags> = UIGenericProps & UIHTMLProps<Type> & {
    element: HTMLElement | SVGElement | null;
    /** Determines what happens when meeting duplicates.
     * - If == null, uses the uiHost based setting.
     * - If boolean, then is either "deep" or nothing. */
    cloneMode?: boolean | UICloneNodeBehaviour | null;
};
export class UIElement<Type extends HTMLTags = HTMLTags> {
    public static UI_DOM_TYPE = "Element";
    constructor(_props?: UIElementProps<Type>) { }
}
