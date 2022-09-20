import { getProject, types, type IProjectConfig } from "@theatre/core";
import { spring } from "svelte/motion";
import {
  AmbientLight,
  Color,
  Fog,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from "three";
import projectState from "./state.json";

// studio.initialize();

const state: IProjectConfig = { state: projectState };
// Create a project for the animation
// const project = getProject("THREE.js x Theatre.js");
const project = getProject("THREE.js x Theatre.js", state);
const sheet = project.sheet("Animated scene");

// Global Variables :
export let xyPosition = spring({ x: 0, y: 0 });
export let scale = spring(1);
export let zRotation = spring(0);

type Object3dHandles = {
  ambientLight: AmbientLight;
  plane: Mesh<PlaneGeometry, MeshStandardMaterial>;
};
type ResourceHandles = {};

export type ThreeState = {
  initialised: boolean;
  object3dHandles: Object3dHandles;
  resourceHandles: ResourceHandles;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  scene: Scene;
  mouse: Vector2;
  resolution: Vector2;
  canvasProxyEl: HTMLDivElement;
};

const createThreeApi = () => {
  let state: ThreeState;

  return {
    state: () => state,
    init: (canvasProxyEl: HTMLDivElement, canvasEl: HTMLCanvasElement) => {
      // scenes :
      const scene = new Scene();
      scene.fog = new Fog(0x000000, 1, 1000);

      //render targets, planes,
      const canvasWidth = canvasEl.clientWidth;
      const canvasHeight = canvasEl.clientHeight;
      const aspect = canvasWidth / canvasHeight;
      const resolution = new Vector2(canvasWidth, canvasHeight);
      const mouse = new Vector2();

      const fov = 50;
      const near = 0.1;
      const far = 50;
      const camera = new PerspectiveCamera(fov, aspect, near, far);

      const renderer = new WebGLRenderer({
        antialias: true,
        canvas: canvasEl,
      });

      const dpr = window?.devicePixelRatio || 1;
      renderer.setPixelRatio(dpr);

      const ambientLight = new AmbientLight(new Color("white"), 1);

      const textureLoader = new TextureLoader();

      const plane = new Mesh(
        new PlaneGeometry(1, 1),
        new MeshStandardMaterial({
          color: new Color("red"),
          map: textureLoader.load("./baseline.jpg"),
        })
      );

      // Create a Theatre.js object with the props you want to
      // animate
      const planeproxy = sheet.object("Plane ", {
        // Note that the rotation is in radians
        // (full rotation: 2 * Math.PI)
        rotation: types.compound({
          x: types.number(plane.rotation.x, { range: [-2, 2] }),
          y: types.number(plane.rotation.y, { range: [-2, 2] }),
          z: types.number(plane.rotation.z, { range: [-2, 2] }),
        }),
      });

      planeproxy.onValuesChange((values) => {
        const { x, y, z } = values.rotation;

        plane.rotation.set(x * Math.PI, y * Math.PI, z * Math.PI);
      });

      camera.position.set(0, 0, 2);

      camera.lookAt(plane.position);

      scene.add(ambientLight, plane);

      state = {
        initialised: true,
        object3dHandles: {
          ambientLight,
          plane,
        },
        resourceHandles: {},

        renderer: renderer,
        camera: camera,
        scene: scene,

        mouse: mouse,
        resolution: resolution,
        canvasProxyEl: canvasProxyEl,
      };
    },

    render: () => {
      const { renderer, canvasProxyEl, camera, scene, mouse, resolution } =
        state;

      const canvas = renderer.domElement;

      const needResize =
        Math.round(canvasProxyEl.clientHeight) !== Math.round(canvas.height) ||
        Math.round(canvasProxyEl.clientWidth) !== Math.round(canvas.width);

      if (needResize) {
        const aspect = canvasProxyEl.clientWidth / canvasProxyEl.clientHeight;
        camera.aspect = aspect;
        renderer.setSize(canvasProxyEl.clientWidth, canvasProxyEl.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);
    },
    resize: (state: ThreeState, w: number, h: number) => {
      const { camera, renderer } = state;

      const aspect = w / h;
      camera.aspect = aspect;
      renderer.setSize(w, h, false);
      camera.updateProjectionMatrix();
    },
    zoomTo: (z: number) => state.camera.position.setZ(z),
    panTo: ({ x, y }: { x: number; y: number }) =>
      state.camera.position.set(x, y, state.camera.position.z),
    fitPlaneToViewport: (): void => {
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
    },

    //https://dev.to/mstn/tap-ts-type-safe-eavesdropping-2jfp
  };
};
export type Api = ReturnType<typeof createThreeApi>;
export { createThreeApi };
