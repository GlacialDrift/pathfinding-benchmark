import {
    discoverCases,
    type GameMap,
    type MapCases,
    type Tile,
    type TransportTestCase,
    type TransportTestReseult,
} from "./Utils.ts";
import * as fs from "node:fs";
import { loadMapFromName } from "./LoadMap.ts";
import { fileURLToPath } from "url";
import path from "path";

export function runBFSBenchmarks() {
    const mapCaseFiles = discoverCases();
    for (let i = 0; i < mapCaseFiles.length; i++) {
        if (i == 0) {
            const fileContents = fs.readFileSync(mapCaseFiles[i], "utf8");
            const mapCase: MapCases = JSON.parse(fileContents);
            const map = loadMapFromName(mapCase.mapName);
            if (map === null) {
                console.warn(`Was unable to load map ${mapCase.mapName}`);
                continue;
            }
            const tests = mapCase.cases;
            for (let j = 0; j < tests.length; j++) {
                const visited = benchmarkTest(map, tests[j]);
                if (!(visited instanceof Set)) {
                    const result: TransportTestReseult = {
                        id: tests[j].id,
                        method: "BFS",
                        target: tests[j].target,
                        sourceCenter: tests[j].sourceCenter,
                        sourceRadius: tests[j].sourceRadius,
                        source: visited.source,
                        visited: visited.visited,
                    };

                    const __filename = fileURLToPath(import.meta.url);
                    const __dirname = path.dirname(__filename);
                    const dir = path.join(__dirname, "..", "results");
                    fs.mkdirSync(dir, { recursive: true });

                    const outPath = path.join(
                        dir,
                        `${tests[j].id}-BFS-TestResult.json`,
                    );
                    fs.writeFileSync(
                        outPath,
                        JSON.stringify(result, null, 4),
                        "utf8",
                    );
                    console.log(
                        `Completed test ${j} of ${tests.length} for map ${mapCase.mapName}`,
                    );
                }
            }
        }
    }
}

export function benchmarkTest(
    map: GameMap,
    t: TransportTestCase,
): { source: Tile; visited: number } | Set<Tile> {
    const targetTile = map.get(t.target.x, t.target.y);
    const sourceTiles = t.sourceShore.map((s) => map.get(s.x, s.y));
    return BFS(targetTile, sourceTiles, map);
}

export function BFS(
    target: Tile,
    sources: Tile[],
    map: GameMap,
): { source: Tile; visited: number } | Set<Tile> {
    const seen = new Set<Tile>();
    const q: Tile[] = [];

    for (const n of map.neighbors(target.x, target.y)) {
        if (!n.isLand) {
            seen.add(n);
            q.push(n);
        }
    }

    while (q.length > 0) {
        const size = q.length;
        for (let i = 0; i < size; i++) {
            const curr = q.shift();
            if (curr === undefined) continue;
            for (const n of map.neighbors(curr.x, curr.y)) {
                if (sources.includes(n)) {
                    return {
                        source: n,
                        visited: seen.size,
                    };
                }
                if (!seen.has(n) && !n.isLand) {
                    seen.add(n);
                    q.push(n);
                }
            }
        }
    }

    console.warn("No source tile found in reverse BFS for Transport Ship");
    return seen;
}
