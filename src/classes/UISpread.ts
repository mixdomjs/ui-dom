

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
     * - The contents are the cleaned childDefs that should replace any content pass.
     * - Wrapped in a fragment that provides scoping detection. */
    static unfoldWith(targetDef: UIDefTarget, contents: UIDefTarget[]): UIDefTarget | null {
        // We wrap everything in a fragment def marked with isSpread.
        const baseDef: UIDefTarget = { _uiDefType: "fragment", childDefs: [ targetDef ], scopeType: "spread", tag: null };
        // Prepare to loop.
        let toLoop: [UIDefTarget, UIDefTarget ][] = [ [ targetDef, baseDef ] ];
        let info: [UIDefTarget, UIDefTarget] | undefined;
        let hasTruePass = false;
        let iMain = 0;
        while (info = toLoop[iMain]) {
            // Next.
            iMain++;
            // Parse.
            let thisDef = info[0];
            const pDef = info[1];
            // Handle children dependent.
            if (thisDef._uiDefType === "fragment" && thisDef.withContent) {
                const newDef = { ...thisDef };
                delete newDef.withContent; // We already handled it here on the static def side - must not be handled again.
                if (!contents.length)
                    newDef.childDefs = [];
                pDef.childDefs[pDef.childDefs.indexOf(thisDef)] = newDef;
                thisDef = newDef;
            }
            // Replace content pass.
            if (thisDef._uiDefType === "pass") {
                // Create new, and add key.
                const newDef: UIDefTarget = { _uiDefType: "fragment", tag: null, childDefs: [...contents] };
                if (thisDef.key != null)
                    newDef.key = thisDef.key;
                // Mark copy - or that has true pass now.
                if (hasTruePass || thisDef.contentPassType === "copy")
                    newDef.scopeType = "spread-copy";
                else {
                    newDef.scopeType = "spread-pass";
                    hasTruePass = true;
                }
                // Replace in parent.
                pDef.childDefs[pDef.childDefs.indexOf(thisDef)] = newDef;
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
        return baseDef;
    }
}
/** UISpread is a totally static functionality. */
export interface UISpread {}
export const createSpread = <Props extends Dictionary = {}>(func: UISpreadFunction<Props>) => class _UISpread extends UISpread<Props> {
    static render = func;
    /** The unfold method unique to this particular UISpread extended class. */
    static unfold(props: Props, childDefs: UIDefTarget[]): UIDefTarget | null {
        // Render the static function to get spread defs.
        const subDef = _Defs.createDefFromContent( _UISpread.render(props) );
        return subDef && _UISpread.unfoldWith(subDef, childDefs);
    }
};
