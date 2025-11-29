import { type MapName, type Tile, tileFromByte } from "./Utils.ts";
import * as fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

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
}

/**
 * Returns the directory that contains the map of a given name
 * @param name - Map Name
 */
export function getMapDir(name: MapName) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.join(__dirname, "..", "resources", name);
}

/**
 * Returns a Manifest object that contains basic information of a map
 * @param name - Map Name
 */
export function readManifest(name: MapName): Manifest {
    const manifestPath = path.join(getMapDir(name), "manifest.json");
    const raw = fs.readFileSync(manifestPath, "utf8");
    return JSON.parse(raw) as Manifest;
}

/**
 * Returns the binary data array that contains terrain information of a map
 * @param name - Map Name
 */
export function readBinFile(name: MapName): Uint8Array {
    const binFilePath = path.join(getMapDir(name), "map.bin");
    return new Uint8Array(fs.readFileSync(binFilePath));
}

/**
 * Creates a Map object from the manifest information and binary data of a provided map name. Returns all relevant
 * information about the map as well as two helper functions to extract info from the map.
 * @param name - Map Name
 */
export function loadMapFromName(name: MapName): GameMap {
    const manifest = readManifest(name);
    const { width, height } = manifest.map;
    const data = readBinFile(name);

    if (data.length !== width * height)
        throw new Error(
            `Data mismatch. Expected data length of ${width * height} and have data length of ${data.length}`,
        );

    const tiles: Tile[] = new Array(width * height);
    data.forEach((byte: number, index: number) => {
        const y = Math.floor(index / width);
        const x = index % width;
        tiles[index] = tileFromByte(x, y, byte);
    });

    return {
        name,
        width,
        height,
        landTiles: manifest.map.num_land_tiles,
        data: tiles,
        get(x: number, y: number): Tile {
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
                throw new Error(
                    `X: ${x} or Y: ${y} is out of bounds for map ${this.name}`,
                );
            }
            return this.data[y * this.width + x];
        },
        neighbors(x: number, y: number): Tile[] {
            const neighbors: Tile[] = [];
            if (x > 0) neighbors.push(this.data[y * this.width + x - 1]);
            if (y > 0) neighbors.push(this.data[(y - 1) * this.width + x]);
            if (x + 1 < this.width)
                neighbors.push(this.data[y * this.width + x + 1]);
            if (y + 1 < this.height)
                neighbors.push(this.data[(y + 1) * this.width + x]);
            return neighbors;
        },
    };
}
