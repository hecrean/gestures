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

export const pointerDifference = (
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
