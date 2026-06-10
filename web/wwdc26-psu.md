# WWDC26 Platforms State of the Union：Apple 把 AI 塞进了你写的每一行代码

---

## Highlight

今年 Apple 不是在 App 外层贴一个 AI 按钮，而是把 Foundation Models、Core AI 和 App Intents 做成了开发者可以直接调用的原生框架。这意味着你的 Swift 代码本身就能驱动大模型推理、设备端 AI 和 Siri 语义理解，不需要自己搭服务器、写 bridge 或处理隐私合规。

---

## 1. 这场演讲解决什么问题

过去两年，开发者想在自己的 App 里加 AI 功能，通常要走这几步：

1. 选一个模型（OpenAI、Anthropic、Google…）
2. 申请 API Key，处理计费
3. 自己写网络层、缓存层、错误处理
4. 想办法把结果塞回 Swift / SwiftUI
5. 向用户解释"为什么我的聊天记录要发到第三方服务器"

WWDC26 的 Platforms State of the Union 给出了 Apple 的解法：**把 AI 变成系统能力，像调用 Camera 或 Core Location 一样调用模型。**

演讲分三块：Apple Intelligence（你能用 AI 做什么）、Platform Improvements（系统层面的优化）、Developer Productivity（工具链升级）。下面按这个顺序拆解。

---

## 2. Apple Intelligence：从调用 API 到写 Swift 代码

### 2.1 Foundation Models framework — 原生 Swift 里跑大模型

去年 Apple 推出了 Foundation Models framework，让 App 可以直接调用 Apple 自研的端侧模型。今年的升级把它从一个"能用"变成了"好用"：

- **多模态输入**：文本 + 图片同时传给模型
- **服务器模型**：Claude、Gemini 等第三方模型可以通过统一协议接入
- **Dynamic Profiles**：在同一个 Session 里动态切换模型配置
- **免费额度**：年下载量 < 200 万的开发者，使用 Private Cloud Compute 模型不收云 API 费用
- **即将开源**：今年晚些时候框架本身会开源，同一套 API 可以跑在服务器端

Dynamic Profiles 是今年的核心新 API。它解决了一个实际问题：一个 AI 功能通常需要多个阶段（头脑风暴 → 深度推理 → 术语解释），每个阶段对模型的要求不同。以前你要创建多个 Session，现在可以在一个 Session 里切换 Profile：

```swift
import FoundationModels

let session = LanguageModelSession {
    // 阶段 1：头脑风暴，需要高创造力
    Profile("Brainstorm") {
        ModelConfiguration(
            model: .privateCloudCompute,
            temperature: 1.0
        )
    }
    
    // 阶段 2：生成教程，需要深度推理
    Profile("Tutorial") {
        ModelConfiguration(
            model: .privateCloudCompute,
            reasoning: .deep
        )
    }
    
    // 阶段 3：解释术语，用端侧模型就够了
    Profile("Explain") {
        ModelConfiguration(
            model: .systemLanguageModel
        )
    }
}

// 根据应用状态自动切换 Profile
session.activeProfile = appState == .brainstorming ? "Brainstorm" : "Tutorial"
```

关键点：

- `LanguageModelSession` 不是固定配置，而是一个可以动态调整的会话。
- 每个 `Profile` 内部独立配置模型来源、temperature、reasoning 级别。
- 切换 Profile 时，**对话历史（transcript）是连续的**，模型保留了之前的上下文，不需要重复 prompt。
- `ModelConfiguration` 支持 `.privateCloudCompute`（云端，隐私保护）、`.systemLanguageModel`（端侧，零成本）和第三方模型。

### 2.2 Core AI — 把 PyTorch 模型搬到 iPhone 上跑

Foundation Models 适合调用现成的模型。如果你想**自带模型**（比如自己训练的视觉模型或特定领域的 LLM），用 Core AI。

Core AI 是今年的新框架，定位是"在 Apple 设备上跑自定义模型的最佳方式"。

- 支持从 PyTorch 转换模型
- 提供 Swift API 和 Python 工具链
- 自带可视化调试器，可以追踪 tensor 值回溯到原始 Python 源码
- 支持从 iPhone 上的轻量视觉模型到 Mac 上的数十亿参数 LLM
- 零服务器依赖、零 token 成本

```python
# 用 Python 工具链将 PyTorch 模型转换为 Core AI 格式
from coreai.tools import convert

convert(
    source="my_model.pt",
    target="MyModel.coreai",
    optimization="apple_silicon"
)
```

```swift
// 在 Swift 中加载并运行
import CoreAI

let model = try await CoreAIModel(contentsOf: modelURL)
let result = try await model.predict(input: imagePixelBuffer)
```

### 2.3 App Intents + View Annotations — 让 Siri 理解你的 App

App Intents 不是新东西，但今年加了两个关键能力：

1. **Schema**：系统预定义了一套常见 App 类型（任务管理、照片编辑、通讯等）的 Entity 和 Intent 结构。你的 App 只要遵循对应的 Schema，Siri 就能理解你的内容，不需要你定义自然语言模板。
2. **View Annotations**：把 UI 上的视图和 Entity 关联起来，用户可以说"把这张照片发给 Kevin"，Siri 知道"这张照片"指的是屏幕上当前展示的哪一张。

```swift
import AppIntents

// 定义一个可被 Siri 理解的实体
@AppEntity(schema: .communication.message)
struct MessageEntity: IndexedEntity {
    var id: String
    var content: String
    var sender: ContactEntity
    
    static let defaultQuery = MessageQuery()
}

// 在 SwiftUI 视图中标注
struct MessageListView: View {
    let messages: [Message]
    
    var body: some View {
        List(messages) { message in
            MessageRow(message: message)
                .entity(MessageEntity(message))
        }
    }
}
```

关键点：

- `@AppEntity(schema:)` 告诉 Siri 这个实体属于哪个类别（这里是消息）。
- `IndexedEntity` 协议让内容自动进入 Spotlight 语义索引。
- `.entity()` modifier 把 SwiftUI 视图和底层数据模型关联，实现"屏幕内容即语义上下文"。

---

## 3. Platform Improvements：SwiftUI 变快了，iOS App 能resize 了

### 3.1 Liquid Glass 设计更新

去年 iOS 26 引入了 Liquid Glass 设计语言。今年（iOS 27 / macOS 27）的更新包括：

- **自动升级**：已经采用 Liquid Glass 的 App 无需重新编译，在新系统上自动获得改进效果
- **更深的边缘 + 更亮的高光**，增强层次感
- **透明度滑块**：用户可以在设置中调节 Liquid Glass 的透明度（超清到全 tinted）
- **macOS 支持**：macOS 27 也支持 "show borders" 环境值
- **侧边栏扩展**：iPad 和 Mac 上的侧边栏延伸到边缘，图标恢复应用主色
- **Icon Composer 更新**：支持多层 Liquid Glass 叠加和折射效果

一个重要信号：**Xcode 27 编译的 App 将自动使用 Liquid Glass，不再支持回退到旧设计。**

### 3.2 iOS App 可调整大小

iOS App 现在可以在 iPhone Mirroring 和 iPad 上以不同尺寸运行。只要你的 App 使用 SwiftUI、Auto Layout 或响应 size class，重新编译后自动支持。

Xcode 27 提供了 **可调整大小的 Simulator** 和 **Previews**，可以直接在开发阶段测试各种屏幕比例。

```swift
// SwiftUI 自动处理 resize，无需额外代码
struct ContentView: View {
    @Environment(\.horizontalSizeClass) var sizeClass
    
    var body: some View {
        if sizeClass == .compact {
            CompactLayout()
        } else {
            RegularLayout()
        }
    }
}
```

### 3.3 SwiftUI 的新交互和性能

**Reorderable Containers**：任何容器（Grid、Stack）都可以拖拽排序，不再仅限于 List。

```swift
Grid {
    ForEach(origamiModels) { model in
        ModelThumbnail(model)
    }
    .reorderable()       // 让 ForEach 支持拖拽
}
.reorderContainer()     // 让父容器接收拖拽事件
```

**Swipe Actions**：同样从 List 扩展到了任意可滚动容器。

```swift
ScrollView {
    VStack {
        ForEach(items) { item in
            ItemRow(item)
                .swipeActions {
                    Button(role: .destructive) { delete(item) } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
        }
    }
    .swipeActionsContainer()
}
```

**性能提升**（无需修改代码）：

- SwiftUI、AppKit、UIKit 共享更多底层控件实现
- 嵌套 Stack 布局的测量计算优化，resize 速度提升 2 倍
- `@State` 改为宏实现，状态对象延迟初始化，避免重复创建临时实例
- `AsyncImage` 自动使用 HTTP 缓存

**Toolbar 改进**：

```swift
.toolbar {
    ToolbarItem(visibilityPriority: .high) {
        Button("Save") { save() }
    }
    ToolbarItem(visibilityPriority: .low) {
        Button("Archive") { archive() }
    }
    ToolbarItem(placement: .topBarPinnedTrailing) {
        ShareLink(item: document)
    }
}
```

- `.visibilityPriority`：空间不足时优先保留高优先级项
- `.topBarPinnedTrailing`：始终固定在右侧，不受 toolbar 重排影响
- 新的 overflow menu 自动收纳低优先级按钮

### 3.4 Swift 6.4

- **警告管理**：可以局部抑制警告，或把警告提升为错误
- **`anyAppleOS`**：写多平台代码时，不用列一堆 `@available(iOS 27, macOS 27, ...)`，直接写 `@available(anyAppleOS 27)`
- **defer 支持 await**：`defer { await cleanup() }` 现在合法
- **类型检查改进**：之前报"无法在合理时间内完成类型检查"的复杂 SwiftUI 视图体现在能编译通过或给出更准确的错误

---

## 4. Developer Productivity：Xcode 27 的 Agent 和日常体验

### 4.1 Xcode 27 的日常改进

- **主题系统**：编辑器颜色方案扩展到整个 IDE，内置多个主题（Emerald、Neon Noir、Coral Reef），支持每个项目独立主题
- **iCloud 设置同步**：换 Mac 时自动恢复 Xcode 设置、Git 配置
- **一键创建项目**：New Project → App → 直接进入编辑器，不需要先填 bundle ID
- **Device Hub**：取代 Simulator，同一个窗口管理模拟器和真机，支持 pinch、双指滚动，可动态调整 iOS App 尺寸
- **体积减小 30%**：Apple silicon only，组件后台下载

### 4.2 编码 Agent 的深化

Xcode 26 引入了 Coding Agent，Xcode 27 进一步扩展：

- **Agent Client Protocol (ACP)**：任何兼容的 Agent 都可以接入 Xcode
- **Model Context Protocol (MCP)**：Agent 可以操作 Xcode 的工具（预览、文档搜索、构建、测试）
- **内置集成**：Anthropic、OpenAI、Google 的 Agent 开箱即用
- **新工具**：Agent 可以操作 Previews（检查多主题/多语言/多尺寸）、操作 Simulator、本地化、调试

演示中一个典型 workflow：

1. 输入 `/plan` 让 Agent 先出设计方案
2. 审查方案、提出修改意见
3. Agent 自动实现代码
4. Agent 自动运行测试、检查 Previews、验证多语言

### 4.3 Xcode Cloud

- 无需 App Store Connect 设置，一键开启
- 构建速度提升 2 倍
- 支持 Apple Vision Pro 和 Metal on Apple silicon

---

## 5. 开发者该关注什么

| 如果你的 App... | 优先关注 |
|---|---|
| 想做 AI 功能 | Foundation Models framework + Core AI |
| 想让 Siri 理解你的内容 | App Intents Schema + View Annotations |
| 用 SwiftUI 开发 | reorderable、swipeActions、toolbar 改进 |
| 需要跨 Apple 平台 | `anyAppleOS`、Swift 6.4 类型检查优化 |
| 想提升开发效率 | Xcode Agent、Device Hub、Xcode Cloud |
| 维护 iOS App | 检查 resize 适配（特别是自定义布局） |
| 还在用 Intel Mac | 准备迁移到 Apple silicon only |

---

## 6. 相关 Session

这场演讲本身是 Platforms State of the Union 的主线梳理，如果想深入了解演讲中提到的具体技术，推荐下面几场 Session：

- [Build agentic app experiences with the Foundation Models framework](articles.html?year=2026&topic=all&search=242) — Dynamic Profiles 和多模态输入的完整实现
- [Create UI prototypes using agents in Xcode](articles.html?year=2026&topic=all&search=227) — Xcode Agent 从 /plan 到实现到验证的完整 workflow
- [Announcing Apple's next big step for Siri and iPhone](articles.html?year=2026&topic=all&search=121) — Siri AI 和 App Intents Schema 的具体落地
- [WWDC26 Platforms State of the Union Recap](articles.html?year=2026&topic=all&search=122) — 5 分钟快速回顾全文要点

---
