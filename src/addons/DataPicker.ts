

// - Imports - //

import { UICompareDepthByMode, UIUpdateCompareMode } from "../static/_Types";
import { _Lib } from "../static/_Lib";


// - Typing tools - //

export type DataExtractor<P extends any[] = any[], R = any> = (...args: P) => R;

/** This helps to create a fully typed data picker with one extractor that outputs an array.
 * - It returns a callback that can be used for selecting (like in Redux). */
export type CreateDataPicker<Params extends any[] = any[], Data = any> = <
    Extractor extends DataExtractor<Params>,
    Extracted extends ReturnType<Extractor> = ReturnType<Extractor>
>(extractor: Extractor, selector: (...args: Extracted) => Data, depth?: number | UIUpdateCompareMode)
    => (...args: Params) => Data;

/** This helps to create a fully typed data selector with multiple extractors (each outputting any value) as an array.
 * - It returns a callback that can be used for selecting (like in Redux).
 * - The typing supports up to 20 extractors. */
export type CreateDataSelector<Params extends any[] = any[], Data = any> = <
    S1 extends DataExtractor<Params>,
    S2 extends DataExtractor<Params>,
    S3 extends DataExtractor<Params>,
    S4 extends DataExtractor<Params>,
    S5 extends DataExtractor<Params>,
    S6 extends DataExtractor<Params>,
    S7 extends DataExtractor<Params>,
    S8 extends DataExtractor<Params>,
    S9 extends DataExtractor<Params>,
    S10 extends DataExtractor<Params>,
    S11 extends DataExtractor<Params>,
    S12 extends DataExtractor<Params>,
    S13 extends DataExtractor<Params>,
    S14 extends DataExtractor<Params>,
    S15 extends DataExtractor<Params>,
    S16 extends DataExtractor<Params>,
    S17 extends DataExtractor<Params>,
    S18 extends DataExtractor<Params>,
    S19 extends DataExtractor<Params>,
    S20 extends DataExtractor<Params>,
    SelectorArgs extends [ ReturnType<S1>, ReturnType<S2>, ReturnType<S3>, ReturnType<S4>, ReturnType<S5>, ReturnType<S6>, ReturnType<S7>, ReturnType<S8>, ReturnType<S9>, ReturnType<S10>, ReturnType<S11>, ReturnType<S12>, ReturnType<S13>, ReturnType<S14>, ReturnType<S15>, ReturnType<S16>, ReturnType<S17>, ReturnType<S18>, ReturnType<S19>, ReturnType<S20> ],
>(extractors: [S1?, S2?, S3?, S4?, S5?, S6?, S7?, S8?, S9?, S10?, S11?, S12?, S13?, S14?, S15?, S16?, S17?, S18?, S19?, S20?], selector: (...args: SelectorArgs) => Data, depth?: number | UIUpdateCompareMode)
    => (...args: SelectorArgs) => Data;

/** Create a data picker: It's like UIEffect but for data with an intermediary extractor.
 * - Give an extractor that extracts an array out of your customly defined arguments.
 * - Whenever the extracted output has changed (in shallow sense by default), the selector will be run.
 * - The arguments of the selector is the extracted array spread out, and it should return the output data solely based on them.
 * - The whole point of this abstraction, is to trigger the presumably expensive selector call only when the cheap extractor func tells there's a change. */
export const createDataPicker: CreateDataPicker = (extractor, selector, depth = 1) => {
    // Prepare.
    type Data = ReturnType<typeof selector>;
    let extracted: any[] = [];
    let data: Data = undefined;
    // Clean depth.
    depth = typeof depth === "string" ? UICompareDepthByMode[depth] : depth;
    // Return a function to do the selecting.
    return (...args: any[]): Data => {
        // Extract new extracts.
        const newExtracted = extractor(...args);
        // Check extracts have changed - if not, return old outcome.
        // .. If depth is -2 or lower, we are in "always" mode and so no need to check (we won't stop).
        if (depth >= -1 && _Lib.areEqual(newExtracted, extracted, depth as number))
            return data;
        // Got through - set new extracts, recalc and store new outcome by the selector.
        extracted = newExtracted;
        data = (selector as (...args: any[]) => Data)(...extracted);
        // Return the new data.
        return data;
    }
}

/** Create a data selector: It's like the DataPicker above, but takes in an array of extractors (not just one).
 * - Accordingly the outputs of extractors are then spread out as the arguments for the selector. */
export const createDataSelector: CreateDataSelector = (extractors, selector, depth = 1) =>
    createDataPicker((...args) => extractors.map(e => e && e(...args)), selector, depth);



// // - Testing: DataPicker - //
//
// // Prepare.
// import { UIBuildRemoteParams, UIAllContextsDataWithNull } from "../static/_Types";
// import { UIContext } from "../classes/UIContext";
// type MyAllContexts = { settings: UIContext<{ themes: { selected: "dark" | "light"; }; typescript: boolean; }> };
// type MyData = { theme: "dark" | "light"; typescript: boolean; }
//
// // It's recommended to use with automatic typing.
// // .. All we need to do is redefine createDataPicker with a more refined CreateDataPicker type.
// // .. Then all the typing can be figured out for the extractor, builder as well as when calling to get the data.
// const codeViewDataPicker =
//     (createDataPicker as CreateDataPicker<UIBuildRemoteParams<MyAllContexts>, MyData>)(
//
//     // Extractor - showcases the usage for contexts.
//     // .. For example, if has many components with similar context data needs.
//     (allData, _allContexts) => [
//         allData.settings?.themes.selected || "dark",
//         allData.settings?.typescript || false,
//     ] as const, // <-- Needs this little trick here.
//
//     // Picker.
//     (theme, typescript) => ({ theme, typescript })
//
// );
//
// // With manual typing - not recommended.
// const codeViewDataPicker_MANUAL = createDataPicker(
//
//     // Extractor - showcases the usage for contexts.
//     // .. For example, if has many components with similar context data needs.
//     (...[allData, _allContexts]: UIBuildRemoteParams<MyAllContexts>) => [
//         allData.settings?.themes.selected || "dark",
//         allData.settings?.typescript || false,
//     ] as const, // <-- Needs this little trick here.
//
//     // Builder - it will only be called if the extracted were changed.
//     (theme, typescript) => ({ theme, typescript })
// );
//
//
// // - Testing: DataSelector - //
//
// // With automatic typing (recommended) - then we can reach everything, even the params to the returned selector.
// const codeViewDataSelector = (createDataSelector as CreateDataSelector<UIBuildRemoteParams<MyAllContexts>, MyData>)(
//
//     // Extractors.
//     [
//         (allData) => allData.settings?.themes.selected || "dark",
//         (allData, _allContexts) => allData.settings?.typescript || false,
//     ],
//
//     // Selector.
//     (theme, typescript) => ({ theme, typescript })
// );
//
// // With manual typing.
// // .. One place that cannot be reached by typing is the params to the selector that's returned (so when actually used, it's not typed).
// const codeViewDataSelector_MANUAL = createDataSelector(
//
//     // Extractors.
//     [
//         (...[allData, _allContexts]: UIBuildRemoteParams<MyAllContexts>) => allData.settings?.themes.selected || "dark",
//         (allData: UIAllContextsDataWithNull<MyAllContexts>) => !!allData.settings,
//     ],
//
//     // Selector.
//     (theme, typescript): MyData => ({ theme, typescript })
// );





// // - - - - - - - - - - - - - - - - //
// // - - ALT: UIDataEffect class - - //
// // - - - - - - - - - - - - - - - - //
// //
// // .. Should be created by createDataEffect or createDataSelector functions (see below) to get better typing.
// // .. This works, but it's a bit strange - the feature is so simple, we could just use a function directly (like above).
// // .. In addition, it's needed to instance this with the creator func to get typing working - and accordingly no point in mixins, eiher.
//
// import { UIUpdateCompareMode } from "../static/_Types";
// import { UIEffect } from "./UIEffect";
//
// export type DataExtractor<P extends any[] = any[], R = any> = (...args: P) => R;
//
// /** This helps to create a fully typed UIDataEffect class instance.
//  * - However, note that you most often want to use the CreateDataSelector instead as it returns the select callback. */
// export type CreateDataEffect<Params extends any[] = any[], Data = any> = <
//     Extractor extends DataExtractor<Params>,
//     Extracted extends ReturnType<Extractor> = ReturnType<Extractor>
// >(extractor: Extractor, selector: (...args: Extracted) => Data, depth?: number | UIUpdateCompareMode)
//     => UIDataEffect<Params, Data, Extracted>;
//
// /** This helps to create a fully typed data selector using UIDataEffect.
//  * - It returns a callback that can be used for selecting (like in Redux). */
// export type CreateDataSelector<Params extends any[] = any[], Data = any> = <
//     Extractor extends DataExtractor<Params>,
//     Extracted extends ReturnType<Extractor> = ReturnType<Extractor>
// >(extractor: Extractor, selector: (...args: Extracted) => Data, depth?: number | UIUpdateCompareMode)
//     => UIDataEffect<Params, Data, Extracted>["select"];
//
// export class UIDataEffect<Params extends any[] = any[], Data = any, Extracted extends any[] = any[]> extends UIEffect<Extracted> {
//
//     /** The extractor function that builds extracted from given params. */
//     public extractor: DataExtractor<Params, Extracted>;
//     /** The function that builds the data from the spread out extracted (~ "data selector").
//      * - Note that this method is overridden for each class instance so that can be used directly without extra binds.
//      * - For this reason it's define as a property, not method. */
//     public select: (...args: Params) => Data;
//
//     // Private.
//     /** The selector output data. You shouldn't access it directly - it's the whole point of this feature to use .select. */
//     private data: Data;
//
//     // Constructor that also creates the public .select method.
//     constructor(extractor: DataExtractor<Params, Extracted>, selector: (...extracted: Extracted) => Data, depth: number | UIUpdateCompareMode = 1) {
//         // Prepare as an effect.
//         const effect = () => { this.data = selector(...this.memory); }
//         super(effect);
//         // Set depth if given.
//         if (depth !== undefined)
//             this.setDepth(depth);
//         // Set extractor.
//         this.extractor = extractor;
//         // Create the public method (as a class member property) - we do it here, so that doesn't need to be bound.
//         this.select = (...args: Params): Data => {
//             this.use(this.extractor(...args));
//             return this.data;
//         }
//     }
// }
//
// /** Function to create a UIDataEffect instance.
//  * - If you want it all pre-typed use: `createDataEffect as CreateDataEffect<Params, Data>` */
// export const createDataEffect: CreateDataEffect = (extractor, selector, depth) => new UIDataEffect(extractor, selector, depth);
//
// /** Function to create a data picker.
//  * - It creates a new UIDataEffect and returns its .select method (that needs not be bound).
//  * - If you want it all pre-typed use: `createDataSelector as CreateDataSelector<Params, Data>` */
// export const createDataSelector: CreateDataSelector = (extractor, selector, depth) => new UIDataEffect(extractor, selector, depth).select;





// // - - - - - - - - - - - - - - - - //
// // - - ALT: UIDataEffect mixin - - //
// // - - - - - - - - - - - - - - - - //
// //
// // .. As a mixin is not unfortunately that much use - mostly due to the main idea of the feature.
// // .. We really wanna create it with the func, and most often use it as a func (not class).
//
// import { ClassBaseMixer, ClassType, UIUpdateCompareMode } from "../static/_Types";
// import { UIEffect, UIEffectMixin } from "./UIEffect";
//
// export type DataExtractor<P extends any[] = any[], R = any> = (...args: P) => R;
//
// function _UIDataEffectMixin<Params extends any[] = any[], Data = any, Extracted extends any[] = any[]>(Base: ClassType<UIEffect<Extracted>>) {
//
//     return class _UIDataEffect extends UIEffectMixin(Base) { // implements UIEffect<Extracted> {
//
//         // Public.
//         public select: (...args: Params) => Data;
//         public extractor: DataExtractor<Params, Extracted>;
//
//         // Private - but in a mixin, can't do it (unless retypes).
//         /** The selector output data. You shouldn't access it directly - it's the whole point of this feature to use .select. */
//         data: Data;
//
//         // Constructor that also creates the public .select method.
//         constructor(extractor: DataExtractor<Params, Extracted>, selector: (...extracted: Extracted) => Data, depth: number | UIUpdateCompareMode = 1) {
//             // Prepare as an effect.
//             const effect = () => { this.data = selector(...this.memory); }
//             super(effect);
//             // Set depth if given.
//             if (depth !== undefined)
//                 this.setDepth(depth);
//             // Set extractor.
//             this.extractor = extractor;
//             // Set the public method - we do it here, so that doesn't need to be bound.
//             this.select = (...args: Params): Data => {
//                 this.use(this.extractor(...args));
//                 return this.data;
//             }
//         }
//
//     }
// }
//
// export class UIDataEffect<Params extends any[] = any[], Data = any, Extracted extends any[] = any[]> extends _UIDataEffectMixin(UIEffect) { }
//
// export interface UIDataEffect<Params extends any[] = any[], Data = any, Extracted extends any[] = any[]> extends UIEffect<Extracted> {
//     /** The extractor function that builds extracted from given params. */
//     extractor: DataExtractor<Params, Extracted>;
//     /** Redefine memory - it's needed for correct typing. */
//     memory: Extracted;
//     onMount: () => void;
//     /** The function that builds the data from the spread out extracted (~ "data selector").
//      * - Note that this method is overridden for each class instance so that can be used directly without extra binds.
//      * - For this reason it's define as a property, not method. */
//     select: (...args: Params) => Data;
//     // select(...args: Params): Data;
//     // /** The data of the builder. (It's private.) */
//     // data: Data;
// }
//
// export const UIDataEffectMixin = _UIDataEffectMixin as ClassBaseMixer<UIDataEffect>;
