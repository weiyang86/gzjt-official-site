


interface CreateTableField {
  name: string; // 字段名 中文
  alias: string; // 字段别名 原本表名称 英文
  remark: string; // 字段描述
  type: string; // 字段类型 值为如下含义:  2:文本; 6:数值类型; DateTime:时间
  isTitle: boolean; // 是否标题字段 每张表必须有且只有1个标题字段;
  required:boolean; // 是否必填
  subType?: string; // 当type 值为 DateTime时,此值必须是 6

}

interface CreateRequestBody {
  name: string; // 工作表名称, 使用表的中文名称
  alias: string; // 工作表别名, 使用原本表名(英文)
  remark: string; // 工作表描述
  fields: CreateTableField[]; // 工作表字段信息
}