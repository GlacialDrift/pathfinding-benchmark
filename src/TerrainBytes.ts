// constants to extract information from map Bytes
const LAND_FLAG: number = 0b1000_0000;
const SHORE_FLAG: number = 0b0100_0000;
const OCEAN_FLAG: number = 0b0010_0000;
const MAGNITUDE: number = 0b0001_1111;

export function isLand(b: number): boolean {
    return (b & LAND_FLAG) !== 0;
}

export function isWater(b: number): boolean {
    return !isLand(b);
}

export function isShoreline(b: number): boolean {
    return (b & SHORE_FLAG) !== 0;
}

export function isShore(b: number): boolean {
    return isLand(b) && isShoreline(b);
}

export function isOcean(b: number): boolean {
    return isWater(b) && (b & OCEAN_FLAG) !== 0;
}

export function isLake(b: number): boolean {
    return isWater(b) && !isOcean(b);
}

export function magnitude(b: number): number {
    return b & MAGNITUDE;
}
