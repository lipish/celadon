# Zene 引擎架构优化方案 (面向 Celadon/Web 深度集成)

你好，`Zene` 的作者！目前由于 `Zene` 中的并发架构限制，为了将其作为一个库嵌入到 `Axum` 也就是我们当前的 Celadon 后端中，我们被迫采用了比较“黑魔法”的 `futures::executor::block_on` + 纯粹靠后端轮询读写 `~/.zene/sessions/<id>.json` 文件来给前端提供 SSE 动画流。

为了让 `Zene` 从一个“CLI 本地玩具”蜕变为一个**真正可以作为多智能体底座的、开箱即用的异步 Rust Engine**，我们强烈建议实施以下三大架构重构。

---

## 优化一：全面拥抱 Tokio 异步生态 (消除阻塞炸弹)

**现状痛点：**
当前在 `zene/src/engine/tools.rs`（第 280 和 292 行）中，直接调用了 `engine.blocking_lock()`。此外，内部大量使用了同步的 `std::fs::read_to_string` 和 `std::fs::write`。
这些同步阻塞调用如果放在普通的 Tokio Runtime 线程池里，会立刻触发 `Cannot block the current thread` Panic 死锁。

**重构建议：**
1. **替换锁机制**：将 `engine.blocking_lock()` 统一替换为 `.lock().await`。既然 Zene 定义的所有 tool 执行入口都已经是 `async fn` （比如 `run_python`, `fetch_url`），那么所有的底层关联也必须变为 `async`。
2. **替换 IO 机制**：把 `std::fs` 全部替换为 `tokio::fs`。
   * 修改 `read_file` 变成 `async fn read_file`。
   * 修改 `write_file` 变成 `async fn write_file`。
   * 修改 `apply_patch` 变成 `async fn apply_patch`。
3. **最终目标**：只要把所有的同步磁盘 IO 和同步锁拔掉，Zene 就可以毫无痛苦地被 `tokio::task::spawn_blocking` 甚至普通的 `tokio::spawn` 所调度，彻底融入现代 Rust 异步服务。

---

## 优化二：原生支持 Event Stream MPSC 通道 (告别物理文件轮询)

**现状痛点：**
为了让前端表现出动态打字机效果，我们后端不得不每 500ms 去检查 `session.json` 磁盘文件的体积变化。这种做法极其低效且丑陋，而且一旦断电或 IO 延迟，容易丢失中间状态。

**重构建议：**
Zene 目前只在执行完以后返回最终结果，可以在设计上提供一个“流式模式”。
1. 在 `ZeneEngine::run` 中，增加一个可选的异步发送端：
```rust
use tokio::sync::mpsc::UnboundedSender;
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub enum ZeneEvent {
    Thought(String),           // 接收到了 LLM 的普通文本（非工具调用阶段）
    ToolStarted { name: String, args: String }, // 即将调用 `search_code`...
    ToolFinished { name: String, result: String }, // 工具返回结果
    TaskComplete,
}
```
2. 当内部的 `llm_connector` 收集中间迭代的时候，往 `sender` 发送这些事件。
3. **最终收益**：有了这个接口，像 Celadon 这样的第三方宿主，只需调用 `let mut rx = engine.run_stream(req).await;`，就能用原生零延迟的方法把流透传给 SSE (Server-Sent Events) 给 Web 前端，而不用再去做脏兮兮的文件 Tail。

---

## 优化三：新增“Workspace State Diff”上下文事件

**现状痛点：**
智能体目前能修改文件，但是对于上层 UI（比如 Celadon 页面左侧漂亮的 FileTree）来说，它根本不知道智体做了什么改动，除非每次都在全盘扫描工作区。

**重构建议：**
在执行 `write_file`、`apply_patch` 工具的时候，Zene 引擎内部非常清楚哪些文件的几行代码被修改了。此时可以在第二点提到的 `ZeneEvent` 中抛出一个新的枚举：
```rust
ZeneEvent::FileChanged {
    path: String,          // 绝对路径或相对工作区的路径
    status: String,        // "CREATED", "MODIFIED", "DELETED"
    lines_affected: usize
}
```
**最终收益**：上层 Web UI 一监听到这个事件，就可以立马对页面渲染，如文件名称标黄、高亮，向用户展示出堪比 Cursor / IDE 的极致沉浸感体验。

---

### 总结
如果能实现这三个特性（**彻底非阻塞化**、**原生事件流 MPSC**、**工作区状态抛错**），Zene 就具备了作为商业级 Web AI 底座的条件，我们的调用层也将瞬间减少一半以上的黑魔法胶水代码！
