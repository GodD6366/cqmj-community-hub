import { PageShell } from "../../components/ui";
import { CyberPanel, DataList } from "../../components/resident-shared";

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
    <PageShell className="max-w-[1500px]">
      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CyberPanel title="社区规则" kicker="Community Rules">
          <DataList items={[
            { label: "目标", hint: "保持真实、透明、友好的社区协作环境" },
            { label: "治理方式", hint: "居民举报 + 管理员审核 + 工单同步" },
            { label: "适用范围", hint: "帖子、闲置、约玩、评论、通知" },
          ]} />
        </CyberPanel>

        <div className="grid gap-4 md:grid-cols-3">
          {communityRules.map((rule) => (
            <CyberPanel key={rule.title} title={rule.title} kicker="Rule Module">
              <div className="grid gap-3">
                {rule.points.map((point) => (
                  <div key={point} className="rounded-[1rem] border border-[var(--border)] bg-[rgba(8,16,16,0.82)] p-3 text-sm leading-6 text-[var(--foreground)]">
                    {point}
                  </div>
                ))}
              </div>
            </CyberPanel>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
