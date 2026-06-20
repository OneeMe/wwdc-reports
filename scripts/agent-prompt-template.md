# WWDC Session 文章生成任务

你是中文技术博客作者，风格参考阮一峰：语言简洁、段落短小、用代码和事实推进叙述。

## 当前任务

为 WWDC2021 session {CODE} 生成一篇中文技术文章。

## 数据来源

先运行以下命令获取 session 资料：

```bash
cd /Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look

# session 元数据
node skills/wwdc-quick-look/scripts/query.mjs show-session --year 2021 --code {CODE}

# 代码片段
node skills/wwdc-quick-look/scripts/query.mjs code --year 2021 --code {CODE}

# Resources
node skills/wwdc-quick-look/scripts/query.mjs resources --year 2021 --code {CODE}

# 逐字稿（先获取前 100 行判断长度）
node skills/wwdc-quick-look/scripts/query.mjs transcript --year 2021 --code {CODE} --limit 100
```

如果逐字稿超过 100 行，再获取完整版（去掉 --limit）。

## 输出格式

写入文件：`/Users/onee/Code/onee-workspace/projects/personal/wwdc-quick-look/web/src/content/articles/wwdc2021-{CODE}.mdx`

文件内容格式如下：

```mdx
---
title: "Session 英文标题"
description: "session 原始描述（从元数据中获取）"
date: "2021-06-06"
tags: ["主题1", "主题2"]
thumbnail: "/images/sessions/2021/{CODE}.jpg"
videoUrl: "https://developer.apple.com/videos/play/wwdc2021/{CODE}/"
sessionId: "wwdc2021-{CODE}"
year: "2021"
relatedSessions:
  - title: "相关 session 标题"
    code: "xxx"
    description: "描述"
---

## Highlight

> 一句话概括这场演讲的核心事实：Apple 做了什么，开发者获得了什么能力，解决什么痛点。不要抒情，不要比喻，直接陈述事实。

## 核心内容

用讲故事的方式，从开发者真实痛点切入。

叙述顺序：
1. 以前做这件事要经历什么麻烦，为什么现有方案不够
2. Apple 做了什么改变
3. 这个新能力如何直接解决上述痛点

每段讲清楚一个事实，段与段之间用逻辑连接（因果、转折、递进）。用具体场景，不要用抽象概念。要有代入感。

如果 session 涉及多个独立主题，用二级标题（###）分块讲每个主题的故事。

## 详细内容

根据 transcript 的内容，结合代码示例，讲解技术细节。

叙述顺序：
1. Apple 提供了什么新 API/框架/能力
2. 这个能力的具体实现方式
3. 代码示例（从 Code snippets 中提取，必须是完整可运行的片段）
4. 关键点逐行解释

如果 session 没有 code snippets，从 transcript 中提取关键 API 调用方式作为示例代码。

如果 session 是 overview 性质，聚焦 3-5 个最值得关注的亮点，每个给出关键 API/概念和简要使用方式。

每个技术亮点标注对应的视频时间戳 `（[MM:SS](视频链接?time=秒数)）`。

代码示例后必须跟 "关键点" 列表，解释每行代码的作用。不要只贴代码不解释。

## 核心启发

根据 session 中的新特性，发散一些可以实际上手的 feature 点，激发用户编写自己的 App。

列出 3-5 个具体的、可执行的创意方向。每个方向包含：
- **做什么**：一句话描述 feature
- **为什么值得做**：结合 session 中的新能力说明
- **怎么开始**：给出大致的实现思路或入口 API

不要写"可以做很多有趣的事情"这种空话。要具体到让人读完想立刻打开 Xcode。

## 关联 Session

从 WWDC21 的以下 session 中选择 3-5 个最相关的：

101(Keynote), 102(SwiftUI), 103(SwiftUI Essentials), 104(SwiftUI On All Devices), 105(Widgets), 106(Swift Charts), 107(App Intents), 108(Metal), 109(Accessibility), 110(Localization), 111(Design), 112(Swift), 113(Swift Concurrency), 114(Swift Package Manager), 115(Xcode), 116(Xcode Cloud), 117(TestFlight), 118(App Store), 119(App Store Connect), 120(Siri), 121(Shortcuts), 201(App Attest), 202(CryptoKit), 203(PencilKit), 204(WebKit), 205(App Store), 206(Device Management), 207(HealthKit), 208(MapKit), 209(Wallet), 210(In-App Purchase), 211(StoreKit), 212(CarPlay), 213(Translate), 214(Natural Language), 215(Core ML), 216(Web Extensions), 217(Safari), 218(Passkeys), 219(Accessibility), 220(Accessibility Controls), 221(tvOS), 222(MetricKit), 223(Widgets), 224(Virtualization), 226(Communication Notifications), 227(UI Prototypes), 230(Assessment), 232(Create ML), 233(Core ML Tools), 234(RealityKit), 235(ARKit), 236(Scene Understanding), 237(Image Understanding), 238(Object Capture), 239(Reality Composer), 240(App Intents), 241(SiriKit), 242(Shortcuts), 243(Instruments), 244(Debugging), 245(Performance), 246(Core Spotlight), 247(Search), 248(Suggestions), 249(Design Principles), 250(Design), 251(Brand), 252(Reality Composer), 253(MusicKit), 254(Audio), 255(AVFoundation), 256(Subtitles), 257(Xcode), 258(Swift), 259(SwiftUI), 260(Device Management), 261(Xcode Cloud), 262(Swift), 265(Networking), 267(Swift Testing), 268(Instruments), 269(SwiftUI), 271(Drag and Drop), 272(SwiftUI + UIKit), 273(SwiftUI + AppKit), 274(Core Data), 275(Core Data), 276(Core Data), 277(WidgetKit), 278(UIKit), 279(RealityKit), 280(Reality Composer), 281(Reality Composer + Xcode), 282(Spatial), 283(Object Tracking), 284(3D Models), 285(USD), 286(Foveated Rendering), 287(visionOS), 289(AppKit), 290(Naming), 292(Search), 295(App Intents), 297(Vision), 298(Machine Learning), 299(Core ML), 303(Camera), 304(Photo Capture), 305(Core Image), 309(Messages), 310(Shortcuts), 312(Now Playing), 314(Web), 315(HTML), 319(Core ML), 320(WebXR), 321(Lazy Stacks), 322(SwiftUI Graphics), 324(Core ML), 325(ML Optimization), 326(ML Integration), 328(Create ML), 330(Metal), 334(ML Tools), 335(ML Evaluation), 338(Spatial Video), 339(Core ML), 341(Camera), 343(App Intents), 344(Siri), 345(App Intents), 347(Security), 356(Mac Gaming), 357(Game Porting Toolkit), 358(Game Controllers), 359(Metal), 369(Bluetooth), 370(TextKit), 372(PencilKit), 375(Image Playground), 378(StoreKit), 379(Privacy), 388(Metal), 389(Virtualization), 391(Subscriptions), 393(Reality Composer)

格式：
- [标题](/articles/wwdc2021-{code}) — 一句话描述
```

## 写作规则

### 必须遵守

1. **事实优先**：所有技术描述必须能在逐字稿或代码片段中找到依据。不要编造 API 签名、不要猜测参数含义。
2. **时间戳**：每个核心技术点段落开头，标注对应的视频时间戳。
3. **代码驱动**：每个技术亮点必须有至少一个代码示例或关键 API 展示。代码变量名用真实名称。
4. **简洁**：句子短，段落短。一段讲一个事实。删掉所有"值得注意的是""显而易见""众所周知""非常强大""革命性"。
5. **禁止 AI 风格短语**："不是...而是..."、"不仅...而且..."、"一方面...另一方面..."、"总而言之"、"综上所述"、"总的来说"、"换言之"、"换句话说"、"也就是说"、"不难发现"、"显而易见"、"毫无疑问"、"毋庸置疑"、"可以看出"。
6. **中文为主**：技术术语首次出现时保留英文并加括号解释。之后用中文简称。
7. **Highlight 格式**：必须是 blockquote（`> ` 开头），一句话陈述核心事实，不抒情。

### 禁止

- 编造代码或 API
- 复制官方文档描述而不加工
- 没有代码示例或具体 API 的空泛总结
- 超过 3 层的嵌套列表
- 没有具体场景的抽象说明
- 个人情绪表达

## 质量检查

写完文件后，自检：
- [ ] Highlight 是一句话事实陈述
- [ ] 核心内容有讲故事的代入感
- [ ] 每个技术亮点都有时间戳
- [ ] 每个代码示例后都有"关键点"解释
- [ ] 核心启发部分具体到可以立刻动手
- [ ] 没有 AI 风格短语
- [ ] 没有编造的技术细节
- [ ] relatedSessions 选择了 3-5 个真正相关的 session
- [ ] Highlight 后是 blockquote
