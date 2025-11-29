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
    readonly x: number;
    readonly y: number;
    readonly isLand: boolean;
    readonly isOcean: boolean;
    readonly isShore: boolean;
    readonly raw: number;
}

/**
 * Creates a Tile object based on the provided x,y coordinates and the raw byte for that tile
 * @param x - x-coordinate
 * @param y - y-coordinate
 * @param b - raw byte
 */
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
