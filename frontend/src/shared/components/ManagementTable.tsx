import { type ReactNode, useMemo, useState } from "react";

type SortDirection = "asc" | "desc";
type SortValue = boolean | Date | number | string | null | undefined;

export type ManagementTableColumn<T> = {
  key: string;
  label: string;
  align?: "center" | "left" | "right";
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => SortValue;
};

type ManagementTableProps<T> = {
  columns: ManagementTableColumn<T>[];
  emptyMessage: string;
  getRowKey: (row: T) => number | string;
  hasMore?: boolean;
  initialSortDirection?: SortDirection;
  initialSortKey?: string;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  rows: T[];
  tableLabel: string;
};

type SortState = {
  direction: SortDirection;
  key: string;
};

function normalizeSortValue(value: SortValue): number | string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  return value.trim().toLocaleLowerCase();
}

function compareSortValues(left: SortValue, right: SortValue): number {
  const leftValue = normalizeSortValue(left);
  const rightValue = normalizeSortValue(right);

  if (leftValue === null && rightValue === null) {
    return 0;
  }

  if (leftValue === null) {
    return 1;
  }

  if (rightValue === null) {
    return -1;
  }

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return leftValue - rightValue;
  }

  return String(leftValue).localeCompare(String(rightValue), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

export function ManagementTable<T>({
  columns,
  emptyMessage,
  getRowKey,
  hasMore = false,
  initialSortDirection = "asc",
  initialSortKey,
  isLoadingMore = false,
  onLoadMore,
  rows,
  tableLabel
}: ManagementTableProps<T>) {
  const firstSortableColumn = columns.find((column) => column.sortValue);
  const requestedSortColumn = initialSortKey
    ? columns.find((column) => column.key === initialSortKey && column.sortValue)
    : null;
  const [sort, setSort] = useState<SortState | null>(
    (requestedSortColumn ?? firstSortableColumn)
      ? {
          key: (requestedSortColumn ?? firstSortableColumn)?.key ?? "",
          direction: initialSortDirection
        }
      : null
  );

  const sortedRows = useMemo(() => {
    if (!sort) {
      return rows;
    }

    const sortColumn = columns.find((column) => column.key === sort.key);

    if (!sortColumn?.sortValue) {
      return rows;
    }

    return rows
      .map((row, index) => ({ index, row }))
      .sort((left, right) => {
        const comparison = compareSortValues(
          sortColumn.sortValue?.(left.row),
          sortColumn.sortValue?.(right.row)
        );

        if (comparison === 0) {
          return left.index - right.index;
        }

        return sort.direction === "asc" ? comparison : -comparison;
      })
      .map(({ row }) => row);
  }, [columns, rows, sort]);

  const toggleSort = (column: ManagementTableColumn<T>) => {
    if (!column.sortValue) {
      return;
    }

    setSort((current) =>
      current?.key === column.key
        ? { key: column.key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key: column.key, direction: "asc" }
    );
  };

  return (
    <div className="management-table-shell">
      <div className="management-table-scroll">
        <table className="management-table" aria-label={tableLabel}>
          <thead>
            <tr>
              {columns.map((column) => {
                const isActiveSort = sort?.key === column.key;
                const sortLabel =
                  isActiveSort && sort?.direction === "desc"
                    ? "Z-A"
                    : isActiveSort
                      ? "A-Z"
                      : "";

                return (
                  <th
                    aria-sort={
                      isActiveSort ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
                    }
                    className={column.align ? `management-cell-${column.align}` : undefined}
                    key={column.key}
                    scope="col"
                  >
                    {column.sortValue ? (
                      <button
                        className="management-table-sort"
                        onClick={() => toggleSort(column)}
                        type="button"
                      >
                        <span>{column.label}</span>
                        {sortLabel ? <span className="sort-state">{sortLabel}</span> : null}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td className="management-table-empty" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={getRowKey(row)}>
                  {columns.map((column) => (
                    <td
                      className={column.align ? `management-cell-${column.align}` : undefined}
                      key={column.key}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {hasMore && onLoadMore ? (
        <div className="table-pagination-actions">
          <button className="outline-button" disabled={isLoadingMore} onClick={onLoadMore} type="button">
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
