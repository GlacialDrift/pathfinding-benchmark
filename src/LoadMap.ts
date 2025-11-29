import type { RawTile } from "./Utils.ts";
import * as fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

export type MapName = string;

/**
 * Map interface that contains
 */
export interface Map {
    name: MapName;
    width: number;
    height: number;
    landTiles: number;
    data: Uint8Array;
    get(x: number, y: number): number;
    neighbors(x: number, y: number): RawTile[];
}

export interface Manifest {
    name: string;
    map: { width: number; height: number; num_land_tiles: number };
}

export function getMapDir(name: MapName) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.join(__dirname, "..", "resources", name);
}

export function readManifest(name: MapName): Manifest {
    const manifestPath = path.join(getMapDir(name), "manifest.json");
    const raw = fs.readFileSync(manifestPath, "utf8");
    return JSON.parse(raw) as Manifest;
}

export function readBinFile(name: MapName): Uint8Array {
    const binFilePath = path.join(getMapDir(name), "map.bin");
    return new Uint8Array(fs.readFileSync(binFilePath));
}

export function loadMapFromName(name: MapName): Map {
    const manifest = readManifest(name);
    const { width, height } = manifest.map;
    const data = readBinFile(name);

    if (data.length !== width * height)
        throw new Error(
            `Data mismatch. Expected data length of ${width * height} and have data length of ${data.length}`,
        );

    return {
        name,
        width,
        height,
        landTiles: manifest.map.num_land_tiles,
        data,
        get(x: number, y: number): number {
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
                throw new Error(
                    `X: ${x} or Y: ${y} is out of bounds for map ${this.name}`,
                );
            }
            return this.data[y * this.width + x];
        },
        neighbors(x: number, y: number): RawTile[] {
            const neighbors: RawTile[] = [];
            if (x > 0)
                neighbors.push({
                    x: x - 1,
                    y,
                    raw: this.data[y * this.width + x - 1],
                });
            if (y > 0)
                neighbors.push({
                    x,
                    y: y - 1,
                    raw: this.data[(y - 1) * this.width + x],
                });
            if (x + 1 < this.width)
                neighbors.push({
                    x: x + 1,
                    y,
                    raw: this.data[y * this.width + x + 1],
                });
            if (y + 1 < this.height)
                neighbors.push({
                    x,
                    y: y + 1,
                    raw: this.data[(y + 1) * this.width + x],
                });
            return neighbors;
        },
    };
}

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
