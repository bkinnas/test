import React, { useEffect } from "react";
import { useApi, useAsync } from "../hooks/useApi.js";
import type { AggregationJob } from "../../shared/types.js";

interface DashboardProps {
  onViewJob: (jobId: string) => void;
  onUpload: () => void;
}

export function Dashboard({ onViewJob, onUpload }: DashboardProps) {
  const api = useApi();
  const { data: jobs, loading, error, execute } = useAsync<AggregationJob[]>();

  useEffect(() => {
    execute(() => api.get<AggregationJob[]>("/invoices/jobs"));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload Brex exports and track invoice collection
          </p>
        </div>
        <button onClick={onUpload} className="btn-primary">
          + Upload Spreadsheet
        </button>
      </div>

      {loading && (
        <div className="card flex items-center justify-center py-12">
          <div className="spinner mr-3" />
          <span className="text-gray-500">Loading jobs...</span>
        </div>
      )}

      {error && (
        <div className="card bg-red-50 border-red-200 text-red-700">
          Error loading jobs: {error}
        </div>
      )}

      {!loading && jobs && jobs.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">&#128203;</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No jobs yet
          </h3>
          <p className="text-gray-500 mb-6">
            Upload a Brex spreadsheet to start collecting invoices
          </p>
          <button onClick={onUpload} className="btn-primary">
            Upload Your First Spreadsheet
          </button>
        </div>
      )}

      {!loading && jobs && jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onView={() => onViewJob(job.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({
  job,
  onView,
}: {
  job: AggregationJob;
  onView: () => void;
}) {
  const statusBadge = () => {
    switch (job.status) {
      case "complete":
        return <span className="badge-green">Complete</span>;
      case "fetching":
        return <span className="badge-blue">Fetching...</span>;
      case "matching":
        return <span className="badge-yellow">Matching</span>;
      case "error":
        return <span className="badge-red">Error</span>;
      default:
        return <span className="badge-gray">{job.status}</span>;
    }
  };

  return (
    <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={onView}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-gray-900">{job.fileName}</h3>
            {statusBadge()}
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <span>Uploaded: {new Date(job.uploadedAt).toLocaleDateString()}</span>
            <span>Transactions: {job.totalTransactions}</span>
            <span>Matched: {job.matchedTransactions}</span>
            <span>Invoices: {job.invoicesDownloaded}/{job.invoices.length}</span>
            {job.errors > 0 && (
              <span className="text-red-500">Errors: {job.errors}</span>
            )}
          </div>
          {job.status === "fetching" && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Fetching from {job.currentProvider}...</span>
                <span>{job.progress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <button className="btn-secondary ml-4" onClick={(e) => { e.stopPropagation(); onView(); }}>
          View
        </button>
      </div>
    </div>
  );
}
