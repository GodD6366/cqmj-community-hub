
import { communityStats } from "../../lib/mock-data";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-slate-500">关于邻里圈</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">一个面向小区的生活服务社区原型</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这个项目的目标不是做一个泛论坛，而是把“发布需求、卖闲置、发帖交流”变成一个有秩序、有治理、能沉淀本地价值的网站。
        </p>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {communityStats.map((stat) => (
          <div key={stat.label} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight">后续计划</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
          <li>• 接入真实数据库和登录系统</li>
          <li>• 支持图片上传、消息和交易状态</li>
          <li>• 增加物业/管理员后台</li>
          <li>• 做更强的内容治理和风控</li>
        </ul>
      </section>
    </main>
  );
}
