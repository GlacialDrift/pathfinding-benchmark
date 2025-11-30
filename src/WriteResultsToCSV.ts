import * as fs from "fs";
import * as path from "path";
import type { TransportTestResult } from "./Utils.ts";

// Output row shape (the selected fields)
interface CsvRow {
    id: string;
    version: string;
    method: string;
    target_x: number;
    target_y: number;
    sourceCenter_x: number;
    sourceCenter_y: number;
    sourceRadius: number;
    source_x: number;
    source_y: number;
    visited: number;
}

function escapeCsv(value: any): string {
    if (value === undefined || value === null) return "";
    let str = String(value).replace(/"/g, '""');
    if (/[",\n\r]/.test(str)) str = `"${str}"`;
    return str;
}

function rowsToCsv(rows: CsvRow[]): string {
    if (rows.length === 0) return "";

    const headers: (keyof CsvRow)[] = [
        "id",
        "version",
        "method",
        "target_x",
        "target_y",
        "sourceCenter_x",
        "sourceCenter_y",
        "sourceRadius",
        "source_x",
        "source_y",
        "visited",
    ];

    const headerLine = headers.join(",");
    const lines = rows.map((row) =>
        headers.map((h) => escapeCsv(row[h])).join(","),
    );

    return [headerLine, ...lines].join("\n");
}

async function main() {
    const [inputDir, outputCsv] = process.argv.slice(2);

    if (!inputDir || !outputCsv) {
        console.error(
            "Usage: ts-node json-to-csv.ts <json-directory> <output.csv>",
        );
        process.exit(1);
    }

    const dir = path.resolve(inputDir);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

    if (files.length === 0) {
        console.error("No JSON files found in directory:", dir);
        process.exit(1);
    }

    const rows: CsvRow[] = [];

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const content = fs.readFileSync(fullPath, "utf8");

        if (!content.trim()) {
            console.warn(`Skipping empty file: ${file}`);
            continue;
        }

        try {
            const json = JSON.parse(content) as TransportTestResult;

            const row: CsvRow = {
                id: json.id,
                version: json.version,
                method: json.method,
                target_x: json.target?.x,
                target_y: json.target?.y,
                sourceCenter_x: json.sourceCenter?.x,
                sourceCenter_y: json.sourceCenter?.y,
                sourceRadius: json.sourceRadius,
                source_x: json.source?.x,
                source_y: json.source?.y,
                visited: json.visited,
            };

            rows.push(row);
        } catch (err) {
            console.error("Failed to parse JSON in file:", file, err);
        }
    }

    const csv = rowsToCsv(rows);
    fs.writeFileSync(path.resolve(outputCsv), csv, "utf8");

    console.log(`Wrote ${rows.length} row(s) to ${outputCsv}`);
}

main().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});
