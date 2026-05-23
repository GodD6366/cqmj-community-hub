import { Card, Chip } from "@heroui/react";
import { PageShell, SectionCard } from "../../components/ui";

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
    <PageShell className="max-w-5xl py-6">
      <div className="mobile-resident-only mobile-resident-stack">
        <section
          className="mobile-resident-hero mobile-resident-enter text-white"
          style={{
            animationDelay: "40ms",
            background:
              "radial-gradient(circle at 16% 18%, rgba(237,170,92,0.3), transparent 24%), radial-gradient(circle at 84% 12%, rgba(96,188,255,0.22), transparent 22%), linear-gradient(160deg, #1d1e2f 0%, #2b3156 46%, #41487f 100%)",
          }}
        >
          <Chip color="warning" variant="soft">社区规则</Chip>
          <div className="mobile-resident-kicker mt-5 text-white/72">社区规则</div>
          <h1 className="mobile-resident-title mt-4 max-w-[9ch]">社区规则</h1>
        </section>

        {communityRules.map((rule, index) => (
          <section
            key={rule.title}
            className="mobile-resident-panel mobile-resident-enter"
            style={{ animationDelay: `${120 + index * 80}ms` }}
          >
            <div className="mobile-resident-kicker text-[#315d8f]">规则</div>
            <h2 className="mobile-resident-panel-title">{rule.title}</h2>
            <div className="mt-4 grid gap-2.5">
              {rule.points.map((point) => (
                <div key={point} className="rounded-[1.2rem] bg-white/82 p-3 text-sm leading-6 text-slate-700 shadow-[0_12px_26px_rgba(58,75,124,0.06)]">
                  {point}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="hidden md:block">
        <section className="hero-aurora rounded-[1.7rem] p-6 text-white sm:p-8">
          <Chip color="warning" variant="soft">社区规则</Chip>
          <h1 className="editorial-title mt-4 text-3xl font-semibold sm:text-4xl">社区规则</h1>
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {communityRules.map((rule) => (
            <SectionCard key={rule.title} className="p-6">
              <Card.Header className="p-0">
                <Card.Title className="text-xl font-semibold tracking-tight text-slate-900">{rule.title}</Card.Title>
              </Card.Header>
              <Card.Content className="mt-4 space-y-3 p-0 text-sm leading-6 text-slate-700">
                {rule.points.map((point) => (
                  <div key={point} className="rounded-2xl bg-[var(--surface-muted)] p-3">
                    {point}
                  </div>
                ))}
              </Card.Content>
            </SectionCard>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
