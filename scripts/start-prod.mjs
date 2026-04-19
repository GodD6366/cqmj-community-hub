import net from "node:net";
import { spawn } from "node:child_process";

const DATABASE_CONNECT_TIMEOUT_MS = 60_000;
const DATABASE_RETRY_INTERVAL_MS = 2_000;

function getDatabaseTarget() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const url = new URL(databaseUrl);
  const host = url.hostname;
  const port = Number(url.port || 5432);

  if (!host || Number.isNaN(port)) {
    throw new Error(`Invalid DATABASE_URL: ${databaseUrl}`);
  }

  return { host, port };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTcpConnection(host, port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    socket.once("connect", () => {
      socket.end();
      resolve();
    });

    socket.once("error", (error) => {
      socket.destroy();
      reject(error);
    });
  });
}

async function waitForDatabase() {
  const { host, port } = getDatabaseTarget();
  const deadline = Date.now() + DATABASE_CONNECT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      await waitForTcpConnection(host, port);
      console.log(`Database is reachable at ${host}:${port}`);
      return;
    } catch (error) {
      console.log(
        `Waiting for database at ${host}:${port}... ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await sleep(DATABASE_RETRY_INTERVAL_MS);
    }
  }

  throw new Error(`Timed out waiting for database at ${host}:${port}`);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "null"}`));
    });
  });
}

async function main() {
  const port = process.env.PORT || "3000";

  await waitForDatabase();
  await run("pnpm", ["prisma", "migrate", "deploy"]);
  await run("pnpm", ["exec", "next", "start", "--hostname", "0.0.0.0", "--port", port]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
