

// - Imports - //

import { ClassBaseMixer, ClassType, UIUpdateCompareMode } from "../static/_Types";
import { _Lib } from "../static/_Lib";


// - UIEffect (stand alone) - //

/** Effect to run when memory has changed (according to the comparison mode).
 * - If returns a new effect function, it will be run when unmounting the effect. */
export type UIEffectOnMount = () => void | UIEffectOnUnmount;
export type UIEffectOnUnmount = () => void;
function _UIEffectMixin<Memory = any>(Base: ClassType) {

    return class _UIEffect extends Base {

        public static UI_DOM_TYPE = "Effect";

        /** For quick getting modes to depth.
         * - Positive values can go however deep.
         * - Note that -1 means deep, but below -2 means will not check. */
        static DEPTH_BY_MODE = {
            always: -2,
            deep: -1,
            changed: 0,
            shallow: 1,
            double: 2,
        };

        memory: Memory;
        onMount: UIEffectOnMount | null;
        onUnmount: UIEffectOnUnmount | null;
        depth: number | UIUpdateCompareMode;

        constructor(effect?: UIEffectOnMount, memory?: Memory, ...baseParams: any[]) {
            super(...baseParams);
            this.memory = memory as Memory;
            this.onMount = effect || null;
            this.onUnmount = null;
            this.depth = 1;
        }

        public reset(effect: UIEffectOnMount | null, memory: Memory, forceRun: boolean = false): boolean {
            return this.useWith(forceRun ? "always" : this.depth, memory, effect);
        }

        public use(memory: Memory, forceRun: boolean = false, newEffectIfChanged?: UIEffectOnMount | null): boolean {
            return this.useWith(forceRun ? "always" : this.depth, memory, newEffectIfChanged);
        }

        public useWith(depth: number | UIUpdateCompareMode, memory: Memory, newEffectIfChanged?: UIEffectOnMount | null): boolean {
            // Get and store.
            const memWas = this.memory;
            this.memory = memory;
            // Get depth.
            depth = typeof depth === "string" ? UIEffect.DEPTH_BY_MODE[depth] : depth;
            // No change.
            if (depth > -2 && _Lib.areEqual(memWas, memory, depth))
                return false;
            // Update effect.
            if (newEffectIfChanged !== undefined) {
                if (this.onUnmount)
                    this.onUnmount();
                this.onUnmount = null;
                this.onMount = newEffectIfChanged;
            }
            // Run effect.
            if (this.onMount)
                this.onUnmount = this.onMount() || null;
            // Did not change in given mode.
            return false;
        }

        /** Cancel effect. */
        public cancel(skipUnmount: boolean = false, clearEffect: boolean = false): void {
            // Run unmount.
            if (!skipUnmount && this.onUnmount)
                this.onUnmount();
            // Clear.
            if (clearEffect) {
                this.onMount = null;
                this.onUnmount = null;
            }
        }
    }
}
export interface UIEffect<Memory = any> {

    /** The last store memory. */
    memory: Memory;
    /** The effect to run, when has changed.
     * - If returns a function, will replace the effect after (for the next time). */
    onMount: UIEffectOnMount | null;
    /** This is automatically assigned by the return value of the onMount - if doesn't return a func, will assing to null. */
    onUnmount: UIEffectOnUnmount | null;

    /** Comparison mode to be used by default. (Defaults to 1, which is the same as "shallow".) */
    depth: number | UIUpdateCompareMode;

    /** Alias for .use, that requires a function. (Do not use this, if you can reuse a function.)
     * - Note that if you can reuse a function all the time, you should.
     * .. There's no point declaring a new one every time in vain.
     * - Note that you can also call .update(mem), and if it returns true, then do your effect inline.  */
    reset(effect: (() => void) | null, memory: Memory, forceRun?: boolean): boolean;

    /** Alias for .useWith with default depth.
     * - Stores the memory and performs a shallow check against previous and returns true if changed.
     * - If newEffectIfChanged is not undefined, overrides the effect (only if was changed) right before calling the effect.
     * - Note that you don't need to have an effect assigned at all: you can also use the returned boolean and run your "effect" inline. */
    use(memory: Memory, forceRun?: boolean, newEffectIfChanged?: (() => void) | null): boolean;

    /** The main method.
     * - Stores the memory and performs a shallow check against previous and returns true if changed.
     * - If -1 depth, performs fully deep search. If depth <= -2, then is in "always" mode (doesn't even check).
     * - If newEffectIfChanged is not undefined, overrides the effect (only if was changed) right before calling the effect.
     * - Note that you don't need to have an effect at all. You can use the return value and run your "effect" inline as well. */
    useWith(depth: number | UIUpdateCompareMode, memory: Memory, newEffectIfChanged?: (() => void) | null): boolean;

    /** Cancel effect. */
    cancel(skipUnmount?: boolean, clearEffect?: boolean): void;

}
export class UIEffect<Memory = any> extends _UIEffectMixin(Object) {}
export const createEffect = <Memory = any>(effect?: UIEffectOnUnmount, memory?: Memory) => new UIEffect<Memory>(effect, memory);

/** There are two ways you can use this:
 * 1. Call this to give basic UIEffect features.
 *      * For example: `class MyMix extends UIEffectMixin(MyBase) {}`
 * 2. If you want to define Memory, use this simple trick instead:
 *      * For example: `class MyMix extends (UIEffectMixin as ClassBaseMixer<UIEffect<MyMemory>>)(MyBase) {}`
 */
export const UIEffectMixin = _UIEffectMixin as ClassBaseMixer<UIEffect>;
