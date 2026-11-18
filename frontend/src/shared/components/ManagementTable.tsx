import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

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
  filterSlot?: ReactNode;
  getRowKey: (row: T) => number | string;
  getSearchText?: (row: T) => string;
  hasMore?: boolean;
  initialSortDirection?: SortDirection;
  initialSortKey?: string;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onRowClick?: (row: T) => void;
  onSearchChange?: (value: string) => void;
  onSelectionChange?: (selectedKeys: Set<number | string>) => void;
  rows: T[];
  searchPlaceholder?: string;
  searchValue?: string;
  selectable?: boolean;
  selectedKeys?: Set<number | string>;
  summaryText?: string;
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
  filterSlot,
  getRowKey,
  getSearchText,
  hasMore = false,
  initialSortDirection = "asc",
  initialSortKey,
  isLoadingMore = false,
  onLoadMore,
  onRowClick,
  onSearchChange,
  onSelectionChange,
  rows,
  searchPlaceholder = "Search rows...",
  searchValue,
  selectable = false,
  selectedKeys = new Set<number | string>(),
  summaryText,
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
  const [internalSearch, setInternalSearch] = useState("");
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const effectiveSearch = searchValue ?? internalSearch;
  const hasSearch = searchValue !== undefined || Boolean(onSearchChange) || Boolean(getSearchText);

  const filteredRows = useMemo(() => {
    const query = effectiveSearch.trim().toLocaleLowerCase();
    if (!query || !getSearchText) {
      return rows;
    }
    return rows.filter((row) => getSearchText(row).toLocaleLowerCase().includes(query));
  }, [effectiveSearch, getSearchText, rows]);

  const sortedRows = useMemo(() => {
    if (!sort) {
      return filteredRows;
    }

    const sortColumn = columns.find((column) => column.key === sort.key);

    if (!sortColumn?.sortValue) {
      return filteredRows;
    }

    return filteredRows
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
  }, [columns, filteredRows, sort]);

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

  const allRowsSelected =
    sortedRows.length > 0 && sortedRows.every((row) => selectedKeys.has(getRowKey(row)));
  const someRowsSelected =
    sortedRows.some((row) => selectedKeys.has(getRowKey(row))) && !allRowsSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someRowsSelected;
    }
  }, [someRowsSelected]);

  const toggleRowSelection = (row: T) => {
    const key = getRowKey(row);
    const next = new Set(selectedKeys);
    next.has(key) ? next.delete(key) : next.add(key);
    onSelectionChange?.(next);
  };

  const toggleAllRows = () => {
    onSelectionChange?.(
      allRowsSelected ? new Set() : new Set(sortedRows.map((row) => getRowKey(row)))
    );
  };

  const handleSearchInput = (nextValue: string) => {
    if (searchValue === undefined) {
      setInternalSearch(nextValue);
    }
    onSearchChange?.(nextValue);
  };

  const showToolbar = hasSearch || Boolean(filterSlot) || Boolean(summaryText);

  return (
    <div className="management-table-shell">
      {showToolbar ? (
        <div className="management-table-toolbar">
          {hasSearch ? (
            <label className="management-table-search">
              <span className="sr-only">{`Search ${tableLabel}`}</span>
              <input
                aria-label={`Search ${tableLabel}`}
                onChange={(event) => handleSearchInput(event.target.value)}
                placeholder={searchPlaceholder}
                type="search"
                value={effectiveSearch}
              />
            </label>
          ) : null}
          {filterSlot ? <div className="management-table-filters">{filterSlot}</div> : null}
          <span className="management-table-summary">
            {summaryText ??
              `${sortedRows.length} ${sortedRows.length === 1 ? "row" : "rows"}`}
          </span>
        </div>
      ) : null}
      <div className="management-table-scroll">
        <table className="management-table" aria-label={tableLabel}>
          <thead>
            <tr>
              {selectable ? (
                <th className="management-cell-center management-selection-cell" scope="col">
                  <input
                    ref={selectAllRef}
                    aria-label={allRowsSelected ? "Clear all row selections" : "Select all rows"}
                    checked={allRowsSelected}
                    onChange={toggleAllRows}
                    type="checkbox"
                  />
                </th>
              ) : null}
              {columns.map((column) => {
                const isActiveSort = sort?.key === column.key;
                const sortIndicator = !column.sortValue
                  ? ""
                  : isActiveSort
                    ? sort.direction === "desc"
                      ? "↓"
                      : "↑"
                    : "↕";

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
                        className={`management-table-sort${isActiveSort ? " is-sorted" : ""}`}
                        onClick={() => toggleSort(column)}
                        type="button"
                      >
                        <span>{column.label}</span>
                        <span className="sort-state" aria-hidden="true">{sortIndicator}</span>
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
                <td className="management-table-empty" colSpan={columns.length + (selectable ? 1 : 0)}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => {
                const rowKey = getRowKey(row);
                const isSelected = selectedKeys.has(rowKey);
                const rowClassNames = [
                  onRowClick ? "management-table-row-clickable" : "",
                  isSelected ? "management-table-row-selected" : ""
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr
                    className={rowClassNames || undefined}
                    key={rowKey}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("button, input, a, select, textarea, label")) {
                        return;
                      }
                      onRowClick?.(row);
                    }}
                    onKeyDown={(event) => {
                      if (!onRowClick) return;
                      if ((event.target as HTMLElement).closest("button, input, a, select, textarea, label")) {
                        return;
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }}
                  >
                    {selectable ? (
                      <td className="management-cell-center management-selection-cell">
                        <input
                          aria-label={`Select ${rowKey}`}
                          checked={isSelected}
                          onChange={() => toggleRowSelection(row)}
                          type="checkbox"
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        className={column.align ? `management-cell-${column.align}` : undefined}
                        key={column.key}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {hasMore && onLoadMore ? (
        <div className="table-pagination-actions">
          <span className="table-pagination-count">Showing {rows.length} loaded</span>
          <button className="outline-button" disabled={isLoadingMore} onClick={onLoadMore} type="button">
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
