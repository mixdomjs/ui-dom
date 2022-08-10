

// - Imports - //

import {
    Dictionary,
    UIDefTarget,
    UIGenericProps,
    UISpreadFunction,
} from "../static/_Types";
import { _Defs } from "../static/_Defs";

export type UISpreadProps<Props extends Dictionary = {}> = UIGenericProps<Props>;
export class UISpread<Props extends Dictionary = {}> {
    public static UI_DOM_TYPE = "Spread";
    constructor(_props?: Props | null) { }
    /** The renderer function to spread out the contents. */
    static render: UISpreadFunction;
    /** The function to unfold the contents. Will be overridden by createSpread procedure. */
    static unfold(_props: Dictionary, _childDefs: UIDefTarget[]): UIDefTarget | null { return null; }
    /** The universal method to unfold the spread. (The others are static too but based on an extending class.)
     * The contents are the cleaned childDefs that should replace any content pass. */
    static unfoldWith(targetDef: UIDefTarget, contents: UIDefTarget[], keyScope: any): UIDefTarget | null {
        // Prepare to loop.
        let toLoop: [UIDefTarget, UIDefTarget | null ][] = [ [ targetDef, null ] ];
        let info: [UIDefTarget, UIDefTarget | null] | undefined;
        let hasTruePass = false;
        let iMain = 0;
        while (info = toLoop[iMain]) {
            // Next.
            iMain++;
            // Parse.
            let thisDef = info[0];
            const pDef = info[1];
            // Handle children dependent.
            if (thisDef._uiDefType === "fragment" && thisDef.props && thisDef.props.needsChildren) {
                const { props, ...newDef } = thisDef;
                if (!contents.length)
                    newDef.childDefs = [];
                pDef ? pDef.childDefs[pDef.childDefs.indexOf(thisDef)] = newDef : targetDef = newDef;
                thisDef = newDef;
            }
            // Assign key scope.
            thisDef.keyScope = keyScope;
            // Replace content pass.
            if (thisDef._uiDefType === "pass") {
                // Replace.
                // .. If there's no parent, the spread directly rendered a content pass as root.
                // .. In that case, we just replace the original targetDef with our contents.
                const newDef: UIDefTarget = { _uiDefType: "fragment", tag: null, childDefs: [...contents] };
                if (thisDef.key !== null)
                    newDef.key = thisDef.key;
                pDef ? pDef.childDefs[pDef.childDefs.indexOf(thisDef)] = newDef : targetDef = newDef;
                // Mark copy.
                // .. We shall put keyScope to something else than the original scope (or our keyScope here).
                // .. Note that we do not spread open any content pass inside our original contents. Instead, we just leave them as they are.
                // .. Note also that we do this only for the copy: for the true pass, we want
                if (hasTruePass || thisDef.contentPassType === "copy") {
                    // Prepare to loop all inside.
                    const copyScope = thisDef.key != null ? thisDef.key : null;
                    let copyLoop: UIDefTarget[] = [ newDef ];
                    let cParentDef: UIDefTarget | undefined;
                    let iSub = 0;
                    while (cParentDef = copyLoop[iSub]) {
                        // Next.
                        iSub++;
                        // If has kids.
                        if (cParentDef.childDefs[0]) {
                            let iKid = 0;
                            // Replace each kid.
                            for (const kid of cParentDef.childDefs) {
                                // Replace with a new.
                                const newKid = (kid._uiDefType === "pass" ? kid : { ...kid, childDefs: [...kid.childDefs], keyScope: copyScope }) as UIDefTarget;
                                cParentDef.childDefs[iKid] = newKid;
                                // Next.
                                iKid++;
                            }
                            // Add to loop.
                            copyLoop = cParentDef.childDefs.concat(copyLoop.slice(iSub));
                            iSub = 0;
                        }
                    }
                }
                // Is true pass, mark that we found it.
                else
                    hasTruePass = true;
            }
            // Add kids.
            else if (thisDef.childDefs[0]) {
                const newLoop: typeof toLoop = [];
                for (const kid of thisDef.childDefs)
                    newLoop.push([kid as UIDefTarget, thisDef]);
                toLoop = newLoop.concat(toLoop.slice(iMain));
                iMain = 0;
            }
        }
        // Return target - we might have modified it.
        return targetDef;
    }
}
/** UISpread is a totally static functionality. */
export interface UISpread {}
export type UISpreadType<Props extends Dictionary = {}> = {
    readonly UI_DOM_TYPE: "Spread";
	new (_props?: Props | null): UISpread<Props>;
    /** The renderer function to spread out the contents. */
    render: UISpreadFunction;
    /** The function to unfold the contents. Will be overridden by createSpread procedure. */
    unfold(_props: Dictionary, _childDefs: UIDefTarget[]): UIDefTarget | null;
    /** The universal method to unfold the spread. (The others are static too but based on an extending class.)
     * The contents are the cleaned childDefs that should replace any content pass. */
    unfoldWith(targetDef: UIDefTarget, contents: UIDefTarget[], keyScope: any): UIDefTarget | null;
}
export const createSpread = <Props extends Dictionary = {}>(func: UISpreadFunction<Props>) => class _UISpread extends UISpread<Props> {
    static render = func;
    /** The unfold method unique to this particular UISpread extended class. */
    static unfold(props: Props, childDefs: UIDefTarget[]): UIDefTarget | null {
        // Render the static function to get spread defs.
        let subDef = _Defs.createDefFromContent( _UISpread.render(props) );
        if (subDef) {
            // Apply keyScope and contents to passes.
            const keyScope = subDef.key == null ? _UISpread : subDef.key;
            subDef = _UISpread.unfoldWith(subDef, childDefs, keyScope);
        }
        return subDef;
    }
};
