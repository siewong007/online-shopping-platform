import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

describe("production nginx security and CSP headers", () => {
  const nginxConf = readFileSync(resolve(import.meta.dir, "../../nginx.conf"), "utf8");

  test("permits Cloudflare Turnstile scripts and frames in Content-Security-Policy", () => {
    expect(nginxConf).toMatch(/script-src[^;]*https:\/\/challenges\.cloudflare\.com/);
    expect(nginxConf).toMatch(/frame-src[^;]*https:\/\/challenges\.cloudflare\.com/);
  });

  test("permits Google Fonts stylesheets and webfont assets in Content-Security-Policy", () => {
    expect(nginxConf).toMatch(/style-src[^;]*https:\/\/fonts\.googleapis\.com/);
    expect(nginxConf).toMatch(/font-src[^;]*https:\/\/fonts\.gstatic\.com/);
  });

  test("prevents caching of the Vite entry document", () => {
    expect(nginxConf).toContain("no-cache, no-store, must-revalidate");
  });
});
