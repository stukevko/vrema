/**
 * Minimaler, RFC-konformer CSV-Parser (RFC 4180 in der praktischen Variante).
 * Reicht für Mitarbeiter-Imports vollkommen aus und vermeidet eine externe Dep.
 */

export type CsvRow = Record<string, string>;

const HEADER_ALIASES: Record<string, string> = {
  name: "name",
  vollername: "name",
  fullname: "name",
  mitarbeiter: "name",
  email: "email",
  "e-mail": "email",
  mail: "email",
  role: "role",
  rolle: "role",
  weeklyhours: "weeklyHours",
  wochenstunden: "weeklyHours",
  stunden: "weeklyHours",
};

function splitCsvLine(line: string): string[] {
  // RFC-4180-konform: " kann durch "" escaped werden, , trennt Felder.
  const out: string[] = [];
  let i = 0;
  let current = "";
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === "," || ch === ";") {
      out.push(current);
      current = "";
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  out.push(current);
  return out.map((c) => c.trim());
}

export function parseCsv(content: string): CsvRow[] {
  // Robuster Line-Splitter (\r\n, \n, \r)
  const lines = content.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const rawHeaders = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ""));
  const headers = rawHeaders.map((h) => HEADER_ALIASES[h] ?? h);
  const rows: CsvRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = splitCsvLine(lines[li]);
    const row: CsvRow = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = cols[i] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

export type ImportRowDiagnosis =
  | { status: "ok"; name: string; email: string; role: "EMPLOYEE" | "MANAGER"; weeklyHours: number }
  | { status: "duplicate"; name: string; email: string }
  | { status: "invalid"; reason: string; raw: CsvRow };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function diagnoseRows(rows: CsvRow[]): ImportRowDiagnosis[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    const name = (row.name ?? "").trim();
    const email = (row.email ?? "").toLowerCase().trim();
    const roleRaw = (row.role ?? "").toLowerCase().trim();
    const hoursRaw = (row.weeklyHours ?? "").replace(",", ".").trim();

    if (!name) return { status: "invalid", reason: "Name fehlt", raw: row };
    if (!email) return { status: "invalid", reason: "E-Mail fehlt", raw: row };
    if (!EMAIL_REGEX.test(email)) return { status: "invalid", reason: "E-Mail-Format ungültig", raw: row };

    if (seen.has(email)) return { status: "duplicate", name, email };
    seen.add(email);

    const role: "EMPLOYEE" | "MANAGER" =
      roleRaw === "manager" || roleRaw === "leitung" || roleRaw === "lead" ? "MANAGER" : "EMPLOYEE";

    const hoursNumber = Number(hoursRaw);
    const weeklyHours = Number.isFinite(hoursNumber) && hoursNumber > 0 ? Math.min(60, hoursNumber) : 40;

    return { status: "ok", name, email, role, weeklyHours };
  });
}
