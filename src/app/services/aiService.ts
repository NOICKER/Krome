import { SeverityLevel } from "../types";

export type InsightPatternKind =
  | "weekly_momentum"
  | "execution_gap"
  | "protection_ratio"
  | "abandonment"
  | "interrupt_cost";

export interface InsightPatternPayload {
  kind: InsightPatternKind;
  severityLevel: SeverityLevel;
  dataMirror: string;
  subjectName?: string;
  metric?: string;
}

interface InsightTextResult {
  title: string;
  guidance: string;
}

function getFallbackInsightText(payload: InsightPatternPayload): InsightTextResult {
  const subjectLabel = payload.subjectName ? `${payload.subjectName} ` : "";

  switch (payload.kind) {
    case "execution_gap":
      return {
        title: `${subjectLabel}Execution Gap`.trim(),
        guidance:
          payload.severityLevel >= SeverityLevel.Direct
            ? "Planned allocation and executed work are far apart. Narrow the next commitment and protect one clean block first."
            : "Execution is trailing the plan. Tighten the next session scope before the gap compounds.",
      };
    case "protection_ratio":
      return {
        title: `${subjectLabel}Protection Ratio`.trim(),
        guidance:
          payload.severityLevel >= SeverityLevel.Direct
            ? "Interruptions are overrunning the block. Remove one known source before you start again."
            : "Protection is softening. Guard the setup so the next session stays intact.",
      };
    case "abandonment":
      return {
        title: `${subjectLabel}Abandon Pattern`.trim(),
        guidance:
          payload.severityLevel >= SeverityLevel.Direct
            ? "Quit signals are repeating. Reduce target size and make the next finish non-negotiable."
            : "Abandonments are clustering. A narrower intent would likely protect completion.",
      };
    case "interrupt_cost":
      return {
        title: `${subjectLabel}Interrupt Cost`.trim(),
        guidance:
          payload.severityLevel >= SeverityLevel.Concern
            ? "Interrupt time is now shaping the week. Eliminate the dominant interruption before the next block."
            : "Interruptions are measurable now. Clean up the most common cause while the cost is still small.",
      };
    case "weekly_momentum":
    default:
      return {
        title: "Weekly Momentum",
        guidance:
          payload.severityLevel >= SeverityLevel.Concern
            ? "The weekly line is slipping. A protected session today would materially change the week."
            : "Momentum is still recoverable. Keep the next sessions deliberate and finishable.",
      };
  }
}

function parseHeroApiResult(content: string, fallback: InsightTextResult): InsightTextResult {
  try {
    const parsed = JSON.parse(content) as Partial<InsightTextResult>;
    return {
      title: parsed.title?.trim() || fallback.title,
      guidance: parsed.guidance?.trim() || fallback.guidance,
    };
  } catch {
    return {
      title: fallback.title,
      guidance: content.trim() || fallback.guidance,
    };
  }
}

export async function renderInsightText(payload: InsightPatternPayload): Promise<InsightTextResult> {
  const fallback = getFallbackInsightText(payload);
  const chatUrl = import.meta.env.VITE_HEROAPI_CHAT_URL?.trim();
  const apiKey = import.meta.env.VITE_HEROAPI_API_KEY?.trim();
  const model = import.meta.env.VITE_HEROAPI_MODEL?.trim();

  if (!chatUrl || !apiKey || !model) {
    return fallback;
  }

  try {
    const response = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You convert deterministic study-discipline flags into concise JSON with keys title and guidance. Do not invent new metrics.",
          },
          {
            role: "user",
            content: JSON.stringify(payload),
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return fallback;
    }

    return parseHeroApiResult(content, fallback);
  } catch {
    return fallback;
  }
}
