import * as h3 from 'h3-js';

export function getH3CellForCoord(lat: number, lng: number, res = 7): string {
  return h3.latLngToCell(lat, lng, res);
}

export function getH3BoundaryCoordinates(h3Index: string): [number, number][] {
  try {
    const boundary = h3.cellToBoundary(h3Index);
    // h3.cellToBoundary returns [[lat, lng], [lat, lng], ...]
    // Deck.gl PolygonLayer and GeoJSON expect [[lng, lat], [lng, lat], ...]
    return boundary.map(([lat, lng]) => [lng, lat]);
  } catch (err) {
    console.error(`Error calculating boundary for ${h3Index}:`, err);
    return [];
  }
}

export function getH3Center(h3Index: string): [number, number] {
  try {
    return h3.cellToLatLng(h3Index);
  } catch {
    return [0, 0];
  }
}

export function getAdjacentH3Cells(h3Index: string, kRing = 1): string[] {
  try {
    // gridDisk returns the origin cell plus all neighbors within k distance
    return h3.gridDisk ? h3.gridDisk(h3Index, kRing) : [h3Index];
  } catch {
    return [h3Index];
  }
}
