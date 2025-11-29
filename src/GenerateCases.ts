import { discoverMaps, type MapName, type Tile } from "./Utils.ts";
import { loadMapFromName } from "./LoadMap.ts";
import { fileURLToPath } from "url";
import path from "path";
import * as fs from "node:fs";

const CASES_PER_MAP: number = 100;
const SOURCE_RADIUS: number = 50;

export interface TransportTestCase {
    id: string;
    target: Tile;
    sourceCenter: Tile;
    sourceRadius: number;
    sourceShore: Tile[];
}

export interface MapCases {
    mapName: MapName;
    version: string;
    generatedAt: string;
    cases: TransportTestCase[];
}

export function distSq(a: Tile, b: Tile): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

export function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateCasesForMap(name: MapName): TransportTestCase[] | null {
    const gameMap = loadMapFromName(name);
    if (gameMap === null) return null;

    const shoreTiles: Tile[] = [];
    gameMap.data.forEach((tile: Tile) => {
        if (tile.isShore) shoreTiles.push(tile);
    });

    if (shoreTiles.length === 0) {
        console.warn(`No shore tiles detected for map ${name}`);
        return [];
    }

    const cases: TransportTestCase[] = [];
    let attempts: number = 0;
    const MAX_ATTEMPTS: number = CASES_PER_MAP * 2;
    while (cases.length < CASES_PER_MAP && attempts < MAX_ATTEMPTS) {
        attempts++;

        const targetTile: Tile = randomElement(shoreTiles);
        const sourceCenter: Tile = randomElement(shoreTiles);
        if (distSq(targetTile, sourceCenter) <= SOURCE_RADIUS * SOURCE_RADIUS)
            continue;

        const sourceTerritory: Tile[] = shoreTiles.filter((t: Tile) => {
            // if (Math.abs(t.y - sourceCenter.y) < 20) {
            //     console.log("close");
            // }
            // const dist = distSq(t, sourceCenter);
            // return dist <= SOURCE_RADIUS * SOURCE_RADIUS;
            return distSq(t, sourceCenter) <= SOURCE_RADIUS * SOURCE_RADIUS;
        });
        if (sourceTerritory.length === 0) continue;

        const id = `${name}-${String(cases.length + 1).padStart(3, "0")}`;
        cases.push({
            id,
            target: targetTile,
            sourceCenter,
            sourceRadius: SOURCE_RADIUS,
            sourceShore: sourceTerritory,
        });
    }

    return cases;
}

export function writeCasesToFile(name: MapName, cases: TransportTestCase[]) {
    const output = {
        mapName: name,
        version: "0.0.1",
        generatedAt: new Date().toISOString(),
        cases,
    };

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dir = path.join(__dirname, "..", "cases");
    fs.mkdirSync(dir, { recursive: true });

    const outPath = path.join(dir, `${name}-TransportCases.json`);
    fs.writeFileSync(outPath, JSON.stringify(output, null, 4), "utf8");
    console.log(
        `Wrote ${output.cases.length} Transport Test Cases for Map: ${name}`,
    );
}

export function generateCases() {
    const mapNames = discoverMaps();
    mapNames.forEach((name: MapName) => {
        console.log(`Generating Test Cases for ${name}`);
        const cases: TransportTestCase[] | null = generateCasesForMap(name);
        if (cases === null) {
            console.warn(`Could not create test cases for ${name}`);
        } else {
            writeCasesToFile(name, cases);
        }
    });
}
