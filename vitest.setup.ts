import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// RTL tidak membersihkan DOM otomatis di Vitest kecuali `test.globals: true`
// diaktifkan (sengaja tidak, supaya import eksplisit tetap terlihat).
// Tanpa ini, render() dari test sebelumnya menumpuk di document.body dan
// query seperti getByRole("button", { name: "Next" }) mengembalikan banyak
// hasil begitu ada lebih dari satu test yang me-render komponen yang sama.
afterEach(() => {
  cleanup();
});
