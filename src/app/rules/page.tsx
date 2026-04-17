import { Card, Chip } from "@heroui/react";
import { communityRules } from "../../lib/mock-data";
import { PageShell, SectionCard } from "../../components/ui";

export default function RulesPage() {
  return (
    <PageShell className="max-w-5xl py-6">
      <section className="hero-aurora rounded-[1.7rem] p-6 text-white sm:p-8">
        <div className="flex flex-wrap gap-2">
          <Chip color="warning" variant="soft">社区规则</Chip>
          <Chip variant="soft">治理优先</Chip>
        </div>
        <h1 className="editorial-title mt-4 text-3xl font-semibold sm:text-4xl">让邻里圈保持有用、干净、可信</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
          这不是纯聊天站点，而是一个服务小区生活的公共空间。规则越清晰，内容越容易沉淀，用户也越敢发帖。
        </p>
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
    </PageShell>
  );
}
