import {
    discoverMaps,
    distSq,
    manhattanDist,
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

        const sourceCenter: Tile = randomElement(shoreTiles);
        const sourceTerritory: Tile[] = [];
        let furthest: Tile;
        let maxDist = -Infinity;
        for (const s of shoreTiles) {
            const dist = distSq(s, sourceCenter);
            if (dist < radius * radius) {
                sourceTerritory.push(s);
                if (dist > maxDist) {
                    maxDist = dist;
                    furthest = s;
                }
            }
        }

        if (sourceTerritory.length === 0) continue;
        const territory: number[] = sourceTerritory.map(
            (s) => s.y * gameMap.width + s.x,
        );

        const targetDistance = sampleDistribution();
        let targetTile: Tile | null = null;
        const max_tries = 50;
        let tries = 0;
        while (targetTile === null && tries < max_tries) {
            tries++;
            const candidates = shoreTiles.filter((t) => {
                const d1 = distSq(t, furthest);
                const d2 = distSq(t, sourceCenter);
                const r2 = radius * radius;
                const td2 = targetDistance * targetDistance;
                const td12 = td2 * 1.2 * 1.2;

                if (d2 < r2) return false;
                if (d2 < r2 + 0.5 * td2) return false;
                if (d1 >= td2 && d1 < td12) return true;
            });
            if (candidates.length > 0) targetTile = candidates[0];
        }

        if (targetTile === null) {
            continue;
        }

        const id = `${name}-${String(cases.length + 1).padStart(3, "0")}`;
        cases.push({
            id,
            target: targetTile,
            sourceCenter,
            sourceFurthest: furthest!,
            targetDistance,
            centerFurthestDist: manhattanDist(sourceCenter, furthest!),
            centerTargetDist: manhattanDist(sourceCenter, targetTile),
            targetFurthestDist: manhattanDist(targetTile, furthest!),
            sourceRadius: radius,
            sourceShore: territory,
        });
    }

    return cases;
}

/**
 * This function returns a random distance between 20 and 1000, with non-even weighting.
 *
 * The cumulative distribution function being sampled is described by: 1-exp(-x/150).
 * By inverting this function, we can choose a random value between 0 and 1 and get a return value
 * approximately between 0 and 1000. Adding 20 to the minium and then clamping the function to 1000
 * ensures that we only get distances between 20 and 1000.
 */
export function sampleDistribution(): number {
    return clamp(Math.round(-150 * Math.log(1 - Math.random()) + 20), 1000);
}

export function clamp(a: number, upper: number, lower: number = 0) {
    return Math.max(Math.min(a, upper), lower);
}

/**
 * Writes the full MapCases object to file
 * @param name - Map Name
 * @param cases - List of Transport Test Cases created for the associated map
 */
export function writeCasesToFile(name: MapName, cases: TransportTestCase[]) {
    const output: MapCases = {
        mapName: name,
        version: "0.0.3",
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
