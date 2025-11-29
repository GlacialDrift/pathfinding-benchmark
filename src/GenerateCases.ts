import {
    discoverMaps,
    distSq,
    type MapCases,
    type MapName,
    randomElement,
    type Tile,
    type TransportTestCase,
} from "./Utils.ts";
import { loadMapFromName } from "./LoadMap.ts";
import { fileURLToPath } from "url";
import path from "path";
import * as fs from "node:fs";

/** number of cases to be generated for each map */
const CASES_PER_MAP: number = 100;
/** The distance from the source center to use as the source territory */
const SOURCE_RADIUS: { min: number; max: number } = { min: 10, max: 500 };

/**
 * Generates test cases for a provided map and returns them as a list of individual Test Cases.
 *
 * The maximum number of test cases is determined by CASES_PER_MAP. Target tiles and source shore tiles must be at least
 * SOURCE_RADIUS distance apart. Only shore tiles (land tile && shoreline tile) are considered here.
 * @param name - Map Name
 */
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
        const radius = Math.floor(
            Math.random() * (SOURCE_RADIUS.max - SOURCE_RADIUS.min) +
                SOURCE_RADIUS.min,
        );

        const targetTile: Tile = randomElement(shoreTiles);
        const sourceCenter: Tile = randomElement(shoreTiles);
        if (distSq(targetTile, sourceCenter) <= radius * radius) continue;

        const sourceTerritory: Tile[] = shoreTiles.filter((t: Tile) => {
            // if (Math.abs(t.y - sourceCenter.y) < 20) {
            //     console.log("close");
            // }
            // const dist = distSq(t, sourceCenter);
            // return dist <= SOURCE_RADIUS * SOURCE_RADIUS;
            return distSq(t, sourceCenter) <= radius * radius;
        });
        if (sourceTerritory.length === 0) continue;

        const id = `${name}-${String(cases.length + 1).padStart(3, "0")}`;
        cases.push({
            id,
            target: targetTile,
            sourceCenter,
            sourceRadius: radius,
            sourceShore: sourceTerritory,
        });
    }

    return cases;
}

/**
 * Writes the full MapCases object to file
 * @param name - Map Name
 * @param cases - List of Transport Test Cases created for the associated map
 */
export function writeCasesToFile(name: MapName, cases: TransportTestCase[]) {
    const output: MapCases = {
        mapName: name,
        version: "0.0.2",
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

/**
 * Discovers all maps available. Then for each map, generate test cases and write them to file.
 */
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
