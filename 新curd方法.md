# 使用说明
1. 请求地址: `http://localhost:8008/_pligins/gw/curd`
2. 请求方法统一为post;
3. 固定参数
```typescript
interface QuerBody {
  table:string; // 表名
  method:"create"|"update"|"read"|"delete"; // 本数据操作类型 分别是: 新建 修改 读取 删除
  data: Object; // 请求体根据操作类型不同而不同 例如下方: 批量新增行记录,批量更新行记录,获取行记录列表,批量删除行记录
}
```


# 筛选器使用指南

## 筛选器结构

### 基本语法

```typescript
Filter = {
  type: 'group' | 'condition';
  // 当 type 为 'group' 时的字段
  logic?: 'AND' | 'OR';
  children?: Filter[]; // 只能全是group或全是condition，不能混合使用。最多只能使用两层children
  // 当 type 为 'condition' 时的字段
  field?: string; // 字段ID或别名
  operator?: FilterOperator; // 运算符
  value?: any; // 值（字符串、数值、数组）
}
```

## 支持的运算符

### 比较运算符

| 运算符 | 描述 | 示例值 |
|--------|------|--------|
| `eq` | 等于 | `"Beijing"` 或 `["<targetid>"]` |
| `ne` | 不等于 | `"London"` 或 `["<targetid>"]` |
| `gt` | 大于 | `20` 或 `"2025-02-06 00:00:00"` |
| `ge` | 大于等于 | `10` |
| `lt` | 小于 | `20` |
| `le` | 小于等于 | `100` |
| `in` | 是其中一个 | `["value1", "value2"]` |
| `notin` | 不是任意一个 | `["value1", "value2"]` |
| `contains` | 包含 | `"Ch"` 或 `["销售部", "市场部"]` |
| `notcontains` | 不包含 | `"Ch"` 或 `["销售部", "市场部"]` |
| `concurrent` | 同时包含 | `["<id1>", "<id2>"]` |
| `belongsto` | 属于 | `["<departmentid>"]` |
| `notbelongsto` | 不属于 | `["<departmentid>"]` |
| `startswith` | 开头是 | `"张"` |
| `notstartswith` | 开头不是 | `"李"` |
| `endswith` | 结尾是 | `"公司"` |
| `notendswith` | 结尾不是 | `"有限公司"` |
| `between` | 在范围内 | `["2025-01-01", "2025-01-31"]` |
| `notbetween` | 不在范围内 | `["10", "20"]` |

### 为空运算符

| 运算符 | 描述 | 备注 |
|--------|------|------|
| `isempty` | 为空 | 不需要 value 字段 |
| `isnotempty` | 不为空 | 不需要 value 字段 |

### 特殊AccountID

| ID | 说明 |
|----|------|
| user-self | 当前用户 |
| user-sub | 下属 |
| user-workflow | 工作流 |
| user-api | API |

## 使用示例

### 示例 1: 筛选条件

查询所有1月份入职的姓"张"的职员：

```json
{
  "type": "group",
  "logic": "AND",
  "children": [
    {
      "type": "condition",
      "field": "name",
      "operator": "startswith",
      "value": "张"
    },
    {
      "type": "condition",
      "field": "onboard_date",
      "operator": "between",
      "value": ["2025-01-01", "2025-01-31"]
    }
  ]
}
```

### 示例 2: 条件组

查询华北区市场部和销售部所有1月份入职的姓"张"的职员：

```json
{
  "type": "group",
  "logic": "AND",
  "children": [
    {
      "type": "group", 
      "logic": "AND",
      "children": [
        {
          "type": "condition",
          "field": "name",
          "operator": "startswith",
          "value": "张"
        },
        {
          "type": "condition",
          "field": "onboard_date",
          "operator": "between",
          "value": ["2025-01-01", "2025-01-31"]
        }
      ]
    },
    {
      "type": "group",
      "logic": "OR",
      "children": [
        {
          "type": "condition",
          "field": "department_name",
          "operator": "contains",
          "value": ["销售部", "市场部"]
        },
        {
          "type": "condition",
          "field": "department_id",
          "operator": "belongsto",
          "value": ["华北区ID"]
        }
      ]
    }
  ]
}
```

## 注意事项

1. **嵌套限制**: 最多支持两层嵌套（group -> group -> condition）
2. **children 类型一致性**: 一个`group`的`children`只能全是`group`或全是`condition`，不能混合
3. **logic 必需**: 当`type`为`group`时，`logic`字段必须指定为`AND`或`OR`
4. **为空运算符**: 使用`isempty`和`isnotempty`时不需要提供`value`字段
5. **数组值**: 某些运算符需要数组形式的值（如`between`、`in`、`contains`、`concurrent`、`belongsto`等）
6. **选项型字段**: 所有的选项型字段（单选、多选）需要把对应`option`的`key`值放到数组中作为`value`，使用数组值运算符
7. **关联记录**: 关联的记录的筛选需要先查询到对应的`record_id`，再以数组值规则进行筛选

# 批量新增行记录

**操作类型**: `create`


**描述**：批量新建行记录


## 请求体 (Request Body)

**Content-Type**: `application/json`

### Schema 结构

| 字段名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `rows` | Array of objects | **是** | 批量创建的记录数据 |
| `triggerWorkflow` | boolean | 否 | 是否触发工作流 (默认: `true`) |

#### `rows` 数组对象结构

| 字段名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `fields` | Array of objects | **是** | 字段列表 |
| &nbsp;&nbsp;↳ `id` | string | **是** | 字段ID/别名 |
| &nbsp;&nbsp;↳ `value` | string | **是** | 字段值<br>*(注: type=Attachment时示例传参：`[{"name":"文件名称，带后缀","url":" url/base64"}]`)* |
| &nbsp;&nbsp;↳ `type` | integer | 否 | • `type=SingleSelect/MultipleSelect` 时：<br>&nbsp;&nbsp;`1`=不增量选项，`2`=允许增加选项 (默认1)<br>• `type=Attachment` 时：<br>&nbsp;&nbsp;`0`=覆盖，`1`=新增 (默认0) |

---

## 请求示例 (Request Sample)

```json
{
  "rows": [
    {
      "fields": [
        {
          "id": "field1",
          "value": "值1"
        },
        {
          "id": "field2",
          "value": "值2"
        }
      ]
    },
    {
      "fields": [
        {
          "id": "field1",
          "value": "值3"
        },
        {
          "id": "field2",
          "value": "值4"
        }
      ]
    }
  ],
  "triggerWorkflow": true
}
```

---

## 响应 (Responses)

### 200 - 成功批量创建记录

**Content-Type**: `application/json`

#### Schema 结构

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `success` | boolean | 是否调用成功 |
| `error_code` | integer | 错误代码 |
| `error_msg` | string | 错误消息 |
| `data` | object (batchCreateResult) | 批量创建记录结果 |

#### `data` 对象结构 (batchCreateResult)

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `rowIds` | Array of strings | 成功创建的记录ID列表 |

---

## 响应示例 (Response Sample)

```json
{
  "data": {
    "rowIds": ["row1", "row2"]
  },
  "success": true
}
```

# 批量更新行记录

**操作类型**: `update`


**描述**：批量更新行记录


## 请求体 (Request Body)

**Content-Type**: `application/json`

### Schema 结构

| 字段名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `rowIds` | Array of strings | **是** | 要更新的记录ID列表 |
| `fields` | Array of objects | **是** | 要更新的字段列表，会应用到所有指定的记录上 |
| `triggerWorkflow` | boolean | 否 | 是否触发工作流 (默认: `true`) |

#### `fields` 数组对象结构

| 字段名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | string | **是** | 字段 id |
| `value` | any | **是** | 字段值<br>*(注: type=Attachment时示例传参：`[{"name":"文件名称，带后缀","url":" url/base64"}]`)* |
| `type` | integer | 否 | • `type=SingleSelect/MultipleSelect` 时：<br>&nbsp;&nbsp;`1`=不增量选项，`2`=允许增加选项 (默认1)<br>• `type=Attachment` 时：<br>&nbsp;&nbsp;`0`=覆盖，`1`=新增 (默认0) |

---

## 请求示例 (Request Sample)

```json
{
  "rowIds": ["row1", "row2"],
  "fields": [
    {
      "id": "field1",
      "value": "新值1"
    },
    {
      "id": "field2",
      "value": "新值2"
    }
  ],
  "triggerWorkflow": true
}
```

---

## 响应 (Responses)

### 200 - 成功批量更新记录

**Content-Type**: `application/json`

#### Schema 结构

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `success` | boolean | 是否调用成功 |
| `error_code` | integer | 错误代码 |
| `error_msg` | string | 错误消息 |
| `data` | object (batchUpdateResult) | 批量更新记录结果 |

#### `data` 对象结构 (batchUpdateResult)

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `failedRowIds` | Array of strings | 失败的记录ID列表 |
| `successfulRowIds` | Array of strings | 成功更新的记录ID列表 |

---

## 响应示例 (Response Sample)

```json
{
  "data": {
    "failedRowIds": [],
    "successfulRowIds": ["row1", "row2"]
  },
  "success": true
}
```

# 获取行记录列表

**操作类型**: `read`


**描述**：获取工作表记录列表，包含记录创建者、拥有者信息，各字段对应的值。


## 请求体 (Request Body)

**Content-Type**: `application/json`

### Schema 结构

| 字段名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `responseFormat` | string | 否 | 返回格式。<br>• `json`：返回 JSON (默认)<br>• `md`：返回 md 文本(更省 token) |
| `pageSize` | integer | **是** | 每页数量，最大为 1000 (范围: 1 - 1000) |
| `pageIndex` | integer | **是** | 页码 (>= 1) |
| `viewId` | string | 否 | 视图 id |
| `fields` | Array of strings | 否 | 要返回的字段列表，填入后，返回数据中只包含这些字段信息 |
| `filter` | object (filter-2) | 否 | 筛选器配置 |
| `sorts` | Array of objects (sortField) | 否 | 排序字段列表 |
| `search` | string | 否 | 关键字模糊搜索 |
| `tableView` | boolean | 否 | 是否用表格视图格式返回记录数据 |
| `useFieldIdAsKey` | boolean | 否 | 返回数据时字段名称是否使用ID，默认使用别名 |
| `includeTotalCount` | boolean | 否 | 是否返回总记录行数 (默认: `false`) |
| `includeSystemFields` | boolean | 否 | 是否返回系统字段 (默认: `false`) |

#### `filter` 对象结构 (filter-2)

| 字段名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `type` | string | **是** | 筛选类型。<br>• `group`<br>• `condition`<br>*(当type为condition时，field/operator/value为必填；当type为group时，logic为必填)* |
| `logic` | string | 否 | 逻辑操作符，不区分大小写。<br>• `AND`<br>• `OR` |
| `field` | string | 否 | 字段ID或别名（当type为condition时必填） |
| `operator` | string | 否 | 运算符（当type为condition时必填） |
| `value` | any | 否 | 条件值（当type为condition时必填） |
| `children` | Array of objects (filter-2) | 否 | 子筛选条件（当type为group时使用）。*递归结构* |

#### `sorts` 数组对象结构 (sortField)

| 字段名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `field` | string | **是** | 字段ID或别名 |
| `isAsc` | boolean | 否 | 是否升序，默认为降序 |

---

## 请求示例 (Request Sample)

```json
{
  "pageSize": 20,
  "pageIndex": 1,
  "viewId": "view_123",
  "fields": ["field1", "field2"],
  "filter": {
    "type": "group",
    "logic": "OR",
    "children": [
      {
        "type": "group",
        "logic": "AND",
        "children": [
          {
            "type": "condition",
            "field": "677b4a73d14fcf3edf4e7f15",
            "operator": "eq",
            "value": ["1"]
          },
          {
            "type": "condition",
            "field": "677b4a73d14fcf3edf4e7f15",
            "operator": "eq",
            "value": "test"
          }
        ]
      }
    ]
  },
  "sorts": [
    {
      "field": "createdAt",
      "isAsc": true
    }
  ]
}
```

---

## 响应 (Responses)

### 200 - 成功获取记录列表

**Content-Type**: `application/json`

#### Schema 结构

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `success` | boolean | 是否调用成功 |
| `error_code` | integer | 错误代码 |
| `error_msg` | string | 错误消息 |
| `data` | object (recordListResult) | 记录列表查询结果 |

#### `data` 对象结构 (recordListResult)

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `rows` | Array of objects (recordDetail) | 记录列表 |
| `total` | integer | 总记录数 |

#### `rows` 数组对象结构 (recordDetail)

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `id` | string | 行记录 ID |
| `{field}` | string | 动态字段值，键为字段ID或别名 |
| `_createdAt` | string | 创建时间 |
| `_createdBy` | object (user) | 用户信息 (创建者) |
| `_updatedAt` | string | 更新时间 |
| `_updatedBy` | object (user) | 用户信息 (更新者) |
| `_owner` | object (user) | 用户信息 (拥有者) |

#### `user` 对象结构 (通用)

| 字段名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `id` | string | 是 | 人员 id |
| `name` | string | 是 | 名称 |
| `avatar` | string | 是 | 头像地址 |
| `isPortal` | boolean | 是 | 是否为门户用户 |
| `status` | integer | 是 | 状态 |
| `accountId` | string | 否 | 人员 id (兼容字段) |
| `fullname` | string | 否 | 名称 (兼容字段) |

---

## 响应示例 (Response Sample)

```json
{
  "data": {
    "rows": [
      {
        "id": "row123",
        "fields": [
          {
            "id": "field1",
            "value": "示例值",
            "type": "2",
            "controlName": "文本字段"
          }
        ],
        "_createdBy": {
          "accountId": "user123",
          "fullname": "张三"
        },
        "_owner": {
          "accountId": "user123",
          "fullname": "张三"
        },
        "_createdAt": "2024-03-25 15:52:58",
        "_updatedAt": "2024-03-25 15:52:58",
        "_updatedBy": {
          "accountId": "user123",
          "fullname": "张三"
        }
      }
    ],
    "total": 100,
    "pageIndex": 1,
    "pageSize": 20
  },
  "success": true
}
```

# 批量删除行记录

**操作类型**: `delete`


**描述**：批量删除行记录


## 请求体 (Request Body)

**Content-Type**: `application/json`

### Schema 结构

| 字段名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `rowIds` | Array of strings | **是** | 要删除的记录ID列表 |
| `triggerWorkflow` | boolean | 否 | 是否触发工作流 (默认: `true`) |
| `permanent` | boolean | 否 | 是否彻底删除。<br>• `true`：彻底删除（数据不进入回收站，且不可恢复，请谨慎操作！）<br>• `false`：逻辑删除 (默认) |

---

## 请求示例 (Request Sample)

```json
{
  "rowIds": ["row1", "row2", "row3"],
  "triggerWorkflow": true,
  "permanent": false
}
```

---

## 响应 (Responses)

### 200 - 成功批量删除记录

**Content-Type**: `application/json`

#### Schema 结构

| 字段名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `success` | boolean | 是否调用成功 |
| `error_code` | integer | 错误代码 |
| `error_msg` | string | 错误消息 |
| `data` | object (batchDeleteResult) | 批量删除记录结果（空对象） |

---

## 响应示例 (Response Sample)

```json
{
  "data": {},
  "success": true
}
```
