# KNW-019 — 天气组件设计

**日期：** 2026-06-07
**负责人：** Sarah

---

## 范围

在 Dashboard 顶部问候语行右侧显示当前天气（图标 + 温度 + 城市名）。

**不在范围内：** 天气预报、手动设置城市、历史天气。

---

## 文件

| 文件 | 操作 |
|------|------|
| `app/api/weather/route.ts` | 新建 — GET /api/weather |
| `app/dashboard/page.tsx` | 修改 — 加入天气组件逻辑 |
| `.env.local` (文档) | 新增 `OPENWEATHERMAP_API_KEY` |

---

## API：GET /api/weather

**Query params：** `lat` (float), `lon` (float)

**Auth：** 需要登录，未登录返回 401。

**逻辑：**
1. 验证 lat/lon 参数合法（-90≤lat≤90，-180≤lon≤180），否则 400。
2. 调用 OpenWeatherMap Current Weather API：
   `https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={key}&units=metric&lang=zh_cn`
3. 提取并返回：

```json
{
  "temp": 22,
  "description": "多云",
  "icon": "02d",
  "city": "北京市"
}
```

**icon 含义：** OpenWeatherMap 图标代码，前端用 emoji 映射（见下）。

**错误：** OpenWeatherMap 调用失败 → 返回 502。

**环境变量：** `OPENWEATHERMAP_API_KEY`（必须，缺失时启动警告）

**runtime：** `export const runtime = "nodejs"`（避免 edge runtime 限制）

---

## 前端逻辑（dashboard/page.tsx）

1. 组件挂载后调用 `navigator.geolocation.getCurrentPosition()`。
2. 成功 → 调 `/api/weather?lat=X&lon=Y`。
3. 展示在问候语行右侧：`⛅ 22° 北京市`
4. **任何失败（拒绝授权、API 错误、超时）→ 静默不显示，不影响其他内容。**

### Icon Emoji 映射

| 代码前缀 | Emoji |
|---------|-------|
| `01` | ☀️ |
| `02` | ⛅ |
| `03` / `04` | ☁️ |
| `09` / `10` | 🌧️ |
| `11` | ⛈️ |
| `13` | 🌨️ |
| `50` | 🌫️ |
| 其他 | 🌡️ |

### 样式

```
早上好，张三 👋           ⛅ 22° 北京市
```

天气部分：`text-sm text-white/80`（在绿色背景上），使用 flex justify-between 与问候语并排。
