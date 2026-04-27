import { getWorldViewport } from './canvasState';

export function getAnnotationCaptureRect({ dims, scale, stagePos }: any) {
  return getWorldViewport({ dims, scale, stagePos });
}

export function getRectShapeFromPoints(points: number[] = []) {
  const [x1 = 0, y1 = 0, x2 = x1, y2 = y1] = points;

  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}
