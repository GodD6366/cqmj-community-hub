
import { communityRules } from "../../lib/mock-data";

export default function RulesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-slate-500">社区规则</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">让邻里圈保持有用、干净、可信</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这不是纯聊天站点，而是一个服务小区生活的公共空间。规则越清晰，内容越容易沉淀，用户也越敢发帖。
        </p>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {communityRules.map((rule) => (
          <article key={rule.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{rule.title}</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              {rule.points.map((point) => (
                <li key={point} className="rounded-2xl bg-slate-50 p-3">
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}
