// Converte durações humanas para milissegundos, usado por env vars de
// retenção/cleanup (ex.: `CHAT_RETENTION="4 weeks"`). Formatos aceites:
//   "30" / "30d"       → 30 dias (número nu = dias)
//   "4 weeks" / "2w"   → semanas
//   "3 months" / "1mo" → meses (30 dias)
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDurationToMs(value: string): number {
    const trimmed = value.trim();
    if (trimmed.length === 0) throw new Error(`Invalid duration: "${value}" (empty)`);

    const match = /^(\d+)\s*(d|day|days|w|week|weeks|mo|month|months)?$/i.exec(trimmed);
    if (!match) {
        throw new Error(
            `Invalid duration: "${value}" — use days, weeks or months (ex.: "30", "4 weeks", "90d", "3 months")`
        );
    }

    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(`Invalid duration: "${value}" — must be a positive number`);
    }

    const unit = (match[2] ?? 'days').toLowerCase();
    const multiplier = unit.startsWith('mo') || unit.startsWith('month')
        ? 30 * DAY_MS
        : unit.startsWith('w')
            ? 7 * DAY_MS
            : DAY_MS;

    return amount * multiplier;
}
