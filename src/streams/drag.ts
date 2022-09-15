// Import stylesheets

import { combineLatest, fromEvent } from "rxjs";
import { filter, last, map, switchMap, takeUntil, tap } from "rxjs/operators";

export type DragMove = {
  pointerId: number;
  currentEvent: PointerEvent;
  dxFromStart: number;
  dyFromStart: number;
};
export type DragEnd = {
  pointerId: number;
  currentEvent: PointerEvent;
  dxFromStart: number;
  dyFromStart: number;
};

export const coordinates = (element: HTMLElement, ev: PointerEvent) => {
  const rect = element.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;

  return {
    ndc: {
      x: (x / rect.width) * 2 - 1,
      y: (y / rect.height) * -2 + 1,
    },
    pixel: {
      x: x,
      y: y,
    },
  };
};

const pointerDifference = (
  element: HTMLElement,
  pointer1: PointerEvent,
  pointer2: PointerEvent
) => {
  const pointer1Coords = coordinates(element, pointer1);
  const pointer2Coords = coordinates(element, pointer2);

  return {
    dx: pointer1Coords.ndc.x - pointer2Coords.ndc.x,
    dy: pointer1Coords.ndc.y - pointer2Coords.ndc.y,
  };
};

export function draggable(element: HTMLElement) {
  const HOLDING_PERIOD = 600; //milliseconds ;

  // only for when there is one pointer;

  const pointerDown$ = fromEvent<PointerEvent>(element, "pointerdown");
  const pointerMove$ = fromEvent<PointerEvent>(element, "pointermove");

  const pointerup$ = fromEvent<PointerEvent>(element, "pointerup");
  const pointercancel$ = fromEvent<PointerEvent>(element, "pointercancel");
  const pointerout$ = fromEvent<PointerEvent>(element, "pointerout");
  const pointerleave$ = fromEvent<PointerEvent>(element, "pointerleave");

  const pointerRemoved$ = combineLatest([
    pointerup$,
    pointercancel$,
    pointerout$,
    pointerleave$,
  ]);

  //   const clicks$ = pointerDown$.pipe(concatMap(dragStartEvent => pointerUp$.pipe(first())

  // const holds$

  const dragStart$ = pointerDown$;

  const dragMove$ = dragStart$.pipe(
    switchMap((start) =>
      pointerMove$.pipe(
        filter((move) => move.pointerId === start.pointerId),
        // scan((accum, item) => {}, [0,0]),
        map((moveEvent) => {
          const delta = pointerDifference(element, start, moveEvent);
          return {
            pointerId: moveEvent.pointerId,
            currentEvent: moveEvent,
            dxFromStart: delta.dx,
            dyFromStart: delta.dy,
          };
        }),
        takeUntil(pointerup$)
      )
    )
  );

  const dragEnd$ = dragStart$.pipe(
    switchMap((start) =>
      pointerMove$.pipe(
        map((moveEvent) => {
          const delta = pointerDifference(element, start, moveEvent);
          return {
            pointerId: moveEvent.pointerId,
            currentEvent: moveEvent,
            dxFromStart: delta.dx,
            dyFromStart: delta.dy,
          };
        }),
        takeUntil(pointerup$),
        last()
      )
    )
  );

  const dragStream = combineLatest([
    dragStart$.pipe(
      tap((event) => {
        element.dispatchEvent(
          new CustomEvent<PointerEvent>("dragstart", { detail: event })
        );
      })
    ),
    dragMove$.pipe(
      tap((event) => {
        element.dispatchEvent(
          new CustomEvent<DragMove>("dragmove", { detail: event })
        );
      })
    ),
    dragEnd$.pipe(
      tap((event) => {
        element.dispatchEvent(
          new CustomEvent<DragEnd>("dragend", { detail: event })
        );
      })
    ),
  ]);
  return dragStream;
}
