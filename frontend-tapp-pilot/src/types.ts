
export interface ChartLineItem {
  name?: string,
  color?: string,
  data: { x: number, y: number }[],
}

export interface PathItem {
  timestamp: number,
  path: number[][],
}