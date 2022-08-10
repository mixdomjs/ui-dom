
import { uiDom } from "./uiDom";

window.UIDom = uiDom;

declare global {
    interface Window {
        UIDom: typeof uiDom;
    }
}
