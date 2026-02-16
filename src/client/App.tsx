import React, { useState } from "react";
import { Dashboard } from "./components/Dashboard.js";
import { FileUpload } from "./components/FileUpload.js";
import { ProviderManager } from "./components/ProviderManager.js";
import { JobViewer } from "./components/JobViewer.js";
import type { UploadResponse } from "../shared/types.js";

type Page = "dashboard" | "upload" | "providers" | "job";

export function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const handleUploadComplete = (result: UploadResponse) => {
    setActiveJobId(result.jobId);
    setPage("job");
  };

  const handleViewJob = (jobId: string) => {
    setActiveJobId(jobId);
    setPage("job");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">&#128196;</span>
              <h1 className="text-xl font-bold text-gray-900">
                Invoice Aggregator
              </h1>
            </div>
            <div className="flex gap-1">
              <NavButton
                active={page === "dashboard"}
                onClick={() => setPage("dashboard")}
              >
                Dashboard
              </NavButton>
              <NavButton
                active={page === "upload"}
                onClick={() => setPage("upload")}
              >
                Upload
              </NavButton>
              <NavButton
                active={page === "providers"}
                onClick={() => setPage("providers")}
              >
                Providers
              </NavButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {page === "dashboard" && (
          <Dashboard
            onViewJob={handleViewJob}
            onUpload={() => setPage("upload")}
          />
        )}
        {page === "upload" && (
          <FileUpload onComplete={handleUploadComplete} />
        )}
        {page === "providers" && <ProviderManager />}
        {page === "job" && activeJobId && (
          <JobViewer
            jobId={activeJobId}
            onBack={() => setPage("dashboard")}
          />
        )}
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
