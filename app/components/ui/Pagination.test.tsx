import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Pagination from "./Pagination";

describe("Pagination", () => {
  it("tidak merender apa pun ketika tidak ada data", () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={0}
        rowsPerPage={10}
        onPageChange={() => {}}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("menonaktifkan Prev/Awal di halaman pertama dan Next/Akhir di halaman terakhir", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={5}
        rowsPerPage={10}
        onPageChange={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Prev" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Awal" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Akhir" })).toBeDisabled();
  });

  it("memanggil onPageChange dengan halaman berikutnya saat Next diklik", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={50}
        rowsPerPage={10}
        onPageChange={onPageChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("mereset ke halaman 1 saat jumlah baris per halaman diubah", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onRowsPerPageChange = vi.fn();

    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        totalItems={50}
        rowsPerPage={10}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox"), "25");

    expect(onRowsPerPageChange).toHaveBeenCalledWith(25);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
