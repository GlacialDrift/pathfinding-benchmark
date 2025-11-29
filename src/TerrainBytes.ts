// constants to extract information from map Bytes
const LAND_FLAG: number = 0b1000_0000;
const SHORE_FLAG: number = 0b0100_0000;
const OCEAN_FLAG: number = 0b0010_0000;
const MAGNITUDE: number = 0b0001_1111;

/**
 * Decodes the raw byte to determine if the tile is land
 * @param b - raw byte
 */
export function isLand(b: number): boolean {
    return (b & LAND_FLAG) !== 0;
}

/**
 * Decodes the raw byte to determine if the tile is water
 * @param b - raw byte
 */
export function isWater(b: number): boolean {
    return !isLand(b);
}

/**
 * Decodes the raw byte to determine if the tile is shoreline.
 *
 * Shoreline is defined as any tile of a given type (land or water) that has the opposite type (water or land) as one
 * of its adjacent 4-neighbors
 * @param b - raw byte
 */
export function isShoreline(b: number): boolean {
    return (b & SHORE_FLAG) !== 0;
}

/**
 * Decodes the raw byte to determine if the tile is on the shore.
 *
 * Shore tiles are defined as land tiles with one of its adjacent 4-neighbors being a water tile.
 * @param b - raw byte
 */
export function isShore(b: number): boolean {
    return isLand(b) && isShoreline(b);
}

/**
 * Decodes the raw byte to determine if the tile is part of the Ocean.
 *
 * The ocean is the largest contiguous body of water on the map. Therefore, rivers and even some "lakes" are considered
 * part of the ocean. All water tiles that are not connected to this body of water are "lakes"
 * @param b - raw byte
 */
export function isOcean(b: number): boolean {
    return isWater(b) && (b & OCEAN_FLAG) !== 0;
}

/**
 * Decodes the raw byte to determine if the tile is part of a Lake.
 * @param b - raw byte
 */
export function isLake(b: number): boolean {
    return isWater(b) && !isOcean(b);
}

/**
 * Decodes the raw byte to extract the magnitude of the land (its height).
 * @param b - raw byte
 */
export function magnitude(b: number): number {
    return b & MAGNITUDE;
}
