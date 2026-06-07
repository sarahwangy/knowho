# KNW-018 — 日历视图设计

**日期：** 2026-06-07
**负责人：** Sarah

---

## 范围

新增独立日历页 `/calendar`，展示联系人重要日期（生日、纪念日、自定义）的月视图。底部导航增加「日历」tab。

**不在范围内：** 在日历上直接创建/编辑日期、多月视图、提醒推送。

---

## 文件

| 文件 | 操作 |
|------|------|
| `app/api/calendar/route.ts` | 新建 — GET /api/calendar |
| `app/calendar/page.tsx` | 新建 — 日历页面 |
| `components/nav.tsx` | 修改 — 增加第三个 tab |

---

## API：GET /api/calendar

**Query params：** `year` (number), `month` (number, 1-12)

**Auth：** 需要登录，未登录返回 401。

**Response：**
```json
[
  {
    "contactId": "clxxx",
    "contactName": "张三",
    "type": "生日",
    "label": null,
    "month": 6,
    "day": 15
  }
]
```

**逻辑：** 查询当前用户所有联系人的 importantDates，过滤 month === 请求月份，按 day 排序。year 参数当前仅用于前端一致性，后端不过滤（重要日期只存 month+day）。

**错误：** year/month 不合法返回 400。DB 错误返回 500。

---

## 页面：/calendar

Client Component，URL 状态：`?year=2026&month=6`，默认当前年月。

### 布局

```
[ < ]  2026年6月  [ > ]
日 一 二 三 四 五 六
      1  2  3  4  5  6
 7  8  9 10 11 12 13
14 15 16 17 18 19 20
21 22 23 24 25 26 27
28 29 30
```

- 今天的日期：绿色圆圈高亮
- 有重要日期的那天：下方绿色小点（最多3个点，超出不再加点）
- 空格补齐：月初第一天前用空格占位

### 交互

点击有点的日期 → 底部弹出浮层（bottom sheet）：
```
6月15日
• 🎂 张三 — 生日
• 📌 李四 — 相识纪念日
```
每行可点击，跳转到对应联系人 profile `/people/:id`。

点击无点的日期：无响应。

### 加载状态

骨架屏：整个网格区域显示灰色占位块。

### 降级

API 返回错误 → 显示「加载失败，请刷新重试」，网格仍然渲染（无点）。

---

## 导航修改

`components/nav.tsx` 增加第三个 tab：

- label：日历
- icon：`Calendar`（lucide-react）
- href：`/calendar`

---

## 颜色

沿用项目规范：
- 今天高亮：`bg-[#7a9e6a] text-white`
- 日期小点：`bg-[#7a9e6a]`
- 浮层按钮文字：`text-[#2d2926]`
