import { loadMapFromName } from "./LoadMap.ts";

const africa = loadMapFromName("africa");
console.log(africa.neighbors(22, 22));
