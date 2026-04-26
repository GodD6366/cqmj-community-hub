#!/usr/bin/env node

import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import process from "node:process";

const ENV_FILES = [".env.local", ".env"];
const EMPTY_BODY_SHA256 = sha256Hex("");

await main();

async function main() {
  try {
    for (const file of ENV_FILES) {
      await loadEnvFile(file);
    }

    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
      printUsage();
      process.exit(0);
    }

    const config = loadConfig();
    const uploadTarget = await buildUploadTarget(args);

    console.log("S3 测试开始");
    console.log(`Bucket: ${config.bucket}`);
    console.log(`Region: ${config.region}`);
    console.log(`Endpoint: ${config.endpoint}`);
    console.log(`Key: ${uploadTarget.key}`);
    console.log(`Source: ${uploadTarget.sourceLabel}`);
    console.log(`Content-Type: ${uploadTarget.contentType}`);
    console.log(`Size: ${uploadTarget.body.length} bytes`);

    const putResult = await signedRequest({
      method: "PUT",
      config,
      key: uploadTarget.key,
      body: uploadTarget.body,
      extraHeaders: {
        "content-type": uploadTarget.contentType,
      },
    });

    if (!putResult.response.ok) {
      failWithResponse("上传失败", putResult.response, await putResult.response.text());
    }

    console.log("上传成功");
    console.log(`HTTP: ${putResult.response.status}`);
    console.log(`ETag: ${putResult.response.headers.get("etag") ?? "(missing)"}`);
    console.log(`Request ID: ${putResult.response.headers.get("x-amz-request-id") ?? "(missing)"}`);

    const headResult = await signedRequest({
      method: "HEAD",
      config,
      key: uploadTarget.key,
    });

    if (!headResult.response.ok) {
      failWithResponse("HEAD 校验失败", headResult.response, await headResult.response.text());
    }

    const remoteLength = Number(headResult.response.headers.get("content-length") ?? "0");
    if (remoteLength !== uploadTarget.body.length) {
      console.error(`远端大小异常: expected=${uploadTarget.body.length}, actual=${remoteLength}`);
      process.exit(1);
    }

    console.log("HEAD 校验成功");
    console.log(`Remote Size: ${remoteLength} bytes`);

    const getResult = await signedRequest({
      method: "GET",
      config,
      key: uploadTarget.key,
    });

    if (!getResult.response.ok) {
      failWithResponse("GET 校验失败", getResult.response, await getResult.response.text());
    }

    const downloadedBody = Buffer.from(await getResult.response.arrayBuffer());
    if (!downloadedBody.equals(uploadTarget.body)) {
      console.error("下载内容与上传内容不一致");
      process.exit(1);
    }

    console.log("GET 校验成功，上传内容一致");

    if (args.cleanup) {
      const deleteResult = await signedRequest({
        method: "DELETE",
        config,
        key: uploadTarget.key,
      });

      if (!deleteResult.response.ok) {
        failWithResponse("清理对象失败", deleteResult.response, await deleteResult.response.text());
      }

      console.log("测试对象已删除");
    }

    if (config.publicBaseUrl) {
      const publicUrl = new URL(joinUrlPath(config.publicBaseUrl, uploadTarget.key));
      console.log(`Public URL: ${publicUrl.toString()}`);
    }

    console.log("S3 测试完成");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function parseArgs(argv) {
  const result = {
    cleanup: false,
    help: false,
    key: "",
    contentType: "",
    filePath: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--cleanup") {
      result.cleanup = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      result.help = true;
      continue;
    }

    if (arg === "--key") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--key 需要传值");
      }
      result.key = value;
      index += 1;
      continue;
    }

    if (arg === "--content-type") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--content-type 需要传值");
      }
      result.contentType = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`不支持的参数: ${arg}`);
    }

    if (result.filePath) {
      throw new Error(`只能传一个文件路径，收到重复参数: ${arg}`);
    }

    result.filePath = arg;
  }

  return result;
}

function loadConfig() {
  const accessKeyId = readRequiredEnv(["S3_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"]);
  const secretAccessKey = readRequiredEnv(["S3_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY"]);
  const region = process.env.S3_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const bucket = readRequiredEnv(["S3_BUCKET", "AWS_BUCKET"]);
  const endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL || `https://s3.${region}.amazonaws.com`;
  const sessionToken = process.env.S3_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN || "";
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL || "";
  const forcePathStyle = readBoolEnv(
    "S3_FORCE_PATH_STYLE",
    Boolean(process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL),
  );

  return {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    endpoint,
    sessionToken,
    publicBaseUrl,
    forcePathStyle,
  };
}

async function buildUploadTarget(args) {
  if (args.filePath) {
    const body = await readFile(args.filePath);
    const contentType = args.contentType || detectContentType(args.filePath);
    const key = normalizeObjectKey(
      args.key ||
        `${process.env.S3_KEY_PREFIX || "test"}/${timestampForKey()}-${basename(args.filePath)}`,
    );

    return {
      body,
      key,
      contentType,
      sourceLabel: args.filePath,
    };
  }

  const body = Buffer.from(
    JSON.stringify(
      {
        ok: true,
        source: "scripts/s3-test.mjs",
        createdAt: new Date().toISOString(),
        random: randomUUID(),
      },
      null,
      2,
    ),
    "utf8",
  );

  const key = normalizeObjectKey(
    args.key || `${process.env.S3_KEY_PREFIX || "test"}/${timestampForKey()}-s3-test.json`,
  );

  return {
    body,
    key,
    contentType: args.contentType || "application/json; charset=utf-8",
    sourceLabel: "(generated payload)",
  };
}

async function signedRequest({ method, config, key, body = Buffer.alloc(0), extraHeaders = {} }) {
  const endpointUrl = buildObjectUrl(config, key);
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = body.length > 0 ? sha256Hex(body) : EMPTY_BODY_SHA256;

  const headers = {
    host: endpointUrl.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...extraHeaders,
  };

  if (config.sessionToken) {
    headers["x-amz-security-token"] = config.sessionToken;
  }

  const signedHeaders = Object.keys(headers)
    .map((name) => name.toLowerCase())
    .sort();

  const canonicalHeaders = signedHeaders
    .map((name) => `${name}:${normalizeHeaderValue(headers[name])}\n`)
    .join("");

  const canonicalRequest = [
    method,
    endpointUrl.pathname,
    endpointUrl.searchParams.toString(),
    canonicalHeaders,
    signedHeaders.join(";"),
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = getSigningKey(config.secretAccessKey, dateStamp, config.region, "s3");
  const signature = hmacHex(signingKey, stringToSign);

  headers.authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`;

  return {
    request: {
      method,
      url: endpointUrl.toString(),
      headers,
    },
    response: await fetch(endpointUrl, {
      method,
      headers,
      body: method === "PUT" ? body : undefined,
    }),
  };
}

function buildObjectUrl(config, key) {
  const endpoint = new URL(config.endpoint);
  const basePath = endpoint.pathname === "/" ? "" : endpoint.pathname.replace(/\/+$/, "");
  const encodedKey = encodePath(key);
  const encodedBucket = encodeURIComponent(config.bucket);

  if (config.forcePathStyle) {
    endpoint.pathname = `${basePath}/${encodedBucket}/${encodedKey}`;
    return endpoint;
  }

  endpoint.hostname = `${config.bucket}.${endpoint.hostname}`;
  endpoint.pathname = `${basePath}/${encodedKey}`;
  return endpoint;
}

async function loadEnvFile(filePath) {
  try {
    const file = await readFile(filePath, "utf8");
    for (const line of file.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const normalized = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
      const separatorIndex = normalized.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const name = normalized.slice(0, separatorIndex).trim();
      const rawValue = normalized.slice(separatorIndex + 1).trim();
      if (!name || process.env[name] !== undefined) {
        continue;
      }

      process.env[name] = parseEnvValue(rawValue);
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

function parseEnvValue(rawValue) {
  if (!rawValue) {
    return "";
  }

  if (
    (rawValue.startsWith("\"") && rawValue.endsWith("\"")) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

function readRequiredEnv(names) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  throw new Error(`缺少环境变量: ${names.join(" / ")}`);
}

function readBoolEnv(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function timestampForKey() {
  return new Date().toISOString().replaceAll(":", "-");
}

function normalizeObjectKey(key) {
  return key.replace(/^\/+/u, "");
}

function detectContentType(filePath) {
  const extension = extname(filePath).toLowerCase();
  const map = {
    ".json": "application/json",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
  };

  return map[extension] || "application/octet-stream";
}

function toAmzDate(date) {
  return date.toISOString().replaceAll(/[:-]|\.\d{3}/g, "");
}

function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

function hmacHex(key, value) {
  return createHmac("sha256", key).update(value).digest("hex");
}

function getSigningKey(secretAccessKey, dateStamp, region, service) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

function normalizeHeaderValue(value) {
  return String(value).trim().replace(/\s+/g, " ");
}

function encodePath(pathname) {
  return pathname
    .split("/")
    .map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, percentEncode))
    .join("/");
}

function percentEncode(char) {
  return `%${char.charCodeAt(0).toString(16).toUpperCase()}`;
}

function joinUrlPath(baseUrl, key) {
  return `${baseUrl.replace(/\/+$/u, "")}/${key.replace(/^\/+/u, "")}`;
}

function failWithResponse(message, response, bodyText) {
  console.error(message);
  console.error(`HTTP: ${response.status} ${response.statusText}`);
  if (bodyText) {
    console.error(bodyText);
  }
  process.exit(1);
}

function printUsage() {
  console.log(`用法:
  node scripts/s3-test.mjs [file-path] [--key object/key] [--content-type mime/type] [--cleanup]

环境变量:
  S3_ACCESS_KEY_ID / AWS_ACCESS_KEY_ID
  S3_SECRET_ACCESS_KEY / AWS_SECRET_ACCESS_KEY
  S3_REGION / AWS_REGION                可选，默认 us-east-1
  S3_BUCKET / AWS_BUCKET
  S3_ENDPOINT / AWS_ENDPOINT_URL        可选，自定义 S3 兼容服务地址
  S3_FORCE_PATH_STYLE                   可选，默认自定义 endpoint 时为 true
  S3_SESSION_TOKEN / AWS_SESSION_TOKEN  可选
  S3_PUBLIC_BASE_URL                    可选，用于输出公开访问链接
  S3_KEY_PREFIX                         可选，默认 test
`);
}
