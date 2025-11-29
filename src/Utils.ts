import { isLand, isOcean, isShore } from "./TerrainBytes.ts";

export interface Coord {
    x: number;
    y: number;
}

export interface RawTile {
    x: number;
    y: number;
    raw: number;
}

export interface Tile {
    x: number;
    y: number;
    isLand: boolean;
    isOcean: boolean;
    isShore: boolean;
    raw: number;
}

export function tileFromByte(x: number, y: number, b: number): Tile {
    return {
        x,
        y,
        isLand: isLand(b),
        isOcean: isOcean(b),
        isShore: isShore(b),
        raw: b,
    };
}
