import { Observable } from "rxjs";
import { ResizeObserver as ResizeObserverPolyfill } from "@juggle/resize-observer";

const ResizeObserver = window.ResizeObserver || ResizeObserverPolyfill;

const resizeObserver = <T extends HTMLElement>(
  element: T
): Observable<DOMRect> =>
  new Observable((subscriber) => {
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === element) {
          subscriber.next(entry.contentRect);
        }
      });
    });

    resizeObserver.observe(element, { box: "border-box" });

    return () => {
      resizeObserver.unobserve(element);
      resizeObserver.disconnect();
    };
  });

export { resizeObserver };
