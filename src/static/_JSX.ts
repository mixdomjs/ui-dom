

// - Imports - //

import { HTMLSVGAttributesBy, UIComponentProps } from "./_Types";


// - Exports - //

export declare namespace JSX {

    // This gives support for dom elements.
    export interface IntrinsicElements extends HTMLSVGAttributesBy {}
    // This gives components automatic support to "key", "ref" and "contexts".
    interface IntrinsicAttributes extends UIComponentProps { }

    // - Unneeded - //
    //
    // export interface ElementAttributesProperty {
    //     props: any;
    // }
    // export interface IntrinsicAttributes {
    //     key?: any;
    // }
    // export interface ElementAttributesProperty {
    //     props: any;
    // }
    // export interface ElementChildrenAttribute {
    //     // children?: never;
    // }

    // - Tests - //
    //
    // export interface ElementClass extends UIComponent<any> {}
    // export interface ElementClass { }
    // export interface Element {
    // 	type: UIComponentTag<Props> | DomTag;
    // 	props: Props;
    // 	key: any;
    // 	ref?: UIRef | UIRef[] | null;
    // }

}
