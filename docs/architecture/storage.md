# 存储与迁移

StorageRegistry 由类型抽取生成，用于统一暴露存储表的类型入口。迁移系统基于 Schema diff 判断变更安全性，并生成可执行的 SQL 片段。

## StorageRegistry

将接口声明转换为 registry 键，便于运行时通过类型安全的 key 获取 TableProxy。

## 迁移策略

- 字段新增被视为安全变更
- 字段删除或类型变更视为不安全变更
- SQL 生成以 ALTER TABLE ADD COLUMN 为基础
