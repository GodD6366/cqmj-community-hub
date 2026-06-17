import { CheckIcon, InfoIcon, ShieldIcon } from "@/components/app-icons";

const communityRules = [
  {
    title: "内容规范",
    points: [
      "请使用真实、具体的标题，减少无效沟通。",
      "涉及个人隐私的内容尽量使用站内消息。",
      "禁止广告轰炸、恶意引流和敏感信息泄露。",
    ],
  },
  {
    title: "闲置交易",
    points: [
      "优先支持当面自提，平台不做担保。",
      "价格、成色、是否包邮请在正文写清楚。",
      "若已送出或售出，请及时编辑状态。",
    ],
  },
  {
    title: "举报与治理",
    points: [
      "用户可对违规内容进行举报。",
      "首帖、敏感帖和高风险内容进入人工审核。",
      "管理员可置顶、隐藏或标记为精选。",
    ],
  },
] as const;

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-6 lg:p-8">
      <section className="app-panel-strong p-5 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="section-kicker">COMMUNITY RULES</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight md:text-4xl">社区规则</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
              保持真实、透明、友好的协作环境。规则越清晰，邻里沟通越省力。
            </p>
          </div>
          <div className="flex min-h-20 items-center gap-3 rounded-[var(--radius-panel)] border border-success/20 bg-success/10 p-4 text-success">
            <ShieldIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-black">治理原则</p>
              <p className="mt-1 text-xs leading-5 text-success">先保护居民安全，再提升沟通效率。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {communityRules.map((rule) => (
          <article key={rule.title} className="app-panel p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <InfoIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-base font-black">{rule.title}</h2>
            </div>
            <ul className="mt-3 space-y-2">
              {rule.points.map((point) => (
                <li key={point} className="flex gap-2 rounded-xl border border-border/70 bg-white/72 p-3 text-sm leading-6">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
