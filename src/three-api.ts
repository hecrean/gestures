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

    render: (state: ThreeState) => {
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
    zoomTo: ({ camera }: ThreeState, z: number) => camera.position.setZ(z),
    panTo: ({ camera }: ThreeState, { x, y }: { x: number; y: number }) =>
      camera.position.set(x, y, camera.position.z),

    //https://dev.to/mstn/tap-ts-type-safe-eavesdropping-2jfp
  };
};
export type Api = ReturnType<typeof createThreeApi>;
export { createThreeApi };
