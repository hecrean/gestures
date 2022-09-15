import type { Action } from "./shared";

export type WheelDetail = {
  dx: number;
  dy: number;
  ctrlKey: boolean;
};

export const wheeling: Action = (node) => {
  function handle_wheel(event: WheelEvent) {
    node.dispatchEvent(
      new CustomEvent<WheelDetail>("wheeling", {
        detail: {
          dx: event.deltaX,
          dy: event.deltaY,
          ctrlKey: event.ctrlKey,
        },
      })
    );
  }

  node.addEventListener("wheel", handle_wheel, { passive: false });

  return {
    update(newDuration) {},
    destroy() {
      node.removeEventListener("wheel", handle_wheel, { passive: false });
    },
  };
};
