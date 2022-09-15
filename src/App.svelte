<script lang="ts">
  import { resizeObserver } from "@/utils/resize-observer";
  import { onMount } from "svelte";
  import {
    type GestureEvent,
    type UserDragConfig,
    type UserPinchConfig,
    type UserWheelConfig,
  } from "svelte-gesture";
  import { spring } from "svelte/motion";
  import { clamp } from "three/src/math/MathUtils";
  import type { Api, ThreeState } from "./three-api";
  import { createThreeApi } from "./three-api";
  type Rect = { height: number; width: number; x: number; y: number };

  import type { DragEnd, DragMove } from "@/streams/drag";
  import { draggable } from "@/streams/drag";
  import { fromEvent } from "rxjs";

  let api: Api = createThreeApi();

  const isInit = (api: Api | undefined | null): api is Api => {
    return (api as Api)?.state()?.initialised === true;
  };

  let canvasProxyEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;

  let xyPosition = spring({ x: 0, y: 0 });
  let scale = spring(1);
  let zRotation = spring(0);

  $: if (isInit(api)) {
    api.panTo(api.state(), $xyPosition);
  }
  $: if (isInit(api)) {
    api.zoomTo(api.state(), $scale);
  }

  $: {
    console.log($xyPosition);
  }

  onMount(() => {
    api.init(canvasProxyEl, canvasEl);

    const dragStream$ = draggable(canvasProxyEl);
    const dragSubscription = dragStream$.subscribe();

    const resize$ = resizeObserver(canvasProxyEl);
    const resize_subscription = resize$.subscribe((_) => {
      if (api) fitPlaneToViewport(api.state());
    });

    const dragmove$ = fromEvent<CustomEvent<DragMove>>(
      canvasProxyEl,
      "dragmove"
    );
    const dragend$ = fromEvent<CustomEvent<DragEnd>>(canvasProxyEl, "dragend");
    const dragmove_subscription = dragmove$.subscribe(
      ({ detail: { currentEvent, dxFromStart, dyFromStart } }) => {
        xyPosition.update(({ x, y }) => ({
          x: dxFromStart,
          y: dyFromStart,
        }));
      }
    );
    const dragend_subscription = dragend$.subscribe(
      ({ detail: { currentEvent, x, y } }) => {
        xyPosition.set({ x, y });
      }
    );

    // const handler = (e: Event) => e.preventDefault();
    // document.addEventListener("gesturetart", handler);
    // document.addEventListener("gesturechanged", handler);
    // document.addEventListener("gestureend", handler);

    //animation loop
    const loop = () => {
      if (api) api.render(api.state());
      requestAnimationFrame(loop);
    };
    const frameId = requestAnimationFrame(loop);

    //cleanup
    return () => {
      resize_subscription.unsubscribe();
      dragmove_subscription.unsubscribe();
      dragSubscription.unsubscribe();
      cancelAnimationFrame(frameId);
      // document.removeEventListener("gesturetart", handler);
      // document.removeEventListener("gesturechanged", handler);
      // document.removeEventListener("gestureend", handler);
    };
  });

  const fitPlaneToViewport = (state: ThreeState) => {
    const {
      object3dHandles: { plane },
      camera,
    } = state;

    const planeSize = plane.geometry.parameters;

    const vFov = (camera.fov * Math.PI) / 180;

    const cameraZForFittingPlaneHeightInFrame =
      planeSize.height / (2 * Math.tan(0.5 * vFov));
    const cameraZForFittingPlaneWidthInFrame =
      planeSize.width / (2 * camera.aspect * Math.tan(0.5 * vFov));

    const z = Math.min(
      Math.min(
        cameraZForFittingPlaneHeightInFrame,
        cameraZForFittingPlaneWidthInFrame
      ),
      camera.position.z
    );

    xyPosition.set({ x: 0, y: 0 });
    scale.set(z);
  };

  const calculateXYPositionFromNewXY = (
    { camera, object3dHandles: { plane } }: ThreeState,
    dx: number,
    dy: number
  ) => {
    const fovy = (camera.fov * Math.PI) / 180;
    const visibleHeightAtDistance = 2 * camera.position.z * Math.tan(fovy / 2);
    const visibleWidthAtDistance = camera.aspect * visibleHeightAtDistance;
    const { width, height } = plane.geometry.parameters;

    const { x, y, z } = camera.position;

    const _x = clamp(
      ((x + dx) * visibleWidthAtDistance) / 2,
      -width / 2 + visibleWidthAtDistance / 2,
      width / 2 - visibleWidthAtDistance / 2
    );
    const _y = clamp(
      ((y + dy) * visibleHeightAtDistance) / 2,
      -height / 2 + visibleHeightAtDistance / 2,
      height / 2 - visibleHeightAtDistance / 2
    );

    return [_x, _y];
  };

  const calculateXYZPositionFromNewZ = (state: ThreeState, scale: number) => {
    const {
      camera,
      object3dHandles: { plane },
    } = state;

    const { z } = camera.position;

    const fovy = (camera.fov * Math.PI) / 180;
    const { width, height } = plane.geometry.parameters;
    const zMax = Math.min(
      width / (2 * camera.aspect * Math.tan(fovy / 2)),
      height / (2 * Math.tan(fovy / 2))
    );
    const _z = clamp(z * scale, 0.1, zMax);

    const proposedViewsquareWidth = 2 * camera.aspect * _z * Math.tan(fovy / 2);
    const proposedViewsquareHeight = 2 * _z * Math.tan(fovy / 2);

    //left
    const leftBound = -width / 2 + proposedViewsquareWidth / 2;

    //right
    const rightBound = width / 2 - proposedViewsquareWidth / 2;

    const _x =
      camera.position.x < leftBound
        ? leftBound
        : camera.position.x > rightBound
        ? rightBound
        : camera.position.x;

    //bottom
    const bottomBound = -height / 2 + proposedViewsquareHeight / 2;

    //top
    const topBound = height / 2 - proposedViewsquareHeight / 2;

    const _y =
      camera.position.y < bottomBound
        ? bottomBound
        : camera.position.y > topBound
        ? topBound
        : camera.position.y;

    return [_x, _y, _z];
  };

  const pinchConfig: UserPinchConfig = {
    // scaleBounds: { min: 0.5, max: 2 },
    // threshold: 0.2,
  };
  const dragConfig: UserDragConfig = {
    filterTaps: true,
  };

  const wheelConfig: UserWheelConfig = { axis: "y", threshold: 10 };

  function drag_handler({ detail }: CustomEvent<GestureEvent<"drag">>): void {
    const {
      delta: [dx, dy],
      offset: [ox, oy],
      movement: [mx, my],
      touches,
      buttons,
      tap,
      pinching,
      cancel,
    } = detail;

    const dragTriggerPredicate = !tap && (touches == 1 || buttons == 1);

    if (isInit(api) && dragTriggerPredicate) {
      if (pinching) {
        cancel();
      } else {
        const [x, y] = calculateXYPositionFromNewXY(
          api.state(),
          ox / api.state().renderer.domElement.width,
          oy / api.state().renderer.domElement.height
        );
        xyPosition.set({ x, y });
      }
    }
  }

  function pinch_handler({ detail }: CustomEvent<GestureEvent<"pinch">>): void {
    const {
      origin: [ox, oy],
      first,
      movement: [ms, ma],
      offset: [os, oa],
      touches,
    } = detail;

    const pinchConditionPredicate = touches >= 2 && first;

    if (isInit(api) && pinchConditionPredicate) {
      // const tx = ox - (domRect.x - domRect.width / 2);
      // const ty = oy - (domRect.y + domRect.height / 2);

      // const _x = $xyPosition.x - (ms - 1) * tx;
      // const _y = $xyPosition.y - (ms - 1) * ty;

      const [x, y, z] = calculateXYZPositionFromNewZ(api.state(), os);
      xyPosition.set({ x: x, y: y });
      scale.set(z);
      zRotation.set((-oa * Math.PI) / 180);
    }
  }

  function wheel_handler({ detail }: CustomEvent<GestureEvent<"wheel">>): void {
    const { touches } = detail;

    if (touches == 0) {
      // zoom.set(scale);
    }
  }
</script>

<div
  bind:this={canvasProxyEl}
  class="canvas-proxy"
  class:draggable={true}
  tabindex="-1"
>
  <canvas bind:this={canvasEl} />
  <div class:overlay={true}>
    <label>
      <h3>stiffness ({xyPosition.stiffness})</h3>
      <input
        bind:value={xyPosition.stiffness}
        type="range"
        min="0"
        max="1"
        step="0.01"
      />
    </label>

    <label>
      <h3>damping ({xyPosition.damping})</h3>
      <input
        bind:value={xyPosition.damping}
        type="range"
        min="0"
        max="1"
        step="0.01"
      />
    </label>
  </div>
</div>

<style>
  .canvas-proxy {
    width: 100%;
    height: 100%;
    position: relative;
  }
  .overlay {
    position: absolute;
    right: 1em;
    z-index: 10;
  }
  canvas {
    background-color: grey;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 100%;
  }
  .draggable {
    -webkit-touch-callout: none;
    -ms-touch-action: none;
    touch-action: none;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
    cursor: grab;
  }
  .square {
    position: absolute;
    height: 80px;
    width: 80px;
    border-radius: 8px;
    background-color: hotpink;
    font-size: 10px;
  }

  .square:focus {
    border: 2px solid red;
  }
</style>
