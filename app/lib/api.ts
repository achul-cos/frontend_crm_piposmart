const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const fetchCustomers = async () => {
  const response = await fetch(`${API_BASE_URL}/customer`);
  if (!response.ok) {
    throw new Error("Failed to fetch customers");
  }
  return response.json();
};

export const fetchSales = async () => {
  const response = await fetch(`${API_BASE_URL}/sales`);
  if (!response.ok) {
    throw new Error("Failed to fetch sales");
  }
  return response.json();
};

export const createCustomer = async (data: any) => {
  const response = await fetch(`${API_BASE_URL}/customer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to create customer");
  }
  return response.json();
};

export const updateCustomer = async (data: any) => {
  const response = await fetch(`${API_BASE_URL}/customer`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update customer");
  }
  return response.json();
};

export const deleteCustomer = async (id: number) => {
  const response = await fetch(`${API_BASE_URL}/customer`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error("Failed to delete customer");
  }
  return response.json();
};

export const fetchDeletedCustomers = async () => {
  const response = await fetch(`${API_BASE_URL}/customer/deleted`);
  if (!response.ok) {
    throw new Error("Failed to fetch deleted customers");
  }
  return response.json();
};

export const restoreCustomer = async (id: number) => {
  const response = await fetch(`${API_BASE_URL}/customer/restore`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error("Failed to restore customer");
  }
  return response.json();
};

export const deleteForceCustomer = async (id: number) => {
  const response = await fetch(`${API_BASE_URL}/customer/force`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error("Failed to hard delete customer");
  }
  return response.json();
};
