import {
    type GameMap,
    type Tile,
    type TransportTestCase,
    type TransportTestResult,
} from "./Utils.ts";
import * as fs from "node:fs";
import { fileURLToPath } from "url";
import path from "path";

export function runBFSBenchmark(
    map: GameMap,
    tests: TransportTestCase[],
    version: string,
) {
    for (let j = 0; j < tests.length; j++) {
        if (j == 0) {
            const visited = benchmarkTest(map, tests[j]);
            if (!(visited instanceof Set)) {
                const result: TransportTestResult = {
                    id: tests[j].id,
                    version,
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
                    `Completed test ${j + 1} of ${tests.length} for map ${map.name} - BFS`,
                );
            }
        }
    }
}

export function benchmarkTest(
    map: GameMap,
    t: TransportTestCase,
): { source: Tile; visited: number } | Set<Tile> {
    const targetTile = map.get(t.target.x, t.target.y);
    const sourceTiles = t.sourceShore.map((s) => {
        const y = Math.floor(s / map.width);
        const x = s % map.width;
        return map.get(x, y);
    });
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
