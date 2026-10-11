// Generates the RSA key pair the bookmarklet uses to encrypt LMS tokens.
//
//   npm run keys            -> writes CONNECT_PRIVATE_KEY to .dev.vars (local dev)
//   npm run keys -- --print -> prints the private JWK, for `wrangler secret put CONNECT_PRIVATE_KEY`
//
// Rotating the key invalidates bookmarklets people already saved; they need to add it again.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const { privateKey } = await crypto.subtle.generateKey(
  { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["encrypt", "decrypt"],
);
const jwk = JSON.stringify(await crypto.subtle.exportKey("jwk", privateKey));

if (process.argv.includes("--print")) {
  process.stdout.write(jwk + "\n");
} else {
  const path = ".dev.vars";
  const lines = existsSync(path)
    ? readFileSync(path, "utf8").split("\n").filter((l) => l && !l.startsWith("CONNECT_PRIVATE_KEY="))
    : [];
  lines.push(`CONNECT_PRIVATE_KEY='${jwk}'`);
  writeFileSync(path, lines.join("\n") + "\n", { mode: 0o600 });
  console.log("Wrote CONNECT_PRIVATE_KEY to .dev.vars");
}
