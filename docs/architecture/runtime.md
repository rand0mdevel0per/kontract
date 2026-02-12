# 运行时

运行时负责承载会话、权限、MVCC 读写与事件派发。其核心目标是以最小权限访问数据库，同时保证并发一致性。

## SessionDO

会话负责分配 txid，并在 MVCC 查询中使用 currentTxid 过滤可见版本。

## Storage Proxy

Storage Proxy 以表指针形式隔离真实表名，并通过 ptr 缓存减少元数据查询成本。

## 事件通道

事件输出采用统一格式，便于 SSE 与其他订阅通道复用。
