import React, { ReactNode } from "react";

interface PageLayoutProps {
  breadcrumb?: ReactNode;
  title: string;
  description: string;
  statCards?: ReactNode;
  tabs?: ReactNode;
  
  // Table Container Props
  tableTitle?: string;
  tableDescription?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  search?: ReactNode;
  children: ReactNode; // The Table
}

export default function PageLayout({
  breadcrumb,
  title,
  description,
  statCards,
  tabs,
  tableTitle,
  tableDescription,
  actions,
  filters,
  search,
  children,
}: PageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#fcfcfc] p-4 md:p-8 animate-in fade-in duration-500">
      {/* 1. Header & Breadcrumb */}
      <div className="mb-6">
        {breadcrumb && (
          <div className="mb-2 text-sm font-medium text-gray-500">
            {breadcrumb}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
        <p className="mt-1 text-sm text-gray-500 max-w-3xl">
          {description}
        </p>
        <div className="mt-4 border-b-2 border-red-500 w-full" />
      </div>

      {/* 2. Stat Cards */}
      {statCards && <div className="mb-8">{statCards}</div>}

      {/* 3. Tabs */}
      {tabs && (
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs}
        </div>
      )}

      {/* 4. Table Container */}
      <div className="flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
        
        {/* Table Header (Title, Desc, Actions) */}
        {(tableTitle || actions) && (
          <div className="flex flex-col items-start gap-4 border-b border-gray-50 p-6">
            <div>
              {tableTitle && (
                <h2 className="text-xl font-bold text-gray-900">{tableTitle}</h2>
              )}
              {tableDescription && (
                <p className="mt-1 text-sm text-gray-500">{tableDescription}</p>
              )}
            </div>
            {actions && (
              <div className="flex flex-wrap items-center gap-3 w-full">
                {actions}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        {filters && (
          <div className="border-b border-gray-50 px-6 py-4">
            <div className="flex flex-wrap items-start gap-4">
              {filters}
            </div>
          </div>
        )}

        {/* Search */}
        {search && (
          <div className="border-b border-gray-50 px-6 py-4">
            {search}
          </div>
        )}

        {/* Table Content */}
        <div className="relative w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
