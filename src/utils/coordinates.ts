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
