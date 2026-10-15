import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Test the Docker runtime layout without Docker, dev dependencies, credentials,
// a Replit environment, or any provider/database requests.
test("compiled app starts with npm and serves frontend + API on one port", async () => {
  const runtime = await mkdtemp(path.join(tmpdir(), "pac-runtime-"));
  try {
    await cp("package.json", path.join(runtime, "package.json"));
    await cp("package-lock.json", path.join(runtime, "package-lock.json"));
    await cp(".npmrc", path.join(runtime, ".npmrc"));
    for (const folder of ["artifacts/api-server", "artifacts/pac-tecnocare", "lib/api-client-react", "lib/api-zod"]) {
      await cp(`${folder}/package.json`, path.join(runtime, folder, "package.json"));
    }
    const install = spawnSync("npm", ["ci", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], {
      cwd: runtime, encoding: "utf8",
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
    });
    assert.equal(install.status, 0, install.stderr);
    for (const folder of ["artifacts/api-server/dist", "artifacts/pac-tecnocare/dist/public"]) {
      await cp(folder, path.join(runtime, folder), { recursive: true });
    }
    for (const override of [undefined, "3107"]) {
      const port = override ?? "3000";
      let output = "";
      const child = spawn("npm", ["start"], {
        cwd: runtime,
        detached: true,
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          NODE_ENV: "production",
          ...(override ? { PORT: override } : {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.on("data", chunk => { output += chunk; });
      child.stderr.on("data", chunk => { output += chunk; });
      try {
        const base = `http://127.0.0.1:${port}`;
        let ready = false;
        for (let i = 0; i < 100; i++) {
          try {
            const health = await fetch(`${base}/api/healthz`);
            if (health.ok) { ready = true; break; }
          } catch { /* wait for startup */ }
          if (child.exitCode !== null) break;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.ok(ready, `npm start failed on ${port}:\n${output}`);
        assert.deepEqual(await (await fetch(`${base}/api/healthz`)).json(), { status: "ok" });
        for (const route of ["/", "/login", "/panel/clientes", "/panel/asistente"]) {
          const response = await fetch(`${base}${route}`, { headers: { Accept: "text/html" } });
          assert.equal(response.status, 200, route);
          assert.match(response.headers.get("content-type"), /text\/html/);
          assert.match(await response.text(), /<div id="root">/);
        }
        const html = await (await fetch(base)).text();
        assert.doesNotMatch(html, /replit-dev-banner|runtime-error-modal|\/@vite\/client/);
        const asset = html.match(/src="([^"]+\.js)"/)?.[1];
        assert.ok(asset, "compiled JS asset");
        assert.equal((await fetch(`${base}${asset}`)).status, 200);
        for (const route of ["/api/not-a-route", "/assets/not-a-file.js"]) {
          assert.equal((await fetch(`${base}${route}`)).status, 404, route);
        }
        const apiMiss = await fetch(`${base}/api/not-a-route`, { headers: { Accept: "text/html" } });
        assert.match(apiMiss.headers.get("content-type"), /application\/json/);
      } finally {
        if (child.pid) {
          try { process.kill(-child.pid, "SIGTERM"); } catch { /* already stopped */ }
        }
        await new Promise(resolve => child.exitCode !== null ? resolve() : child.once("exit", resolve));
      }
    }
    // Build-only plugins are never imported by runtime source.
    const source = await readFile("artifacts/api-server/src/app.ts", "utf8");
    assert.doesNotMatch(source, /@replit|DATABASE_URL/);
  } finally {
    await rm(runtime, { recursive: true, force: true });
  }
});
