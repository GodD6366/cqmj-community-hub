import { Card } from "@heroui/react";
import { communityStats } from "../../lib/mock-data";
import { PageShell, SectionCard } from "../../components/ui";

export default function AboutPage() {
  return (
    <PageShell className="max-w-5xl py-6">
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {communityStats.map((stat) => (
          <SectionCard key={stat.label} className="p-6">
            <Card.Header className="p-0">
              <Card.Description className="text-sm text-slate-500">{stat.label}</Card.Description>
            </Card.Header>
            <Card.Content className="p-0 pt-2">
              <p className="text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
            </Card.Content>
          </SectionCard>
        ))}
      </div>

      <section className="hero-aurora mt-6 rounded-[1.7rem] p-6 text-white">
        <h2 className="text-2xl font-semibold tracking-tight">后续计划</h2>
        <ul className="bullet-list mt-4 text-sm leading-6 text-slate-200">
          <li>接入真实数据库和登录系统</li>
          <li>支持图片上传、消息和交易状态</li>
          <li>增加更完整的治理与审核工具</li>
          <li>做更强的内容治理和风控</li>
        </ul>
      </section>
    </PageShell>
  );
}
