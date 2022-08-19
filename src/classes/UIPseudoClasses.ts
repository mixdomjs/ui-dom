

// - Imports - //

import {
    DomTags,
    UICloneNodeBehaviour,
    UIGenericProps,
    UIProps,
    UIRenderOutput,
} from "../static/_Types";


// - Export pseudo classes - //
//
// These have props class member just for typescript TSX, as these classes will never be instanced (only their static side used).
// .. So even though they are used like: <uiDom.Portal />, the uiDom.Portal class is actually never instanced.
// .. Instead it's just turned into a target def describing portal (or other) functionality - as the features are handled directly (for better performance).

export interface UIFragmentProps extends UIProps {
    withContent?: boolean;
};
export class UIFragment<Props extends UIFragmentProps = {}> {
    public static UI_DOM_TYPE = "Fragment";
    props: Props;
    constructor(_props: Props) {}
}

export interface UIPortalProps extends UIProps {
    container: Node | null;
    content?: UIRenderOutput;
}
export class UIPortal<Props extends UIPortalProps = UIPortalProps> {
    public static UI_DOM_TYPE = "Portal";
    props: Props;
    constructor(_props: Props) { }
}

export type UIElementProps<Type extends DomTags = DomTags> = UIProps & UIGenericProps<Type> & {
    element: HTMLElement | SVGElement | null;
    /** Determines what happens when meeting duplicates.
     * - If == null, uses the uiHost based setting.
     * - If boolean, then is either "deep" or nothing. */
    cloneMode?: boolean | UICloneNodeBehaviour | null;
};
export class UIElement<Type extends DomTags = DomTags, Props extends UIElementProps<Type> = UIElementProps<Type>> {
    public static UI_DOM_TYPE = "Element";
    props: Props;
    constructor(_props: Props) { }
}
