# @fett/web-snapshot

基于localstorage 的 web 快照方案

## 使用

##### 安装

```bash
  pnpm install @fett/web-snapshot
```

##### 初始化快照

```js
import snapshot from "@fett/web-snapshot";
// 初始化快照的时候有有效快照会直接使用快照
const snapshot = new Snapshot({
  id: "TMALLFANG",
  expired: 86400000,
});
```
##### 参数说明
|参数|类型|默认值|说明｜
|---|:---:|:---:|---|
|id|string|''|快照id|
|expired|number|86400000|快照过期时间|

##### 更新快照
```js
snapshot.update();
```

##### 显示快照
```js
snapshot.show();
```

##### 隐藏快照
```js
snapshot.hidden();
```

##### 示例查看
```bash
npm run example  ## 启动本地服务查看示例
```

