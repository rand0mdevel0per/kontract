# 概览

Konstract 以事件驱动方式组织业务逻辑，使用编译期约束与运行时最小权限访问保证安全性。框架的核心目标是让前后端职责边界清晰，并通过统一的 RPC 与事件通道实现扩展。

## 关键模块

- Storage Proxy：仅访问 storage/transactions 表，执行 MVCC 风格读写
- @backend 编译器：从装饰器提取元信息，生成客户端 stub 与服务端路由
- Middleware：按 prefix、egroup、endpoints 过滤并内联执行
- Raystream：端到端加密通道，优先使用 chacha20-poly1305
- 迁移系统：Schema diff 与安全变更检查
- SSE：统一事件格式输出便于订阅

## 运行流程

1. 开发者以 @backend 定义可远程调用的函数
2. 编译器生成客户端调用与服务端路由
3. 运行时以最小权限访问存储，并在 Middleware 链中执行
4. 事件通过统一格式进行推送或订阅
