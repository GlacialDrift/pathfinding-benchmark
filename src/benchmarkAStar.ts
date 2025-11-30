import {
    type GameMap,
    manhattanDist,
    type Tile,
    type TransportTestCase,
    type TransportTestResult,
} from "./Utils.ts";
import { isShoreline, magnitude } from "./TerrainBytes.ts";
import FastPriorityQueue from "fastpriorityqueue";
import { fileURLToPath } from "url";
import path from "path";
import fs from "node:fs";

export function runAStarBenchmark(
    map: GameMap,
    miniMap: GameMap,
    tests: TransportTestCase[],
    version: string,
) {
    for (let i = 0; i < tests.length; i++) {
        const playerShores: Tile[] = new Array(tests[i].sourceShore.length);
        tests[i].sourceShore.forEach((s, index) => {
            const y = Math.floor(s / map.width);
            const x = s % map.width;
            playerShores[index] = map.get(x, y);
        });
        const source = bestShoreDeploymentSource(
            map,
            miniMap,
            playerShores,
            tests[i].target,
        );
        if (source) {
            const result: TransportTestResult = {
                id: tests[i].id,
                version,
                method: "A*",
                target: tests[i].target,
                sourceCenter: tests[i].sourceCenter,
                sourceRadius: tests[i].sourceRadius,
                source: source.source,
                visited: source.visited,
            };

            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const dir = path.join(__dirname, "..", "results");
            fs.mkdirSync(dir, { recursive: true });

            const outPath = path.join(
                dir,
                `${tests[i].id}-Astar-TestResult.json`,
            );
            fs.writeFileSync(outPath, JSON.stringify(result, null, 4), "utf8");
            console.log(
                `Completed test ${i + 1} of ${tests.length} for map ${map.name} - A*`,
            );
        }
    }
}

export function bestShoreDeploymentSource(
    map: GameMap,
    miniMap: GameMap,
    playerShores: Tile[],
    target: Tile,
): { source: Tile; visited: number } | false {
    let cells: number = 0;
    if (target === null) return false;
    const territory = playerShores.map((s) => map.get(s.x, s.y));

    const candidates = candidateShoreTiles(map, playerShores, target);
    if (candidates.length === 0) return false;

    const aStar = new MiniAStar(map, miniMap, candidates, target, 1_000_000, 1);
    const { result, visited } = aStar.compute();
    cells += visited;
    if (result !== 2) {
        console.warn(`bestShoreDeploymentSource: path not found: ${result}`);
        return false;
    }

    const path = aStar.reconstructPath();
    if (path.length === 0) {
        return false;
    }
    const potential = path[0];
    // Since mini a* downscales the map, we need to check the neighbors
    // of the potential tile to find a valid deployment point
    const neighbors = map
        .neighbors(potential.x, potential.y)
        .filter((n) => n.isShore && territory.includes(n));
    if (neighbors.length === 0) {
        return false;
    }
    return { source: neighbors[0], visited: cells };
}

export function candidateShoreTiles(
    map: GameMap,
    borderShoreTiles: Tile[],
    target: Tile,
): Tile[] {
    let closestManhattanDistance = Infinity;
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

    let bestByManhattan: Tile | null = null;
    const extremumTiles: Record<string, Tile | null> = {
        minX: null,
        minY: null,
        maxX: null,
        maxY: null,
    };

    for (let i = 0; i < borderShoreTiles.length; i++) {
        const tile = borderShoreTiles[i];
        const distance = manhattanDist(tile, target);

        // Manhattan-closest tile
        if (distance < closestManhattanDistance) {
            closestManhattanDistance = distance;
            bestByManhattan = tile;
        }

        // Extremum tiles
        if (tile.x < minX) {
            minX = tile.x;
            extremumTiles.minX = tile;
        } else if (tile.y < minY) {
            minY = tile.y;
            extremumTiles.minY = tile;
        } else if (tile.x > maxX) {
            maxX = tile.x;
            extremumTiles.maxX = tile;
        } else if (tile.y > maxY) {
            maxY = tile.y;
            extremumTiles.maxY = tile;
        }
    }

    // Calculate sampling interval to ensure we get at most 50 tiles
    const samplingInterval = Math.max(
        10,
        Math.ceil(borderShoreTiles.length / 50),
    );
    const sampledTiles = borderShoreTiles.filter(
        (_, index) => index % samplingInterval === 0,
    );

    const candidates: Tile[] = [
        map.get(bestByManhattan!.x, bestByManhattan!.y),
        map.get(extremumTiles.minX!.x, extremumTiles.minX!.y),
        map.get(extremumTiles.minY!.x, extremumTiles.minY!.y),
        map.get(extremumTiles.maxX!.x, extremumTiles.maxX!.y),
        map.get(extremumTiles.maxY!.x, extremumTiles.maxY!.y),
        ...sampledTiles,
    ];

    return candidates;
}

export interface AStar<NodeType> {
    compute(): { result: number; visited: number };
    reconstructPath(): NodeType[];
}

export class MiniAStar implements AStar<Tile> {
    private aStar: AStar<Tile>;
    private gameMap: GameMap;
    private miniMap: GameMap;
    private src: Tile | Tile[];
    private dst: Tile;

    constructor(
        gameMap: GameMap,
        miniMap: GameMap,
        src: Tile | Tile[],
        dst: Tile,
        iterations: number,
        maxTries: number,
        waterPath: boolean = true,
    ) {
        this.gameMap = gameMap;
        this.miniMap = miniMap;
        this.src = src;
        this.dst = dst;

        const srcArr: Tile[] = Array.isArray(src) ? src : [src];
        const srcArray = srcArr.map((s) => gameMap.get(s.x, s.y));
        const miniSrc = srcArray.map((s) =>
            miniMap.get(Math.floor(s.x / 2), Math.floor(s.y / 2)),
        );

        const miniDst = miniMap.get(
            Math.floor(dst.x / 2),
            Math.floor(dst.y / 2),
        );

        this.aStar = new SerialAStar(
            miniSrc,
            miniDst,
            iterations,
            maxTries,
            new GameMapAdapter(miniMap, waterPath),
        );
    }

    compute(): { result: number; visited: number } {
        return this.aStar.compute();
    }

    reconstructPath(): Tile[] {
        let cellSrc: Tile | undefined;
        if (!Array.isArray(this.src)) {
            cellSrc = this.gameMap.get(this.src.x, this.src.y);
        }
        const cellDst = this.gameMap.get(this.dst.x, this.dst.y);

        const upscaled = fixExtremes(
            upscalePath(
                this.aStar
                    .reconstructPath()
                    .map((tr) => this.miniMap.get(tr.x, tr.y)),
                this.gameMap,
            ),
            cellDst,
            cellSrc,
        );
        return upscaled.map((c) => this.gameMap.get(c.x, c.y));
    }
}

function fixExtremes(upscaled: Tile[], cellDst: Tile, cellSrc?: Tile): Tile[] {
    if (cellSrc !== undefined) {
        const srcIndex = findCell(upscaled, cellSrc);
        if (srcIndex === -1) {
            // didn't find the start tile in the path
            upscaled.unshift(cellSrc);
        } else if (srcIndex !== 0) {
            // found start tile but not at the start
            // remove all tiles before the start tile
            upscaled = upscaled.slice(srcIndex);
        }
    }

    const dstIndex = findCell(upscaled, cellDst);
    if (dstIndex === -1) {
        // didnt find the dst tile in the path
        upscaled.push(cellDst);
    } else if (dstIndex !== upscaled.length - 1) {
        // found dst tile but not at the end
        // remove all tiles after the dst tile
        upscaled = upscaled.slice(0, dstIndex + 1);
    }
    return upscaled;
}

function upscalePath(
    path: Tile[],
    map: GameMap,
    scaleFactor: number = 2,
): Tile[] {
    // Scale up each point
    const scaledPath: Tile[] = path.map((point) =>
        map.get(point.x * scaleFactor, point.y * scaleFactor),
    );

    const smoothPath: Tile[] = [];

    for (let i = 0; i < scaledPath.length - 1; i++) {
        const current = scaledPath[i];
        const next = scaledPath[i + 1];

        // Add the current point
        smoothPath.push(current);

        // Always interpolate between scaled points
        const dx = next.x - current.x;
        const dy = next.y - current.y;

        // Calculate number of steps needed
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const steps = distance;

        // Add intermediate points
        for (let step = 1; step < steps; step++) {
            const ddx = Math.round(current.x + (dx * step) / steps);
            const ddy = Math.round(current.y + (dy * step) / steps);
            smoothPath.push(map.get(ddx, ddy));
        }
    }

    // Add the last point
    if (scaledPath.length > 0) {
        smoothPath.push(scaledPath[scaledPath.length - 1]);
    }

    return smoothPath;
}

function findCell(upscaled: Tile[], cellDst: Tile): number {
    for (let i = 0; i < upscaled.length; i++) {
        if (upscaled[i].x === cellDst.x && upscaled[i].y === cellDst.y) {
            return i;
        }
    }
    return -1;
}

/**
 * Implement this interface with your graph to find paths with A*
 */
export interface GraphAdapter<NodeType> {
    neighbors(node: NodeType): NodeType[];
    cost(node: NodeType): number;
    position(node: NodeType): { x: number; y: number };
    isTraversable(from: NodeType, to: NodeType): boolean;
}

export class SerialAStar<NodeType> implements AStar<NodeType> {
    private fwdOpenSet: FastPriorityQueue<{
        tile: NodeType;
        fScore: number;
    }>;
    private bwdOpenSet: FastPriorityQueue<{
        tile: NodeType;
        fScore: number;
    }>;

    private fwdCameFrom = new Map<NodeType, NodeType>();
    private bwdCameFrom = new Map<NodeType, NodeType>();
    private fwdGScore = new Map<NodeType, number>();
    private bwdGScore = new Map<NodeType, number>();

    private meetingPoint: NodeType | null = null;
    public completed = false;
    private sources: NodeType[];
    private closestSource: NodeType;

    private dst: NodeType;
    private iterations: number;
    private maxTries: number;
    private graph: GraphAdapter<NodeType>;
    private directionChangePenalty: number = 0;

    private cells: number;

    constructor(
        src: NodeType | NodeType[],
        dst: NodeType,
        iterations: number,
        maxTries: number,
        graph: GraphAdapter<NodeType>,
    ) {
        this.dst = dst;
        this.iterations = iterations;
        this.maxTries = maxTries;
        this.graph = graph;
        this.cells = 0;

        this.fwdOpenSet = new FastPriorityQueue((a, b) => a.fScore < b.fScore);
        this.bwdOpenSet = new FastPriorityQueue((a, b) => a.fScore < b.fScore);
        this.sources = Array.isArray(src) ? src : [src];
        this.closestSource = this.findClosestSource(dst);

        // Initialize forward search with source point(s)
        this.sources.forEach((startPoint) => {
            this.fwdGScore.set(startPoint, 0);
            this.fwdOpenSet.add({
                tile: startPoint,
                fScore: this.heuristic(startPoint, dst),
            });
            this.cells++;
        });

        // Initialize backward search from destination
        this.bwdGScore.set(dst, 0);
        this.bwdOpenSet.add({
            tile: dst,
            fScore: this.heuristic(dst, this.findClosestSource(dst)),
        });
        this.cells++;
    }

    private findClosestSource(tile: NodeType): NodeType {
        return this.sources.reduce((closest, source) =>
            this.heuristic(tile, source) < this.heuristic(tile, closest)
                ? source
                : closest,
        );
    }

    compute(): { result: number; visited: number } {
        if (this.completed) return { result: 2, visited: this.cells };

        this.maxTries -= 1;
        let iterations = this.iterations;

        while (!this.fwdOpenSet.isEmpty() && !this.bwdOpenSet.isEmpty()) {
            iterations--;
            if (iterations <= 0) {
                if (this.maxTries <= 0) {
                    return { result: 3, visited: this.cells };
                }
                return { result: 1, visited: this.cells };
            }

            // Process forward search
            const fwdCurrent = this.fwdOpenSet.poll()!.tile;
            this.cells++;

            // Check if we've found a meeting point
            if (this.bwdGScore.has(fwdCurrent)) {
                this.meetingPoint = fwdCurrent;
                this.completed = true;
                return { result: 2, visited: this.cells };
            }
            this.expandNode(fwdCurrent, true);

            // Process backward search
            const bwdCurrent = this.bwdOpenSet.poll()!.tile;

            // Check if we've found a meeting point
            if (this.fwdGScore.has(bwdCurrent)) {
                this.meetingPoint = bwdCurrent;
                this.completed = true;
                return { result: 2, visited: this.cells };
            }
            this.expandNode(bwdCurrent, false);
        }

        return this.completed
            ? { result: 2, visited: this.cells }
            : { result: 3, visited: this.cells };
    }

    private expandNode(current: NodeType, isForward: boolean) {
        for (const neighbor of this.graph.neighbors(current)) {
            this.cells++;
            if (
                neighbor !== (isForward ? this.dst : this.closestSource) &&
                !this.graph.isTraversable(current, neighbor)
            )
                continue;

            const gScore = isForward ? this.fwdGScore : this.bwdGScore;
            const openSet = isForward ? this.fwdOpenSet : this.bwdOpenSet;
            const cameFrom = isForward ? this.fwdCameFrom : this.bwdCameFrom;

            const tentativeGScore =
                gScore.get(current)! + this.graph.cost(neighbor);
            let penalty = 0;
            // With a direction change penalty, the path will get as straight as possible
            if (this.directionChangePenalty > 0) {
                const prev = cameFrom.get(current);
                if (prev) {
                    const prevDir = this.getDirection(prev, current);
                    const newDir = this.getDirection(current, neighbor);
                    if (prevDir !== newDir) {
                        penalty = this.directionChangePenalty;
                    }
                }
            }

            const totalG = tentativeGScore + penalty;
            if (!gScore.has(neighbor) || totalG < gScore.get(neighbor)!) {
                cameFrom.set(neighbor, current);
                gScore.set(neighbor, totalG);
                const fScore =
                    totalG +
                    this.heuristic(
                        neighbor,
                        isForward ? this.dst : this.closestSource,
                    );
                openSet.add({ tile: neighbor, fScore: fScore });
            }
        }
    }

    private heuristic(a: NodeType, b: NodeType): number {
        const posA = this.graph.position(a);
        const posB = this.graph.position(b);
        return 2 * (Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y));
    }

    private getDirection(from: NodeType, to: NodeType): string {
        const fromPos = this.graph.position(from);
        const toPos = this.graph.position(to);
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        return `${Math.sign(dx)},${Math.sign(dy)}`;
    }

    public reconstructPath(): NodeType[] {
        if (!this.meetingPoint) return [];

        // Reconstruct path from start to meeting point
        const fwdPath: NodeType[] = [this.meetingPoint];
        let current = this.meetingPoint;

        while (this.fwdCameFrom.has(current)) {
            current = this.fwdCameFrom.get(current)!;
            fwdPath.unshift(current);
        }

        // Reconstruct path from meeting point to goal
        current = this.meetingPoint;

        while (this.bwdCameFrom.has(current)) {
            current = this.bwdCameFrom.get(current)!;
            fwdPath.push(current);
        }

        return fwdPath;
    }
}

export function cost(ref: Tile): number {
    return magnitude(ref.raw) < 10 ? 2 : 1;
}

export class GameMapAdapter implements GraphAdapter<Tile> {
    private readonly waterPenalty = 3;
    private gameMap: GameMap;
    private waterPath: boolean;
    constructor(map: GameMap, water: boolean) {
        this.gameMap = map;
        this.waterPath = water;
    }

    neighbors(node: Tile): Tile[] {
        return this.gameMap.neighbors(node.x, node.y);
    }

    cost(node: Tile): number {
        let base = cost(node);
        // Avoid crossing water when possible
        if (!this.waterPath && !node.isLand) {
            base += this.waterPenalty;
        }
        return base;
    }

    position(node: Tile): { x: number; y: number } {
        return { x: node.x, y: node.y };
    }

    isTraversable(from: Tile, to: Tile): boolean {
        const toWater = !to.isLand;
        if (this.waterPath) {
            return toWater;
        }
        // Allow water access from/to shore
        const fromShore = isShoreline(from.raw);
        const toShore = isShoreline(to.raw);
        return !toWater || fromShore || toShore;
    }
}

// export enum PathFindResultType {
//     NextTile,
//     Pending,
//     Completed,
//     PathNotFound,
// }
