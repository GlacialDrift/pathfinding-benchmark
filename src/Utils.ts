import { isLand, isOcean, isShore } from "./TerrainBytes.ts";
import * as fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

export type MapName = string;

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

/**
 * Returns a list of all map names within the 'resources' directory of the project
 */
export function discoverMaps(): MapName[] {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dir = path.join(__dirname, "..", "resources");

    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir).filter((name: string) => {
        const manifestpath = path.join(dir, name, "manifest.json");
        return fs.existsSync(manifestpath);
    });
}
