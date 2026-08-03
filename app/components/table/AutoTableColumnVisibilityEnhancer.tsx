"use client";

import { usePathname } from "next/navigation";
import React, { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import ColumnVisibilityControl from "./ColumnVisibilityControl";

type MountedControl = {
  root: Root;
  host: HTMLDivElement;
  table: HTMLTableElement;
};

function slugifyPath(pathname: string) {
  return pathname
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "root";
}

function getTableLabel(table: HTMLTableElement) {
  const card = table.closest("section, article, div");
  const heading = card?.querySelector("h1, h2, h3, h4, h5, h6");
  if (heading?.textContent?.trim()) {
    return heading.textContent.trim();
  }
  return "tabel";
}

function isTableVisible(table: HTMLTableElement) {
  if (!table.isConnected) return false;
  const rect = table.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export default function AutoTableColumnVisibilityEnhancer() {
  const pathname = usePathname();
  const mountedControlsRef = useRef<Map<string, MountedControl>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const routeSlug = slugifyPath(pathname);

    const cleanupMountedControls = () => {
      mountedControlsRef.current.forEach(({ root, host, table }) => {
        setTimeout(() => {
          root.unmount();
        }, 0);
        host.remove();
        delete table.dataset.columnVisibilityEnhanced;
      });
      mountedControlsRef.current.clear();
    };

    const enhanceTables = () => {
      mountedControlsRef.current.forEach((mountedControl, tableId) => {
        const { root, host, table } = mountedControl;
        if (!table.isConnected || !isTableVisible(table)) {
          setTimeout(() => {
            root.unmount();
          }, 0);
          host.remove();
          delete table.dataset.columnVisibilityEnhanced;
          mountedControlsRef.current.delete(tableId);
        }
      });

      const tables = Array.from(document.querySelectorAll("table")).filter(
        (node): node is HTMLTableElement =>
          node instanceof HTMLTableElement &&
          isTableVisible(node) &&
          node.querySelectorAll("thead tr:first-child th").length > 1 &&
          node.dataset.columnVisibilityManual !== "true"
      );

      tables.forEach((table, index) => {
        if (table.dataset.columnVisibilityEnhanced === "true") {
          return;
        }

        if (!table.id) {
          table.id = `table-${routeSlug}-${index + 1}`;
        }

        const scrollWrapper = table.parentElement;
        const anchor = scrollWrapper ?? table;
        const parent = anchor.parentElement;
        if (!parent) return;

        const host = document.createElement("div");
        host.className = "mb-3 flex justify-end";
        host.dataset.columnVisibilityHost = "true";
        host.dataset.columnVisibilityFor = table.id;

        parent.insertBefore(host, anchor);

        const root = createRoot(host);
        root.render(
          <ColumnVisibilityControl
            tableId={table.id}
            storageKey={`auto-column-visibility:${routeSlug}:${table.id}`}
            buttonLabel="Kolom"
            description={`Atur kolom ${getTableLabel(table)} sesuai kebutuhan.`}
          />
        );

        table.dataset.columnVisibilityEnhanced = "true";
        mountedControlsRef.current.set(table.id, { root, host, table });
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
      cleanupMountedControls();
    };
  }, [pathname]);

  return null;
}
