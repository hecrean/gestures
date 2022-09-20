<script lang="ts">
  import { gesturable } from "@/gestures/stream";
  import { resizeObserver } from "@/utils/resize-observer";
  import { onMount } from "svelte";
  import type { Api, ThreeState } from "./three-api";
  import { createThreeApi, xyzPosition } from "./three-api";
  import { $D as debug$ } from "rxjs-debug";
  import { clamp } from "three/src/math/MathUtils";

  let api: Api = createThreeApi();

  const isInit = (api: Api | undefined | null): api is Api => {
    return (api as Api)?.state()?.initialised === true;
  };

  let canvasProxyEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;

  $: if (isInit(api)) {
    api.panTo({ x: $xyzPosition.x, y: $xyzPosition.y });
  }
  $: if (isInit(api)) {
    api.zoomTo($xyzPosition.z);
  }

  const updateXYPosition = (
    { camera, object3dHandles: { plane } }: ThreeState,
    { dx, dy }: { dx: number; dy: number }
  ) =>
    xyzPosition.update(({ x, y, z }) => {
      const fovy = (camera.fov * Math.PI) / 180;

      const visibleHeightAtDistance = 2 * z * Math.tan(fovy / 2);

      const visibleWidthAtDistance = camera.aspect * visibleHeightAtDistance;

      const { width, height } = plane.geometry.parameters;

      const position = {
        x: clamp(
          x + dx,
          -width / 2 + visibleWidthAtDistance / 2,
          width / 2 - visibleWidthAtDistance / 2
        ),
        y: clamp(
          y + dy,
          -height / 2 + visibleHeightAtDistance / 2,
          height / 2 - visibleHeightAtDistance / 2
        ),
        z: z,
      };

      return position;
    });

  const updateZoom = (
    { camera, object3dHandles: { plane } }: ThreeState,
    dz: number
  ) => {
    xyzPosition.update(({ x, y, z }) => {
      const fovy = (camera.fov * Math.PI) / 180;
      const { width, height } = plane.geometry.parameters;

      const zMax = Math.min(
        width / (2 * camera.aspect * Math.tan(fovy / 2)),
        height / (2 * Math.tan(fovy / 2))
      );

      const _z = clamp(z + dz, 0.1, zMax);

      const proposedViewsquareWidth =
        2 * camera.aspect * _z * Math.tan(fovy / 2);
      const proposedViewsquareHeight = 2 * _z * Math.tan(fovy / 2);

      const bounds = {
        left: -width / 2 + proposedViewsquareWidth / 2,
        right: width / 2 - proposedViewsquareWidth / 2,
        bottom: -height / 2 + proposedViewsquareHeight / 2,
        top: height / 2 - proposedViewsquareHeight / 2,
      };

      const _x =
        x < bounds.left ? bounds.left : x > bounds.right ? bounds.right : x;

      const _y =
        y < bounds.bottom ? bounds.bottom : y > bounds.top ? bounds.top : y;

      const position = {
        x: _x,
        y: _y,
        z: _z,
      };
      return position;
    });
  };

  onMount(() => {
    api.init(canvasProxyEl, canvasEl);

    const resize$ = resizeObserver(canvasProxyEl);

    const resize_subscription = resize$.subscribe((_) => {
      if (api) api.fitPlaneToViewport();
    });

    const gestures$ = gesturable(canvasProxyEl);

    const debugGestures$ = debug$(gestures$, { id: "gestures" });
    debugGestures$.subscribe();

    const gestures_subscription = gestures$.subscribe(
      ([gesture, active_pointers]) => {
        const wheelPredicate = true;
        const dragPredicate = active_pointers == 1;
        const pinchPredicate = active_pointers >= 2;

        switch (gesture.tag) {
          case "drag":
            if (dragPredicate) {
              updateXYPosition(api.state(), {
                dx: -gesture.value.relativeDelta.dx,
                dy: -gesture.value.relativeDelta.dy,
              });
            }
            break;
          case "pinch":
            if (pinchPredicate) {
              updateZoom(api.state(), -gesture.value.dz);
              updateXYPosition(api.state(), {
                dx: -gesture.value.dx,
                dy: -gesture.value.dy,
              });
            }
            break;
          case "wheel":
            if (wheelPredicate) {
              updateZoom(api.state(), gesture.value.dy);
            }
          default:
            break;
        }
      }
    );

    //animation loop
    const loop = () => {
      if (api) api.render();
      requestAnimationFrame(loop);
    };
    const frameId = requestAnimationFrame(loop);

    //cleanup
    return () => {
      resize_subscription.unsubscribe();
      gestures_subscription.unsubscribe();

      cancelAnimationFrame(frameId);
    };
  });
</script>

<div
  bind:this={canvasProxyEl}
  class="canvas-proxy"
  class:draggable={true}
  tabindex="-1"
>
  <canvas bind:this={canvasEl} />
  <div class="overlay" />
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
