"use client";

import type { CallCustomer } from "../../page";

export const REMARK_1_OPTIONS = [
  {
    value: "incoming",
    label: "(1) Incoming",
    score: "1",
  },
  {
    value: "rencana-buka-laundry",
    label: "(1) Rencana Buka Laundry",
    score: "1",
  },
];

export function applyRemark1Action(customer: CallCustomer): CallCustomer {
  return {
    ...customer,
    totalFu: Number(customer.totalFu || 0) + 1,
    remarks: "1",
    scor: 1,
  };
}