<script lang="ts">
  import { gesturable } from "@/gestures/stream";
  import { resizeObserver } from "@/utils/resize-observer";
  import { onMount } from "svelte";
  import type { Api } from "./three-api";
  import { createThreeApi, scale, xyPosition } from "./three-api";

  let api: Api = createThreeApi();

  const isInit = (api: Api | undefined | null): api is Api => {
    return (api as Api)?.state()?.initialised === true;
  };

  let canvasProxyEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;

  $: if (isInit(api)) {
    api.panTo($xyPosition);
  }
  $: if (isInit(api)) {
    api.zoomTo($scale);
  }

  onMount(() => {
    api.init(canvasProxyEl, canvasEl);

    const resize$ = resizeObserver(canvasProxyEl);

    const resize_subscription = resize$.subscribe((_) => {
      if (api) api.fitPlaneToViewport();
    });

    const gestures$ = gesturable(canvasProxyEl);

    const gestures_subscription = gestures$.subscribe(
      ([gesture, active_pointers]) => {
        console.log(gesture.tag);
        const wheelPredicate = true;
        const dragPredicate = active_pointers == 1;
        const pinchPredicate = active_pointers >= 2;

        switch (gesture.tag) {
          case "drag":
            if (dragPredicate) {
              xyPosition.update(({ x, y }) => ({
                x: x - gesture.value.relativeDelta.dx,
                y: y - gesture.value.relativeDelta.dy,
              }));
            }
            break;
          case "pinch":
            if (pinchPredicate) {
              scale.update((s) => s - gesture.value.dz);
              console.log(gesture.value.dx);
              xyPosition.update(({ x, y }) => ({
                x: x - gesture.value.dx,
                y: y - gesture.value.dy,
              }));
            }
            break;
          case "wheel":
            if (wheelPredicate) {
              scale.update((s) => s - gesture.value.dy);
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
  <div class:overlay={true} />
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
