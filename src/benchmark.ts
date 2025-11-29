import { discoverCases, type MapCases } from "./Utils.ts";
import fs from "node:fs";
import { loadMapFromName } from "./LoadMap.ts";
import { runBFSBenchmark } from "./benchmarkBFS.ts";

export function runBenchmarks() {
    const mapCaseFiles = discoverCases();
    for (let i = 0; i < mapCaseFiles.length; i++) {
        const fileContents = fs.readFileSync(mapCaseFiles[i], "utf8");
        const mapCase: MapCases = JSON.parse(fileContents);
        const map = loadMapFromName(mapCase.mapName);
        if (map === null) {
            console.warn(`Was unable to load map ${mapCase.mapName}`);
            continue;
        }
        const tests = mapCase.cases;
        runBFSBenchmark(map, tests);
    }
}
