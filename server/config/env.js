import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const parseOrigins = (value) =>
  value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : ["http://localhost:5173"];

const normalizePrivateKey = (value) =>
  typeof value === "string"
    ? value
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/^"|"$/g, "")
    : "";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");

function readLocalServiceAccount() {
  const candidateFiles = [
    "service-account-key.json",
    "key.json",
  ];

  for (const fileName of candidateFiles) {
    const filePath = path.join(projectRoot, fileName);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      const rawValue = fs.readFileSync(filePath, "utf8");
      return JSON.parse(rawValue);
    } catch (error) {
      console.warn(
        `Could not parse local Firebase credentials from ${fileName}.`,
        error.message
      );
    }
  }

  return null;
}

const localServiceAccount = readLocalServiceAccount();
const resolvedProjectId =
  process.env.FIREBASE_PROJECT_ID ||
  localServiceAccount?.project_id ||
  "";
const resolvedClientEmail =
  process.env.FIREBASE_CLIENT_EMAIL ||
  localServiceAccount?.client_email ||
  "";
const resolvedPrivateKey =
  normalizePrivateKey(
    process.env.FIREBASE_PRIVATE_KEY ||
      localServiceAccount?.private_key ||
      ""
  );
const resolvedStorageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  localServiceAccount?.project_id
    ? `${localServiceAccount.project_id}.appspot.com`
    : resolvedProjectId
      ? `${resolvedProjectId}.appspot.com`
      : "";

export const config = {
  port: Number(process.env.PORT || 5000),
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
  firebaseStorageBucket: resolvedStorageBucket,
  firebaseServiceAccountBase64:
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
  firebaseProjectId: resolvedProjectId,
  firebaseClientEmail: resolvedClientEmail,
  firebasePrivateKey: resolvedPrivateKey,
  signedUrlExpiresMinutes: Number(
    process.env.SIGNED_URL_EXPIRES_MINUTES || 15
  ),
};
