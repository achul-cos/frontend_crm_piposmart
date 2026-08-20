"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import TablePaginationFooter, {
  getTableTotalPages,
  type TableRowsPerPage,
} from "./TablePaginationFooter";

type MountedPagination = {
  root: Root;
  host: HTMLDivElement;
  table: HTMLTableElement;
};

function slugifyPath(pathname: string) {
  return (
    pathname
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "root"
  );
}

function isTableVisible(table: HTMLTableElement) {
  if (!table.isConnected) return false;
  const rect = table.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function hasManualPagination(table: HTMLTableElement) {
  if (table.dataset.tablePaginationManual === "true") return true;
  const wrapper = table.parentElement;
  const container = wrapper?.parentElement;
  const manualControls = Array.from(
    container?.querySelectorAll("[data-table-pagination-manual='true']") ?? [],
  );
  return manualControls.some(
    (control) => !control.closest("[data-table-pagination-host='true']"),
  );
}

function getBodyRows(table: HTMLTableElement) {
  const tbody = table.tBodies.item(0);
  if (!tbody) return [];
  return Array.from(tbody.rows).filter(
    (row) => row.dataset.tablePaginationIgnore !== "true",
  );
}

function ClientSideTablePagination({ tableId }: { tableId: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<TableRowsPerPage>(10);
  const [totalItems, setTotalItems] = useState(0);

  useLayoutEffect(() => {
    const table = document.getElementById(tableId);
    if (!(table instanceof HTMLTableElement)) return;

    let frame = 0;

    const applyPagination = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rows = getBodyRows(table);
        const nextTotal = rows.length;
        const nextTotalPages = getTableTotalPages(nextTotal, rowsPerPage);
        const safePage = Math.min(Math.max(1, currentPage), nextTotalPages);

        if (safePage !== currentPage) {
          setCurrentPage(safePage);
          return;
        }

        rows.forEach((row, index) => {
          const shouldShow =
            rowsPerPage === "all" ||
            (index >= (safePage - 1) * rowsPerPage &&
              index < safePage * rowsPerPage);
          row.style.display = shouldShow ? "" : "none";
        });

        setTotalItems(nextTotal);
      });
    };

    applyPagination();

    const observer = new MutationObserver(() => {
      applyPagination();
    });

    const tbody = table.tBodies.item(0);
    if (tbody) {
      observer.observe(tbody, { childList: true, subtree: true });
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      getBodyRows(table).forEach((row) => {
        row.style.display = "";
      });
    };
  }, [currentPage, rowsPerPage, tableId]);

  return (
    <TablePaginationFooter
      currentPage={currentPage}
      totalItems={totalItems}
      rowsPerPage={rowsPerPage}
      onPageChange={setCurrentPage}
      onRowsPerPageChange={(nextRowsPerPage) => {
        setRowsPerPage(nextRowsPerPage);
        setCurrentPage(1);
      }}
    />
  );
}

export default function AutoTablePaginationEnhancer() {
  const pathname = usePathname();
  const mountedPaginationsRef = useRef<Map<string, MountedPagination>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const routeSlug = slugifyPath(pathname);

    const cleanupMountedPaginations = () => {
      mountedPaginationsRef.current.forEach(({ root, host, table }) => {
        setTimeout(() => {
          root.unmount();
        }, 0);
        host.remove();
        delete table.dataset.tablePaginationEnhanced;
      });
      mountedPaginationsRef.current.clear();
    };

    const enhanceTables = () => {
      mountedPaginationsRef.current.forEach((mountedPagination, tableId) => {
        const { root, host, table } = mountedPagination;
        if (!table.isConnected || !isTableVisible(table) || hasManualPagination(table)) {
          setTimeout(() => {
            root.unmount();
          }, 0);
          host.remove();
          delete table.dataset.tablePaginationEnhanced;
          mountedPaginationsRef.current.delete(tableId);
        }
      });

      const tables = Array.from(document.querySelectorAll("table")).filter(
        (node): node is HTMLTableElement =>
          node instanceof HTMLTableElement &&
          isTableVisible(node) &&
          node.tBodies.length > 0 &&
          node.dataset.tablePaginationEnhanced !== "true" &&
          node.dataset.tablePaginationSkip !== "true" &&
          !hasManualPagination(node),
      );

      tables.forEach((table, index) => {
        if (!table.id) {
          table.id = `table-pagination-${routeSlug}-${index + 1}`;
        }

        const scrollWrapper = table.parentElement;
        const anchor = scrollWrapper ?? table;
        const parent = anchor.parentElement;
        if (!parent) return;

        const host = document.createElement("div");
        host.dataset.tablePaginationHost = "true";
        host.dataset.tablePaginationFor = table.id;

        parent.insertBefore(host, anchor.nextSibling);

        const root = createRoot(host);
        root.render(<ClientSideTablePagination tableId={table.id} />);

        table.dataset.tablePaginationEnhanced = "true";
        mountedPaginationsRef.current.set(table.id, { root, host, table });
      });
    };

    const observer = new MutationObserver(() => {
      enhanceTables();
    });

    const timeoutId = window.setTimeout(() => {
      enhanceTables();
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      observer.disconnect();
      cleanupMountedPaginations();
    };
  }, [pathname]);

  return null;
}
