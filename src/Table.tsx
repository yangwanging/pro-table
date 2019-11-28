import './index.less';

import React, { useEffect, CSSProperties, useRef } from 'react';
import { Table, Card, Typography } from 'antd';
import classNames from 'classnames';
import moment from 'moment';
import { ColumnProps, PaginationConfig, TableProps } from 'antd/es/table';
import useFetchData, { UseFetchDataAction, RequestData } from './useFetchData';
import IndexColumn from './component/indexColumn';
import Toolbar from './component/toolBar';

/**
 * money 金额
 * option 操作 需要返回一个数组
 * date 日期 YYYY-MM-DD
 * dateTime 日期和时间 YYYY-MM-DD HH:mm:SS
 * time: 时间 HH:mm:SS
 */
export type ProColumnsValueType =
  | 'money'
  | 'option'
  | 'date'
  | 'dateTime'
  | 'time'
  | 'text'
  | 'index'
  | 'indexBorder';

export interface ProColumns<T = unknown> extends Omit<ColumnProps<T>, 'render'> {
  /**
   * 自定义 render
   */
  render?: (
    text: React.ReactNode,
    record: T,
    index: number,
    action: UseFetchDataAction<RequestData<T>>,
  ) => React.ReactNode | React.ReactNode[];

  renderText?: (
    text: any,
    record: T,
    index: number,
    action: UseFetchDataAction<RequestData<T>>,
  ) => string;
  /**
   * 是否缩略
   */
  ellipsis?: boolean;
  /**
   * 是否拷贝
   */
  copyable?: boolean;

  /**
   * 值的类型
   */
  valueType?: ProColumnsValueType;
}

export interface ProTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  columns?: ProColumns<T>[];
  params?: { [key: string]: any };

  /**
   * 一个获得 dataSource 的方法
   */
  request?: (params?: {
    pageSize: number;
    current: number;
    [key: string]: any;
  }) => Promise<RequestData<T>>;
  /**
   * 一个获得 dataSource 的方法
   */
  url?: (params?: {
    pageSize: number;
    current: number;
    [key: string]: any;
  }) => Promise<RequestData<T>>;
  /**
   * 对数据进行一些处理
   */
  filterDate?: (data: any[]) => any[];
  /**
   * 默认的数据
   */
  defaultData?: T[];
  /**
   * 是否手动模式
   */
  manual?: boolean;

  /**
   * 某些参数改变时，自动刷新数据
   * 等同于 effects 的值
   * 推荐使用基本数据结构，不然可能造成重复更新
   */
  effects?: (number | string | boolean)[];

  /**
   * 初始化的参数，可以操作 table
   */
  onInit?: (action: UseFetchDataAction<RequestData<T>>) => void;

  /**
   * 渲染操作栏
   */
  renderToolBar?: (action: UseFetchDataAction<RequestData<T>>) => React.ReactNode[];

  /**
   * 数据加载完成后触发
   */
  onLoad?: (dataSource: T[]) => void;

  /**
   * 给封装的 table 的 className
   */
  tableClassName?: string;

  /**
   * 给封装的 table 的 style
   */
  tableStyle?: CSSProperties;

  /**
   * 左上角的 title
   */
  headerTitle?: React.ReactNode;
}

const mergePagination = <T extends any[], U>(
  pagination: PaginationConfig | boolean | undefined,
  action: UseFetchDataAction<RequestData<T>>,
): PaginationConfig | false | undefined => {
  if (!pagination) {
    return pagination;
  }
  let defaultPagination: PaginationConfig | {} = pagination;
  const { current, pageSize } = action;
  if (pagination === true) {
    defaultPagination = {};
  }
  return {
    ...(defaultPagination as PaginationConfig),
    current,
    pageSize,
    onChange: (page: number, newPageSize?: number) => {
      // pageSize 改变之后就没必要切换页码
      if (newPageSize !== pageSize) {
        action.setPageSize(pageSize);
      } else if (current !== page) {
        action.setCurrent(page);
      }
      const { onChange } = pagination as PaginationConfig;
      if (onChange) {
        onChange(page, newPageSize || 10);
      }
    },
  };
};

const moneyIntl = new Intl.NumberFormat('zh-Hans-CN', {
  currency: 'CNY',
  style: 'currency',
  minimumFractionDigits: 2,
});
/**
 * 根据不同的类型来转化数值
 * @param text
 * @param valueType
 */
const defaultRenderText = (
  text: string | number,
  valueType: ProColumnsValueType,
  index: number,
) => {
  /**
   * 如果是金额的值
   */
  if (valueType === 'money' && text) {
    /**
     * 这个 api 支持三星和华为的手机
     */
    if (typeof text === 'string') {
      return moneyIntl.format(parseFloat(text));
    }
    return moneyIntl.format(text);
  }

  /**
   *如果是日期的值
   */
  if (valueType === 'date' && text) {
    return moment(text).format('YYYY-MM-DD');
  }

  /**
   *如果是日期加时间类型的值
   */
  if (valueType === 'dateTime' && text) {
    return moment(text).format('YYYY-MM-DD HH:mm:SS');
  }

  /**
   *如果是时间类型的值
   */
  if (valueType === 'time' && text) {
    return moment(text).format('HH:mm:SS');
  }

  if (valueType === 'index') {
    return <IndexColumn>{index + 1}</IndexColumn>;
  }

  if (valueType === 'indexBorder') {
    return <IndexColumn border>{index + 1}</IndexColumn>;
  }

  return text;
};

const genColumnList = <T, U = {}>(
  columns: ProColumns<T>[],
  action: UseFetchDataAction<RequestData<T>>,
): ColumnProps<T>[] =>
  columns.map(item => ({
    ...item,
    ellipsis: false,

    render: (text: any, row: T, index: number) => {
      const { renderText = (val: any) => val } = item;
      const renderTextStr = renderText(text, row, index, action);
      const textDom = defaultRenderText(renderTextStr, item.valueType || 'text', index);

      let dom: React.ReactNode = textDom;
      if (item.copyable || item.ellipsis) {
        dom = (
          <Typography.Text
            style={{
              width: item.width,
            }}
            copyable={item.copyable}
            ellipsis={item.ellipsis}
          >
            {textDom}
          </Typography.Text>
        );
      }
      if (item.render) {
        const renderDom = item.render(dom, row, index, action);
        if (renderDom && item.valueType === 'option' && Array.isArray(renderDom)) {
          return (
            <div className="ant-pro-table-option-cell">
              {renderDom.map((optionDom, domIndex) => (
                // eslint-disable-next-line react/no-array-index-key
                <div className="ant-pro-table-option-cell-item" key={`${index}-${domIndex}`}>
                  {optionDom}
                </div>
              ))}
            </div>
          );
        }
        return renderDom;
      }
      return dom;
    },
  }));

/**
 * 🏆 Use Ant Design Table like a Pro!
 * 更快 更好 更方便
 * @param props
 */
const ProTable = <T, U = {}>(props: ProTableProps<T>) => {
  const {
    request,
    className: propsClassName,
    params = {},
    defaultData = [],
    effects = [],
    headerTitle,
    manual,
    filterDate,
    pagination: propsPagination,
    onInit,
    columns: propsColumns = [],
    renderToolBar = () => [],
    onLoad,
    tableStyle,
    tableClassName,
    url,
    ...reset
  } = props;

  /**
   * 需要初始化一样不然默认可能报错
   */
  const { defaultCurrent, defaultPageSize } =
    typeof propsPagination === 'object'
      ? (propsPagination as PaginationConfig)
      : { defaultCurrent: 1, defaultPageSize: 10 };

  const action = useFetchData(
    async ({ pageSize, current }) => {
      const tempRequest = request || url;

      if (!tempRequest) {
        return {
          data: props.dataSource || [],
          success: true,
        } as RequestData<T>;
      }
      const msg = await tempRequest({ current, pageSize, ...params });
      if (filterDate) {
        return { ...msg, data: filterDate(msg.data) };
      }
      return msg;
    },
    defaultData,
    {
      defaultCurrent,
      defaultPageSize,
      onLoad,
      manual,
      effects: [
        Object.values(params)
          .filter(item => item)
          .join('-'),
        ...effects,
      ],
    },
  );

  const rootRef = useRef<HTMLDivElement>(null);

  action.fullscreen = () => {
    if (rootRef.current) {
      rootRef.current.requestFullscreen();
    }
  };

  useEffect(() => {
    // 页码更改的时候触发一下
    // 不然会造成 action 中数据老旧
    if (onInit) {
      onInit(action);
    }
  }, [action.pageSize, action.current]);

  const pagination = mergePagination<T[], {}>(propsPagination, action);
  const columns = genColumnList<T>(propsColumns, action);
  const className = classNames('ant-pro-table', propsClassName);
  return (
    <div className={className} ref={rootRef}>
      <Card
        bordered={false}
        style={{
          height: '100%',
        }}
        bodyStyle={{
          padding: 0,
        }}
      >
        <Toolbar<T> headerTitle={headerTitle} action={action} renderToolBar={renderToolBar} />
        <Table
          {...reset}
          className={tableClassName}
          style={tableStyle}
          columns={columns}
          loading={action.loading}
          dataSource={action.dataSource as T[]}
          pagination={pagination}
        />
      </Card>
    </div>
  );
};

export default ProTable;
