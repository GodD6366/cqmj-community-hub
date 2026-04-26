
import type { CommunityPost } from "./types";

export const communityStats = [
  { label: "本周新增帖子", value: "128" },
  { label: "已解决需求", value: "46" },
  { label: "闲置成交/送出", value: "79" },
  { label: "活跃楼栋", value: "18" },
] as const;

export const communityRules = [
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

const seedPostsBase: Omit<CommunityPost, "images">[] = [
  {
    id: "post-aircon-cleaning",
    title: "求助：周末有没有靠谱的空调清洗师傅？",
    content:
      "最近空调开起来有点味道，想找附近上门清洗的师傅。最好周末能来，价格透明一点，欢迎推荐。",
    category: "request",
    tags: ["维修", "家电", "周末"],
    authorName: "3号楼住户",
    createdAt: "2026-04-15T01:40:00.000Z",
    updatedAt: "2026-04-15T01:40:00.000Z",
    commentCount: 3,
    favoriteCount: 8,
    visibility: "building",
    status: "published",
    featured: true,
    comments: [
      {
        id: "comment-1",
        authorName: "楼上邻居",
        content: "我上周刚找过一家，周六能上门，回头私信你联系方式。",
        createdAt: "2026-04-15T02:00:00.000Z",
      },
      {
        id: "comment-2",
        authorName: "物业小管家",
        content: "物业合作师傅也可以联系，价格表在公告栏。",
        createdAt: "2026-04-15T02:20:00.000Z",
      },
      {
        id: "comment-3",
        authorName: "热心邻居",
        content: "记得问清楚是否包含消毒和滤网清洁。",
        createdAt: "2026-04-15T02:35:00.000Z",
      },
    ],
  },
  {
    id: "post-stroller-giveaway",
    title: "闲置：九成新婴儿推车，免费送自提",
    content:
      "孩子大了用不上，推车保养得挺好，适合小月龄宝宝。免费送，先到先得，自提优先。",
    category: "secondhand",
    tags: ["母婴", "免费送", "自提"],
    authorName: "12号楼住户",
    createdAt: "2026-04-15T03:10:00.000Z",
    updatedAt: "2026-04-15T03:10:00.000Z",
    commentCount: 2,
    favoriteCount: 15,
    visibility: "community",
    status: "published",
    pinned: true,
    comments: [
      {
        id: "comment-4",
        authorName: "宝妈邻居",
        content: "还在吗？我想预约一下，今晚方便看吗？",
        createdAt: "2026-04-15T03:20:00.000Z",
      },
      {
        id: "comment-5",
        authorName: "发布者",
        content: "还在，今天晚上七点后都可以。",
        createdAt: "2026-04-15T03:25:00.000Z",
      },
    ],
  },
  {
    id: "post-lobby-lighting",
    title: "公告：今晚 10 点起检修楼道照明",
    content:
      "为处理 5 号楼、6 号楼部分楼道照明故障，今晚 10 点开始维修，预计 1 小时内完成，请居民注意出行安全。",
    category: "discussion",
    tags: ["公告", "维修", "物业"],
    authorName: "物业公告",
    createdAt: "2026-04-15T05:00:00.000Z",
    updatedAt: "2026-04-15T05:00:00.000Z",
    commentCount: 1,
    favoriteCount: 24,
    visibility: "community",
    status: "published",
    pinned: true,
    featured: true,
    comments: [
      {
        id: "comment-6",
        authorName: "8号楼住户",
        content: "收到，辛苦了。",
        createdAt: "2026-04-15T05:15:00.000Z",
      },
    ],
  },
  {
    id: "post-express-locker",
    title: "交流：你们楼下快递柜最拥堵的时间段是什么？",
    content:
      "想统计一下大家取快递的高峰时间，看看要不要和快递柜运营方沟通增加容量。",
    category: "discussion",
    tags: ["快递", "反馈", "社区生活"],
    authorName: "热心业主",
    createdAt: "2026-04-14T08:50:00.000Z",
    updatedAt: "2026-04-14T08:50:00.000Z",
    commentCount: 4,
    favoriteCount: 12,
    visibility: "community",
    status: "published",
    comments: [
      {
        id: "comment-7",
        authorName: "1号楼住户",
        content: "晚上 7 点到 9 点最挤。",
        createdAt: "2026-04-14T09:00:00.000Z",
      },
      {
        id: "comment-8",
        authorName: "2号楼住户",
        content: "周末中午也会排队。",
        createdAt: "2026-04-14T09:10:00.000Z",
      },
      {
        id: "comment-9",
        authorName: "3号楼住户",
        content: "建议增加一个临时取件点。",
        createdAt: "2026-04-14T09:20:00.000Z",
      },
      {
        id: "comment-10",
        authorName: "发布者",
        content: "我会整理一下反馈给物业。",
        createdAt: "2026-04-14T09:35:00.000Z",
      },
    ],
  },
  {
    id: "post-weekend-badminton",
    title: "约玩：周六上午羽毛球 2 缺 2，南门球馆拼场",
    content:
      "目前两位邻居已确定，想再约两位一起打双打。周六上午 10 点到 12 点，AA 场地费，初学者也欢迎来活动一下。",
    category: "play",
    tags: ["羽毛球", "周末", "AA", "组队"],
    authorName: "5号楼住户",
    createdAt: "2026-04-13T11:20:00.000Z",
    updatedAt: "2026-04-13T11:20:00.000Z",
    commentCount: 2,
    favoriteCount: 11,
    visibility: "community",
    status: "published",
    comments: [
      {
        id: "comment-11a",
        authorName: "9号楼住户",
        content: "我可以补一个位置，水平一般，可以吗？",
        createdAt: "2026-04-13T11:35:00.000Z",
      },
      {
        id: "comment-11b",
        authorName: "发布者",
        content: "完全没问题，主要是周末一起动一动，我私信你细节。",
        createdAt: "2026-04-13T11:42:00.000Z",
      },
    ],
  },
  {
    id: "post-moving-help",
    title: "求助：月底搬家，能推荐靠谱的同城搬运吗？",
    content:
      "两张床和一台冰箱要搬，最好是附近找得到的师傅。希望能打包、拆装一起做。",
    category: "request",
    tags: ["搬家", "推荐", "同城"],
    authorName: "7号楼住户",
    createdAt: "2026-04-13T06:15:00.000Z",
    updatedAt: "2026-04-13T06:15:00.000Z",
    commentCount: 1,
    favoriteCount: 6,
    visibility: "community",
    status: "published",
    comments: [
      {
        id: "comment-11",
        authorName: "邻居 A",
        content: "我搬家时用过一队师傅，挺稳的，稍后发你。",
        createdAt: "2026-04-13T07:00:00.000Z",
      },
    ],
  },
  {
    id: "post-book-giveaway",
    title: "闲置：少儿绘本一箱，欢迎免费领取",
    content:
      "孩子已经看完了，里面大多八成新，适合学龄前儿童。附近住户优先，预约后可到门岗取。",
    category: "secondhand",
    tags: ["图书", "免费送", "亲子"],
    authorName: "11号楼住户",
    createdAt: "2026-04-12T12:40:00.000Z",
    updatedAt: "2026-04-12T12:40:00.000Z",
    commentCount: 2,
    favoriteCount: 9,
    visibility: "community",
    status: "published",
    comments: [
      {
        id: "comment-12",
        authorName: "家长邻居",
        content: "太好了，周末方便吗？",
        createdAt: "2026-04-12T13:05:00.000Z",
      },
      {
        id: "comment-13",
        authorName: "发布者",
        content: "周六下午三点后都可以。",
        createdAt: "2026-04-12T13:20:00.000Z",
      },
    ],
  },
  {
    id: "post-community-feedback",
    title: "交流：建议在东门加个外卖临停区",
    content:
      "高峰期外卖电动车经常占道，能不能在东门设置一个短暂停靠区域，减少拥堵？",
    category: "discussion",
    tags: ["建议", "交通", "物业"],
    authorName: "热心业主",
    createdAt: "2026-04-11T04:20:00.000Z",
    updatedAt: "2026-04-11T04:20:00.000Z",
    commentCount: 5,
    favoriteCount: 18,
    visibility: "community",
    status: "published",
    featured: true,
    comments: [
      {
        id: "comment-14",
        authorName: "物业",
        content: "这个建议可行，我们先看现场方案。",
        createdAt: "2026-04-11T04:40:00.000Z",
      },
      {
        id: "comment-15",
        authorName: "3号楼住户",
        content: "支持，尤其晚上太堵了。",
        createdAt: "2026-04-11T04:45:00.000Z",
      },
      {
        id: "comment-16",
        authorName: "6号楼住户",
        content: "可以顺便加一个顺丰临时停靠点。",
        createdAt: "2026-04-11T04:50:00.000Z",
      },
      {
        id: "comment-17",
        authorName: "发布者",
        content: "谢谢大家反馈，我整理一下再给物业。",
        createdAt: "2026-04-11T04:58:00.000Z",
      },
      {
        id: "comment-18",
        authorName: "热心邻居",
        content: "如果能加个夜间提示牌就更好了。",
        createdAt: "2026-04-11T05:05:00.000Z",
      },
    ],
  },
  {
    id: "post-private-help",
    title: "求助：想找楼内安静一点的临时储物建议",
    content:
      "家里装修期需要放几箱杂物，想找楼内临时存放方案。比较敏感，只希望楼内邻居看到。",
    category: "request",
    tags: ["私密", "储物", "装修"],
    authorName: "匿名邻居",
    createdAt: "2026-04-10T15:15:00.000Z",
    updatedAt: "2026-04-10T15:15:00.000Z",
    commentCount: 1,
    favoriteCount: 3,
    visibility: "private",
    status: "pending",
    comments: [
      {
        id: "comment-19",
        authorName: "管理员",
        content: "该帖正在审核中，审核通过后会展示。",
        createdAt: "2026-04-10T15:20:00.000Z",
      },
    ],
  },
];

export const seedPosts: CommunityPost[] = seedPostsBase.map((post) => ({
  ...post,
  images: [],
}));
