<script lang="ts">
  import type { DragEnd, DragMove } from "@/streams/drag";
  import { draggable } from "@/streams/drag";
  import { resizeObserver } from "@/utils/resize-observer";
  import { fromEvent } from "rxjs";
  import { onMount } from "svelte";
  import { spring } from "svelte/motion";
  import type { Api, ThreeState } from "./three-api";
  import { createThreeApi } from "./three-api";

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
      ({ detail: { currentEvent, dxFromStart, dyFromStart } }) => {
        xyPosition.update(({ x, y }) => ({
          x: dxFromStart,
          y: dyFromStart,
        }));
      }
    );

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
      dragend_subscription.unsubscribe();
      cancelAnimationFrame(frameId);
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
