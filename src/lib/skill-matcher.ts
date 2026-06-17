import type { NeighborSkillSummary } from "./types";

export interface MatchResult {
  skillId: string;
  score: number;
  reasons: string[];
  source: "llm" | "rule";
}

interface LlmChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

interface LlmMatchItem {
  skillId?: unknown;
  score?: unknown;
  reasons?: unknown;
}

const LLM_BASE_URL = process.env.COMMUNITY_LLM_BASE_URL;
const LLM_API_KEY = process.env.COMMUNITY_LLM_API_KEY;
const LLM_MODEL = process.env.COMMUNITY_LLM_MODEL || "gpt-5.4-mini";

// 简单的降级规则匹配
export function fallbackRuleMatch(
  postContent: string,
  skills: Pick<NeighborSkillSummary, "id" | "category" | "title" | "description" | "tags">[]
): MatchResult[] {
  const contentLower = postContent.toLowerCase();
  const results: MatchResult[] = [];

  for (const skill of skills) {
    let score = 0;
    const reasons: string[] = [];

    const keywords = [skill.category, skill.title, ...skill.tags].map(k => k.toLowerCase());

    // 中文分词要求比较高，这里简化为包含关系
    for (const kw of keywords) {
      if (kw.length > 1 && contentLower.includes(kw)) {
        score += 0.4;
        reasons.push(`帖子内容提及了技能相关的词汇: ${kw}`);
      }
    }

    if (score > 0) {
      results.push({
        skillId: skill.id,
        score: Math.min(score, 1),
        reasons: Array.from(new Set(reasons)),
        source: "rule",
      });
    }
  }

  // 返回得分最高的前5个
  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

export async function matchSkillsForRequest(
  postContent: string,
  availableSkills: Pick<NeighborSkillSummary, "id" | "category" | "title" | "description" | "tags">[]
): Promise<MatchResult[]> {
  if (!availableSkills.length) return [];

  // 如果没有配置大模型，直接降级
  if (!LLM_BASE_URL || !LLM_API_KEY) {
    console.log("No LLM config found, using rule-based matching.");
    return fallbackRuleMatch(postContent, availableSkills);
  }

  try {
    const prompt = `
你是一个智能社区互助匹配助手。请分析以下居民发布的【求助帖子】，并在给定的【可用邻居技能列表】中，找出最能帮助解决问题的技能（最多推荐5个）。

求助帖子内容：
"""
${postContent}
"""

可用邻居技能列表（JSON格式）：
"""
${JSON.stringify(availableSkills.map(s => ({ id: s.id, category: s.category, title: s.title, tags: s.tags })), null, 2)}
"""

请返回匹配结果的 JSON 数组，每个元素包含：
- skillId: 技能的 ID
- score: 匹配度打分（0.0 到 1.0 之间）
- reasons: 推荐理由（数组，用中文简短说明为什么这个技能能帮到他）

返回的 JSON 必须是一个纯数组格式，不要包含任何 markdown 语法（如 \`\`\`json ）。示例：
[
  {
    "skillId": "xxx",
    "score": 0.85,
    "reasons": ["邻居精通电脑维修，符合您的需求"]
  }
]
`;

    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API Error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as LlmChatResponse;
    let resultText = data.choices?.[0]?.message?.content?.trim() || "[]";

    // 容错处理：去除 markdown code block
    if (resultText.startsWith("```json")) {
      resultText = resultText.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (resultText.startsWith("```")) {
      resultText = resultText.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(resultText);

    if (Array.isArray(parsed)) {
      return parsed.map((item: LlmMatchItem) => {
        const score = typeof item.score === "number" ? item.score : Number.parseFloat(String(item.score ?? ""));
        return {
          skillId: typeof item.skillId === "string" ? item.skillId : "",
          score: Number.isFinite(score) ? score : 0.5,
          reasons: Array.isArray(item.reasons) ? item.reasons.filter((reason): reason is string => typeof reason === "string") : [],
          source: "llm" as const,
        };
      }).filter(r => r.skillId).sort((a, b) => b.score - a.score).slice(0, 5);
    }

    throw new Error("Invalid LLM response format");
  } catch (error) {
    console.error("LLM Matching failed, falling back to rule matching:", error);
    return fallbackRuleMatch(postContent, availableSkills);
  }
}
