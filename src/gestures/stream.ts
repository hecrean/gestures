// Import stylesheets

import {
  combineLatest,
  fromEvent,
  merge,
  Observable,
  pipe,
  race,
  zip,
  type UnaryFunction,
} from "rxjs";
import {
  filter,
  finalize,
  map,
  mergeMap,
  pairwise,
  repeat,
  scan,
  switchMap,
  takeUntil,
  takeWhile,
  tap,
} from "rxjs/operators";
import { coordinates, pointerDifference } from "./shared";

type PointerEventTag =
  | "pointerdown"
  | "pointerup"
  | "pointermove"
  | "pointercancel"
  | "pointerout"
  | "pointerleave";
type TaggedPointedEvent = { tag: PointerEventTag; ev: PointerEvent };

export type Drag = {
  tag: "drag";
  value: {
    phase: "dragging" | "pressing" | "completed";
    pointerId: number;
    currentEvent: PointerEvent;
    absoluteDelta: { dx: number; dy: number };
    relativeDelta: { dx: number; dy: number };
  };
};

export type Wheel = {
  tag: "wheel";
  value: {
    readonly dx: number;
    readonly dy: number;
  };
};

export type Tap = {
  tag: "tap";
};

export type Press = {
  tag: "press";
};

export type LongPress = {
  tag: "longpress";
};

export type Pinch = {
  tag: "pinch";
  value: {
    dz: number;
    dx: number;
    dy: number;
  };
};

export type Rotate = {
  tag: "rotate";
};

export type Pan = {
  tag: "pan";
};

type Gesture = Drag | Tap | Press | LongPress | Pinch | Rotate | Pan | Wheel;
export function gesturable(element: HTMLElement) {
  const HOLDING_PERIOD = 600; //milliseconds ;

  // only for when there is one pointer;

  const pointerdown$ = fromEvent<PointerEvent>(element, "pointerdown").pipe(
    tap((e) => e.preventDefault()),
    map((ev) => ({ tag: "pointerdown" as const, ev: ev }))
  );
  const pointermove$ = fromEvent<PointerEvent>(element, "pointermove").pipe(
    tap((e) => e.preventDefault()),
    map((ev) => ({ tag: "pointermove" as const, ev: ev }))
  );

  const pointerup$ = fromEvent<PointerEvent>(element, "pointerup").pipe(
    tap((e) => e.preventDefault()),
    map((ev) => ({ tag: "pointerup" as const, ev: ev }))
  );
  const pointercancel$ = fromEvent<PointerEvent>(element, "pointercancel").pipe(
    tap((e) => e.preventDefault()),
    map((ev) => ({ tag: "pointercancel" as const, ev: ev }))
  );
  const pointerout$ = fromEvent<PointerEvent>(element, "pointerout").pipe(
    tap((e) => e.preventDefault()),
    map((ev) => ({ tag: "pointerout" as const, ev: ev }))
  );
  const pointerleave$ = fromEvent<PointerEvent>(element, "pointerleave").pipe(
    tap((e) => {
      e.preventDefault();
      e.stopPropagation();
    }),
    map((ev) => ({ tag: "pointerleave" as const, ev: ev }))
  );

  const wheelUnit = (ev: WheelEvent) => {
    switch (ev.deltaMode) {
      // case 0x00:
      //   return ev.DOM_DELTA_PIXEL;
      // case 0x01:
      //   return ev.DOM_DELTA_LINE;
      // case 0x02:
      //   return ev.DOM_DELTA_PAGE;
      default:
        return 1;
    }
  };

  const wheel$: Observable<Wheel> = fromEvent<WheelEvent>(
    element,
    "wheel"
  ).pipe(
    map((ev) => {
      const rect = element.getBoundingClientRect();
      const unit = wheelUnit(ev);
      return {
        dy: (unit * ev.deltaY) / rect.height,
        dx: (unit * ev.deltaX) / rect.width,
      };
    }),
    // pairwise(),
    // map(([penultimate, latest]) => ({
    //   dx: latest.dx - penultimate.dx,
    //   dy: latest.dy - penultimate.dy,
    // })),
    map((v) => ({ tag: "wheel" as const, value: v }))
  );

  const cache_pointers = (
    cache: Map<number, TaggedPointedEvent>,
    value: TaggedPointedEvent
  ) => {
    switch (value.tag) {
      case "pointerdown":
        cache.set(value.ev.pointerId, value);
        return cache;
      case "pointerup":
      case "pointercancel":
      case "pointerleave":
      case "pointerout":
        cache.delete(value.ev.pointerId);
        return cache;
      case "pointermove":
        if (cache.get(value.ev.pointerId)) {
          cache.set(value.ev.pointerId, value);
        }
      default:
        return cache;
    }
  };

  const calculatePinchMagnitude = (cache: Map<number, TaggedPointedEvent>) => {
    const coords: Array<[number, number]> = Array.from(cache.entries())
      .map(([_, taggedEv]) => coordinates(element, taggedEv.ev).ndc)
      .map(({ x, y }) => [x, y]);

    const getCentroid = (arr: Array<[number, number]>): [number, number] => {
      const length = arr.length;
      const [xs, ys] = arr.reduce(
        ([x, y], curr) => [x + curr[0], y + curr[1]],
        [0, 0]
      );

      return [xs / length, ys / length];
    };

    const distance = (p1: [number, number], p2: [number, number]) =>
      Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);

    const centroid = getCentroid(coords);

    return {
      magnitude: coords.reduce((acc, curr) => distance(curr, centroid), 0),
      centroid: centroid,
    };
  };

  const pointercache$ = merge(pointerdown$, pointermove$, pointerup$).pipe(
    scan(cache_pointers, new Map<number, TaggedPointedEvent>())
  );

  const activepointernumber$ = pointercache$.pipe(
    map((v) => Array.from(v).length)
  );

  const pinch$: Observable<Pinch> = pointercache$.pipe(
    takeWhile((cache) => Array.from(cache.entries()).length >= 2),
    map(calculatePinchMagnitude),
    pairwise<{ magnitude: number; centroid: [number, number] }>(),
    map(([penulatimate, latest]) => ({
      tag: "pinch" as const,
      value: {
        dz: latest.magnitude - penulatimate.magnitude,
        dx: latest.centroid[0] - penulatimate.centroid[0],
        dy: latest.centroid[1] - penulatimate.centroid[1],
      },
    })),
    repeat()
  );

  //   const clicks$ = pointerdown$.pipe(concatMap(dragstartEvent => pointerUp$.pipe(first())
  // const holds$

  // const click$ = pointerdown$.pipe(
  //   switchMap((event) => {
  //     return race<UIEventResponse>(
  //       timer(longPressTimeout).pipe(
  //         map({
  //           type: "longPress",
  //           event
  //         })
  //       ),
  //       pointerup$.pipe(
  //         map({
  //           type: "click",
  //           event
  //         }),
  //         timeout(clickTimeout, pointerup$.pipe(map(undefined)))
  //       )
  //     );
  //   }),
  //   filter((val) => !!val)
  // );

  const dragstart$: Observable<TaggedPointedEvent> = pointerdown$;

  const drag$: Observable<Drag> = dragstart$.pipe(
    switchMap((start) =>
      pointermove$.pipe(
        filter((move) => move.ev.pointerId === start.ev.pointerId),
        pairwise<TaggedPointedEvent>(),
        map<Array<TaggedPointedEvent>, Drag>(([penultimate, latest]) => {
          const absoluteDelta = pointerDifference(element, start.ev, latest.ev);
          const relativeDelta = pointerDifference(
            element,
            latest.ev,
            penultimate.ev
          );
          const payload: Drag = {
            tag: "drag",
            value: {
              phase: "dragging",
              pointerId: latest.ev.pointerId,
              currentEvent: latest.ev,
              absoluteDelta: absoluteDelta,
              relativeDelta: relativeDelta,
            },
          };
          return payload;
        }),
        takeUntil(
          race(
            pointerup$.pipe(
              filter((up) => up.ev.pointerId === start.ev.pointerId)
            ),
            pointercancel$.pipe(
              filter((cancel) => cancel.ev.pointerId === start.ev.pointerId)
            ),
            pointerout$.pipe(
              filter((out) => out.ev.pointerId === start.ev.pointerId)
            ),
            pointerleave$.pipe(
              filter((leave) => leave.ev.pointerId === start.ev.pointerId)
            )
          )
        )
      )
    )
  );

  const pointerclickduration$ = (pointerid: number) =>
    zip(
      pointerdown$.pipe(
        filter((down) => down.ev.pointerId == pointerid),
        map(() => new Date())
      ),
      pointerup$.pipe(
        filter((up) => up.ev.pointerId == pointerid),
        map(() => new Date())
      )
    ).pipe(map(([start, end]) => Math.abs(start.getTime() - end.getTime())));

  // const dragend$: Observable<Drag> = dragstart$.pipe(
  //   switchMap((start) =>
  //     pointermove$.pipe(
  //       filter((move) => move.ev.pointerId === start.ev.pointerId),
  //       pairwise<TaggedPointedEvent>(),
  //       map<Array<TaggedPointedEvent>, Drag>(([penultimate, latest]) => {
  //         const absoluteDelta = pointerDifference(element, start.ev, latest.ev);
  //         const relativeDelta = pointerDifference(
  //           element,
  //           latest.ev,
  //           penultimate.ev
  //         );

  //         const payload: Drag = {
  //           tag: "drag",
  //           phase: "completed",
  //           pointerId: latest.ev.pointerId,
  //           currentEvent: latest.ev,
  //           absoluteDelta,
  //           relativeDelta,
  //         };
  //         return payload;
  //       }),
  //       takeUntil(pointerup$),
  //       last()
  //     )
  //   )
  // );

  const takeUntilPointerUpOrRefreshed: UnaryFunction<
    Observable<number>,
    Observable<number>
  > = pipe(
    takeUntil(pointerup$),
    takeWhile((y) => y < 110)
  );

  const reset = () => {};

  const activepointerentersregion$ = pointerdown$.pipe(
    mergeMap((_) => pointermove$),
    map((e: TaggedPointedEvent) => e.ev.clientY),
    (x) => x.pipe(takeUntilPointerUpOrRefreshed),
    finalize(reset),
    repeat()
  );

  const gestures$: Observable<Gesture> = merge(pinch$, drag$, wheel$);

  const gesture_stream = combineLatest([gestures$, activepointernumber$]);

  return gesture_stream;
  // const dragstream = combineLatest([
  //   dragstart$.pipe(
  //     tap((event) => {
  //       element.dispatchEvent(
  //         new CustomEvent<TaggedPointedEvent>("dragstart", { detail: event })
  //       );
  //     })
  //   ),
  //   dragmove$.pipe(
  //     tap((event) => {
  //       element.dispatchEvent(
  //         new CustomEvent<Drag>("dragmove", { detail: event })
  //       );
  //     })
  //   ),
  //   dragend$.pipe(
  //     tap((event) => {
  //       element.dispatchEvent(
  //         new CustomEvent<Drag>("dragend", { detail: event })
  //       );
  //     })
  //   ),
  // ]);
  // return dragstream;
}

// const dragmove$: Observable<Drag> = dragstart$.pipe(
//   switchMap((start) =>
//     pointermove$.pipe(
//       filter((move) => move.pointerId === start.pointerId),
//       scan<PointerEvent, Array<PointerEvent>>(
//         (stream, latest) => [latest, ...stream],
//         [start]
//       ),
//       filter((stream) => stream.length > 2),
//       map<Array<PointerEvent>, Drag>((stream) => {
//         const [latest, penultimate, ...tail] = stream;
//         const absoluteDelta = pointerDifference(element, start, latest);
//         const relativeDelta = pointerDifference(element, latest, penultimate);

//         const payload: Drag = {
//           tag: "drag",
//           phase: "dragging",
//           pointerId: latest.pointerId,
//           currentEvent: latest,
//           absoluteDelta,
//           relativeDelta,
//         };
//         return payload;
//       }),

//       takeUntil(
//         race(
//           pointerup$.pipe(filter((up) => up.pointerId === start.pointerId)),
//           pointercancel$.pipe(
//             filter((cancel) => cancel.pointerId === start.pointerId)
//           ),
//           pointerout$.pipe(
//             filter((out) => out.pointerId === start.pointerId)
//           ),
//           pointerleave$.pipe(
//             filter((leave) => leave.pointerId === start.pointerId)
//           )
//         )
//       )
//     )
//   )
// );
