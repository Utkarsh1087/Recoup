import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (newPage: number) => void;
  onItemsPerPageChange?: (newPerPage: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [25, 50, 100],
  className = ""
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className={`flex items-center gap-3 text-xs text-slate-600 select-none ${className}`}>
      {/* Page Size Selector (Optional) */}
      {onItemsPerPageChange && (
        <div className="flex items-center gap-1.5 mr-2">
          <span className="text-[11px] text-slate-400 font-medium">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 font-semibold cursor-pointer outline-none hover:border-slate-300 transition-colors shadow-2xs"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Range indicator: e.g. "1–50 of 1,000" */}
      <span className="font-medium text-slate-600 whitespace-nowrap">
        {startItem.toLocaleString("en-IN")}–{endItem.toLocaleString("en-IN")} of{" "}
        <span className="font-bold text-slate-800">{totalItems.toLocaleString("en-IN")}</span>
      </span>

      {/* Navigation Arrows */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => canPrev && onPageChange(currentPage - 1)}
          disabled={!canPrev}
          title="Previous page"
          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-slate-200"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => canNext && onPageChange(currentPage + 1)}
          disabled={!canNext}
          title="Next page"
          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-slate-200"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const Pagination = TablePagination;
export default TablePagination;
