### 一些引用(可能有帮助)
<!--rehype:wrap-class=col-span-2 row-span-4-->

:- | --
:- | --
[ACL LOAD](https://redis.io/commands/acl-load)                       | 从配置的 ACL 文件重新加载 ACL
[ACL SAVE](https://redis.io/commands/acl-save)                       | 将当前的 ACL 规则保存在配置的 ACL 文件中
[ACL LIST](https://redis.io/commands/acl-list)                       | 以 ACL 配置文件格式列出当前的 ACL 规则
[ACL USERS](https://redis.io/commands/acl-users)                     | 列出所有配置的ACL规则的用户名
[ACL GETUSER](https://redis.io/commands/acl-getuser)                | 获取特定 ACL 用户的规则
[ACL SETUSER](https://redis.io/commands/acl-setuser)                | 修改或创建特定 ACL 用户的规则
[ACL DELUSER](https://redis.io/commands/acl-deluser)                | 删除指定的 ACL 用户和关联的规则
[ACL CAT](https://redis.io/commands/acl-cat)                        | 列出 ACL 类别或类别内的命令
[ACL GENPASS](https://redis.io/commands/acl-genpass)                | 生成用于 ACL 用户的伪随机安全密码
[ACL WHOAMI](https://redis.io/commands/acl-whoami)                   | 返回关联到当前连接的用户的名称
[ACL LOG](https://redis.io/commands/acl-log)                        | 列出由于 ACL 到位而被拒绝的最新事件
[ACL HELP](https://redis.io/commands/acl-help)                       | 显示有关ACL访问控制的帮助信息
[BGREWRITEAOF](https://redis.io/commands/bgrewriteaof)               | 异步重写 append-only 文件
[BGSAVE](https://redis.io/commands/bgsave)                          | 将数据集异步保存到磁盘
[CONFIG GET](https://redis.io/commands/config-get)                  | 获取配置参数的值
[CONFIG REWRITE](https://redis.io/commands/config-rewrite)           | 用内存中的配置重写配置文件
[CONFIG SET](https://redis.io/commands/config-set)                  | 将配置参数设置为给定值
[CONFIG RESETSTAT](https://redis.io/commands/config-resetstat)       | 重置 INFO 返回的统计数据
[DBSIZE](https://redis.io/commands/dbsize)                           | 返回所选数据库中的键数
[DEBUG OBJECT](https://redis.io/commands/debug-object)              | 获取某个key的调试信息
[DEBUG SEGFAULT](https://redis.io/commands/debug-segfault)           | 使服务器崩溃
[FLUSHALL](https://redis.io/commands/flushall)                      | 从所有数据库中删除所有密钥
[FLUSHDB](https://redis.io/commands/flushdb)                        | 从当前数据库中删除所有键
[LOLWUT](https://redis.io/commands/lolwut)                          | 显示一些计算机信息和 Redis 版本
[LASTSAVE](https://redis.io/commands/lastsave)                       | 获取上次成功保存到磁盘的 UNIX 时间戳
[MEMORY DOCTOR](https://redis.io/commands/memory-doctor)             | 输出内存问题报告
[MEMORY HELP](https://redis.io/commands/memory-help)                 | 显示有关内存的使用帮助
[MEMORY MALLOC-STATS](https://redis.io/commands/memory-malloc-stats) | 显示分配器内部统计
[MEMORY PURGE](https://redis.io/commands/memory-purge)               | 要求分配器释放内存
[MEMORY STATS](https://redis.io/commands/memory-stats)               | 显示内存使用详情(该死，运维的我经常用到)
[MEMORY USAGE](https://redis.io/commands/memory-usage)              | 估计一个键的内存使用
[MODULE LIST](https://redis.io/commands/module-list)                 | 列出服务器加载的所有模块
[MODULE LOAD](https://redis.io/commands/module-load)                | 加载模块
[MODULE UNLOAD](https://redis.io/commands/module-unload)            | 卸载模块
[MONITOR](https://redis.io/commands/monitor)                         | 实时监听服务器收到的所有请求
[SAVE](https://redis.io/commands/save)                               | 将数据集同步保存到磁盘
[SHUTDOWN](https://redis.io/commands/shutdown)                      | 将数据集同步保存到磁盘，然后关闭服务器
[~~SLAVEOF~~](https://redis.io/commands/slaveof)   | 使服务器成为另一个实例的副本，或将其提升为主服务器<br> _(从Redis 5开始<red>弃用</red>，改成 `REPLICAOF`了)_
[REPLICAOF](https://redis.io/commands/replicaof)                    | 使服务器成为另一个实例的副本，或将其提升为主服务器
[SLOWLOG](https://redis.io/commands/slowlog)                        | 管理 Redis 慢查询日志
[SWAPDB](https://redis.io/commands/swapdb)                          | 交换两个Redis数据库
[SYNC](https://redis.io/commands/sync)                               | 用于复制的内部命令(主)
[PSYNC](https://redis.io/commands/psync)                            | 用于复制的内部命令(备)
[LATENCY DOCTOR](https://redis.io/commands/latency-doctor)           | 返回人类可读的延迟分析报告
[LATENCY GRAPH](https://redis.io/commands/latency-graph)            | 返回事件的延迟图
[LATENCY HISTORY](https://redis.io/commands/latency-history)        | 返回事件的时间戳延迟样本
[LATENCY LATEST](https://redis.io/commands/latency-latest)           | 返回所有事件的最新延迟样本
[LATENCY RESET](https://redis.io/commands/latency-reset)            | 重置一个或多个事件的延迟数据
[LATENCY HELP](https://redis.io/commands/latency-help)               | 显示有关不同子命令的有用文本
