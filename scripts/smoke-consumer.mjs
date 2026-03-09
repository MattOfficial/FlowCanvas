import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const tempRoot = mkdtempSync(path.join(os.tmpdir(), "flownote-smoke-"));
const consumerDir = path.join(tempRoot, "consumer");

const packageNames = [
  "@flownote/core-geometry",
  "@flownote/command-history",
  "@flownote/diagram-core",
];

function resolveTscBin() {
  const candidates = [
    path.join(repoRoot, "node_modules", "typescript", "bin", "tsc"),
    path.join(repoRoot, "flownote", "node_modules", "typescript", "bin", "tsc"),
  ];

  for (const candidate of candidates) {
    try {
      execFileSync(process.execPath, [candidate, "--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error("Could not find a local TypeScript compiler binary.");
}

function runNpm(args, cwd) {
  const command = ["npm", ...args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg))].join(" ");
  return execSync(command, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

try {
  const packed = new Map();

  for (const name of packageNames) {
    const output = runNpm(
      ["pack", "--silent", "--pack-destination", tempRoot, "--workspace", name],
      repoRoot,
    );
    const tarballName = output.split(/\r?\n/).filter(Boolean).at(-1);
    if (!tarballName) {
      throw new Error(`Failed to pack ${name}`);
    }
    packed.set(name, tarballName);
  }

  mkdirSync(consumerDir, { recursive: true });

  writeFileSync(
    path.join(consumerDir, "package.json"),
    JSON.stringify(
      {
        name: "flownote-smoke-consumer",
        private: true,
        type: "module",
        dependencies: {
          "@flownote/core-geometry": `file:../${packed.get("@flownote/core-geometry")}`,
          "@flownote/command-history": `file:../${packed.get("@flownote/command-history")}`,
          "@flownote/diagram-core": `file:../${packed.get("@flownote/diagram-core")}`,
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  writeFileSync(
    path.join(consumerDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          noEmit: true,
        },
        include: ["index.ts"],
      },
      null,
      2,
    ),
    "utf8",
  );

  writeFileSync(
    path.join(consumerDir, "index.ts"),
    [
      'import { screenToWorld } from "@flownote/core-geometry";',
      'import { History } from "@flownote/command-history";',
      'import { hitTestItems, type DiagramItem } from "@flownote/diagram-core";',
      "",
      "const camera = { x: 10, y: 20, z: 2 };",
      "const world = screenToWorld(20, 40, camera);",
      "const history = new History();",
      "const items: DiagramItem[] = [",
      '  { id: 1, type: "rect", x: 0, y: 0, width: 100, height: 100, color: "#fff", text: "" },',
      "];",
      "const hit = hitTestItems(world.x, world.y, items);",
      "",
      "if (!history || !hit) {",
      '  throw new Error("Package smoke test failed");',
      "}",
      "",
    ].join("\n"),
    "utf8",
  );

  execSync("npm install --ignore-scripts", {
    cwd: consumerDir,
    stdio: "inherit",
  });

  const tscBin = resolveTscBin();
  execFileSync(process.execPath, [tscBin, "-p", path.join(consumerDir, "tsconfig.json")], {
    stdio: "inherit",
  });
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
