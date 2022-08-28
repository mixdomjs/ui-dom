

// - Imports - //

import { UIDefTarget } from "../static/_Types";

export class UIContentApi {

    /** If sets, overrides the temporary childrenNeeded value. */
    public childrenNeeds?: boolean | "temp";

    constructor(readChildren?: ((shallowCopy?: boolean) => UIDefTarget[] | null) | null) {
        if (readChildren)
            this.readChildren = readChildren;
    }

    /** This should be assigned by the boundary and read the children directly. */
    private readChildren(_shallowCopy?: boolean): UIDefTarget[] | null { return null; }

    /** Get the actual contentPass childDefs. If used will mark needsChildren temporarily (until next render).
     *   .. When used, reads the children from the content pass.
     *   .. Also marks that the function "needs children", so will be re-rendered if children change.
     * - Note that for just passing the content, always use uiDom.Content.
     *   .. Only use .getChildren() if you really need it. For example, to wrap each individually or read info from their defs.
     */
    public getChildren(skipNeeds: boolean = false, shallowCopy: boolean = false): Readonly<UIDefTarget[]> | null {
        // Mark that was needed.
        if (!skipNeeds && typeof this.childrenNeeds !== "boolean")
            this.childrenNeeds = "temp";
        // Return copied child defs.
        return this.readChildren(shallowCopy);
    }

    /** Define for the remaining lifecycle if should update when content closure updates.
     * If null falls back to the .getChildren() based approach. */
    public needsChildren(needs?: boolean | "temp" | null): void {
        needs == null ? delete this.childrenNeeds : this.childrenNeeds = needs;
    }
}
