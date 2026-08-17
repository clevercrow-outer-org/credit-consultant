import { NextResponse } from "next/server";
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from "mysql2/promise";

const API_KEY = process.env.CIBIL_PREFILL_API_KEY || process.env.NEXT_PUBLIC_CIBIL_PREFILL_API_KEY || process.env.CREDIT_API_TOKEN || process.env.NEXT_PUBLIC_CREDIT_API_TOKEN || "apikey";
const PREFILL_TABLE = "search_by_mobiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CachedPrefillRow = RowDataPacket & {
  mobile: string;
  full_name: string | null;
  pan_number: string | null;
  date_of_birth: Date | string | null;
  gender: "male" | "female" | "other";
  lookup_status: "FOUND" | "NOT_FOUND" | "API_ERROR";
  raw_api_response: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __creditConsultantMysqlPool: Pool | undefined;
}

function getPool() {
  if (!globalThis.__creditConsultantMysqlPool) {
    globalThis.__creditConsultantMysqlPool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_DATABASE,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      namedPlaceholders: true,
    });
  }

  return globalThis.__creditConsultantMysqlPool;
}

function normalizeDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const ddmmyyyy = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeGender(value: unknown): "male" | "female" | "other" {
  const gender = String(value ?? "").trim().toLowerCase();
  if (gender === "m" || gender === "male") return "male";
  if (gender === "f" || gender === "female") return "female";
  return "other";
}

function formatDateForResponse(value: Date | string | null) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function extractProfile(response: any, fallbackMobile: string) {
  const payload = response?.data?.data ?? response?.data ?? response ?? {};
  const details = payload?.details ?? {};
  const personal = details.personal_info ?? {};
  const identity = details.identity_info ?? {};
  const panNumber = Array.isArray(identity.pan_number) ? identity.pan_number[0]?.id_number : "";

  return {
    fullName: String(personal.full_name ?? "").trim(),
    mobile: String(payload.mobile ?? fallbackMobile).replace(/\D/g, "").slice(-10),
    pan: String(panNumber ?? "").trim().toUpperCase(),
    dob: normalizeDate(personal.dob),
    gender: normalizeGender(personal.gender),
  };
}

function buildCachedFoundResponse(row: CachedPrefillRow) {
  const gender = row.gender === "male" ? "Male" : row.gender === "female" ? "Female" : "";

  return {
    status: true,
    data: {
      mobile: row.mobile,
      details: {
        personal_info: {
          full_name: row.full_name ?? "",
          dob: formatDateForResponse(row.date_of_birth),
          gender,
        },
        identity_info: {
          pan_number: row.pan_number ? [{ id_number: row.pan_number }] : [],
        },
      },
    },
    source: "db_cache",
  };
}

async function getCachedPrefill(connection: PoolConnection, mobile: string) {
  const [rows] = await connection.execute<CachedPrefillRow[]>(
    `SELECT mobile, full_name, pan_number, date_of_birth, gender, lookup_status, raw_api_response
     FROM ${PREFILL_TABLE}
     WHERE mobile = :mobile
     ORDER BY updated_at DESC
     LIMIT 1`,
    { mobile }
  );

  return rows[0] ?? null;
}

async function savePrefillResult(connection: PoolConnection, mobile: string, response: any, httpStatus: number) {
  const profile = extractProfile(response, mobile);
  const hasProfile = Boolean(profile.fullName || profile.pan || profile.dob);
  const lookupStatus = hasProfile && response?.status !== false ? "FOUND" : "NOT_FOUND";
  const existing = await getCachedPrefill(connection, mobile);

  const payload = {
    mobile,
    full_name: hasProfile ? profile.fullName || null : null,
    pan_number: hasProfile ? profile.pan || null : null,
    date_of_birth: hasProfile ? profile.dob : null,
    gender: hasProfile ? profile.gender : "other",
    lookup_status: lookupStatus,
    raw_api_response: JSON.stringify(response ?? { status: false, http_status: httpStatus }),
  };

  if (existing) {
    await connection.execute(
      `UPDATE ${PREFILL_TABLE}
       SET full_name = :full_name,
           pan_number = :pan_number,
           date_of_birth = :date_of_birth,
           gender = :gender,
           lookup_status = :lookup_status,
           raw_api_response = :raw_api_response,
           updated_at = CURRENT_TIMESTAMP
       WHERE mobile = :mobile
       ORDER BY updated_at DESC
       LIMIT 1`,
      payload
    );
  } else {
    await connection.execute(
      `INSERT INTO ${PREFILL_TABLE}
        (mobile, full_name, pan_number, date_of_birth, gender, lookup_status, raw_api_response, created_at, updated_at)
       VALUES
        (:mobile, :full_name, :pan_number, :date_of_birth, :gender, :lookup_status, :raw_api_response, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      payload
    );
  }

  return { lookupStatus, response };
}

async function fetchExternalPrefill(mobile: string) {
  const res = await fetch("https://apibackend.avmanagement.in/api/cibil/prefill-mobile/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-KEY": API_KEY,
    },
    body: JSON.stringify({ mobile }),
  });

  const response = await res.json().catch(() => null);
  return { response, httpStatus: res.status || 400 };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mobile = String(body?.mobile || "").replace(/\D/g, "").slice(-10);

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return NextResponse.json({ status: false, message: "Invalid mobile number" }, { status: 400 });
    }

    let connection: PoolConnection | null = null;

    try {
      connection = await getPool().getConnection();
      await connection.execute("SELECT GET_LOCK(:lockName, 10)", { lockName: `prefill_mobile_${mobile}` });

      const cached = await getCachedPrefill(connection, mobile);
      if (cached) {
        await connection.execute(
          `UPDATE ${PREFILL_TABLE}
           SET updated_at = CURRENT_TIMESTAMP
           WHERE mobile = :mobile
           ORDER BY updated_at DESC
           LIMIT 1`,
          { mobile }
        );

        if (cached.lookup_status === "FOUND") {
          return NextResponse.json(buildCachedFoundResponse(cached));
        }

        return NextResponse.json({ status: false, message: "Prefill failed", source: "db_cache" }, { status: 200 });
      }

      const { response, httpStatus } = await fetchExternalPrefill(mobile);
      const saved = await savePrefillResult(connection, mobile, response, httpStatus);

      if (!response || response?.status === false || saved.lookupStatus !== "FOUND") {
        return NextResponse.json({ status: false, message: response?.message || "Prefill failed" }, { status: httpStatus });
      }

      return NextResponse.json(response);
    } catch (dbError) {
      console.error("[prefill-mobile db cache]", dbError);
    } finally {
      if (connection) {
        await connection.execute("SELECT RELEASE_LOCK(:lockName)", { lockName: `prefill_mobile_${mobile}` }).catch(() => {});
        connection.release();
      }
    }

    const { response, httpStatus } = await fetchExternalPrefill(mobile);
    if (!response || response?.status === false) {
      return NextResponse.json({ status: false, message: response?.message || "Prefill failed" }, { status: httpStatus });
    }
    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error?.message || "Prefill failed" }, { status: 500 });
  }
}
