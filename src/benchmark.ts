import { discoverCases, type MapCases } from "./Utils.ts";
import fs from "node:fs";
import { loadMapFromName, loadMiniMapFromName } from "./LoadMap.ts";
import { runBFSBenchmark } from "./benchmarkBFS.ts";
import { runAStarBenchmark } from "./benchmarkAStar.ts";

export function runBenchmarks() {
    const mapCaseFiles = discoverCases();
    for (let i = 0; i < mapCaseFiles.length; i++) {
        const fileContents = fs.readFileSync(mapCaseFiles[i], "utf8");
        const mapCase: MapCases = JSON.parse(fileContents);
        const map = loadMapFromName(mapCase.mapName);
        const miniMap = loadMiniMapFromName(mapCase.mapName);
        if (map === null || miniMap === null) {
            console.warn(`Was unable to load maps for ${mapCase.mapName}`);
            continue;
        }
        const tests = mapCase.cases;
        const v = mapCase.version;
        runBFSBenchmark(map, tests, v);
        runAStarBenchmark(map, miniMap, tests, v);
    }
}
