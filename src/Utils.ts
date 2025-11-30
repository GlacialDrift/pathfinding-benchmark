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
 * Map interface that contains the important fields of a map, the map data itself, and helper functions
 */
export interface GameMap {
    readonly name: MapName;
    readonly width: number;
    readonly height: number;
    readonly landTiles: number;
    readonly data: readonly Tile[];
    get(x: number, y: number): Tile;
    neighbors(x: number, y: number): Tile[];
}

/**
 * Manifest interface that contains map name and general map information
 */
export interface Manifest {
    name: string;
    map: { width: number; height: number; num_land_tiles: number };
    map4x: { width: number; height: number; num_land_tiles: number };
}

/**
 * A single transport test case containing:
 *  - the test case id
 *  - the target Tile
 *  - the sourceCenter Tile (in case source Territory needs to be recreated)
 *  - the source radius that was used to generate source territory
 *  - an array of source shore tiles (described as their tile number = y*width + x)
 */
export interface TransportTestCase {
    id: string;
    target: Tile;
    sourceCenter: Tile;
    sourceFurthest: Tile;
    targetDistance: number;
    centerFurthestDist: number;
    centerTargetDist: number;
    targetFurthestDist: number;
    sourceRadius: number;
    sourceShore: number[];
}

/**
 * A single transport test case result containing:
 *  - the test case id
 *  - the target Tile
 *  - the sourceCenter Tile (in case source Territory needs to be recreated)
 *  - the source radius that was used to generate source territory
 *  - the source tile identified by the algorithm
 *  - the number of tiles visited during the algorithm
 */
export interface TransportTestReseult {
    id: string;
    version: string;
    method: string;
    target: Tile;
    sourceCenter: Tile;
    sourceRadius: number;
    source: Tile;
    visited: number;
}

/**
 * All transport test cases for a given map including:
 *  - the map's name
 *  - the Version of this tool used to generate test cases
 *  - the time the cases were generated
 *  - the list of cases for that map
 */
export interface MapCases {
    mapName: MapName;
    version: string;
    generatedAt: string;
    cases: TransportTestCase[];
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

/**
 * Returns a list of all map names within the 'resources' directory of the project
 */
export function discoverCases(): string[] {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dir = path.join(__dirname, "..", "cases");

    if (!fs.existsSync(dir)) return [];

    const files: string[] = [];
    fs.readdirSync(dir).forEach((name: string) => {
        files.push(path.join(dir, name));
    });
    return files;
}

/**
 * Helper function to determine the squared distance between two points
 * @param a - the first point (includes x-y coordinates)
 * @param b - the second point (includes x-y coordinates)
 */
export function distSq(a: Tile, b: Tile): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

/**
 * Helper function to determine the manhattan distance between two points
 * @param a - the first point (includes x-y coordinates)
 * @param b - the second point (includes x-y coordinates)
 */
export function manhattanDist(a: Tile, b: Tile): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Select a random element of a provided array
 * @param arr - list of possible elements to select
 */
export function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}
