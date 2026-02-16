import React, { useEffect, useRef, useState } from "react";
import { useApi, useAsync } from "../hooks/useApi.js";
import type { JobStatusResponse, Invoice } from "../../shared/types.js";

interface JobViewerProps {
  jobId: string;
  onBack: () => void;
}

export function JobViewer({ jobId, onBack }: JobViewerProps) {
  const api = useApi();
  const { data, loading, error, execute, setData } =
    useAsync<JobStatusResponse>();
  const [fetching, setFetching] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadJob = async () => {
    return execute(() => api.get<JobStatusResponse>(`/invoices/jobs/${jobId}`));
  };

  useEffect(() => {
    loadJob();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId]);

  // Poll while fetching
  useEffect(() => {
    const job = data?.job;
    if (job?.status === "fetching") {
      pollRef.current = setInterval(async () => {
        try {
          const updated = await api.get<JobStatusResponse>(
            `/invoices/jobs/${jobId}`
          );
          setData(updated);
          if (updated.job.status !== "fetching") {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch {
          // ignore polling errors
        }
      }, 2000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [data?.job?.status]);

  const startFetching = async () => {
    setFetching(true);
    try {
      await api.post(`/invoices/jobs/${jobId}/fetch`);
      // Start polling
      const updated = await api.get<JobStatusResponse>(
        `/invoices/jobs/${jobId}`
      );
      setData(updated);
    } catch (err) {
      console.error("Failed to start fetching:", err);
    } finally {
      setFetching(false);
    }
  };

  const job = data?.job;

  if (loading && !job) {
    return (
      <div className="card flex items-center justify-center py-12">
        <div className="spinner mr-3" />
        <span className="text-gray-500">Loading job...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200 text-red-700">
        Error: {error}
      </div>
    );
  }

  if (!job) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="btn-secondary text-sm">
          &larr; Back
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{job.fileName}</h2>
          <p className="text-sm text-gray-500">
            Uploaded {new Date(job.uploadedAt).toLocaleString()}
          </p>
        </div>
        {(job.status === "idle" || job.status === "matching") &&
          job.invoices.length > 0 && (
            <button
              onClick={startFetching}
              disabled={fetching}
              className="btn-primary"
            >
              {fetching ? (
                <>
                  <span className="spinner mr-2" /> Starting...
                </>
              ) : (
                "Fetch All Invoices"
              )}
            </button>
          )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Transactions"
          value={job.totalTransactions}
          color="gray"
        />
        <StatCard
          label="Matched"
          value={job.matchedTransactions}
          color="blue"
        />
        <StatCard
          label="Invoices Found"
          value={job.invoicesDownloaded}
          color="green"
        />
        <StatCard
          label="Not Found"
          value={
            job.invoices.filter((i) => i.status === "not_found").length
          }
          color="yellow"
        />
        <StatCard label="Errors" value={job.errors} color="red" />
      </div>

      {/* Progress bar */}
      {job.status === "fetching" && (
        <div className="card mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">
              Fetching from {job.currentProvider}...
            </span>
            <span className="text-gray-500">{job.progress}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Unmatched transactions notice */}
      {job.matchedTransactions < job.totalTransactions && (
        <div className="card mb-6 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>
              {job.totalTransactions - job.matchedTransactions} transactions
            </strong>{" "}
            didn't match any configured provider. Configure more providers in
            the Providers tab to match them.
          </p>
        </div>
      )}

      {/* Invoice table */}
      {job.invoices.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Provider
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Vendor
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Amount
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Date
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {job.invoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} jobId={job.id} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center py-12 text-gray-500">
          No invoices matched. Configure providers with vendor name patterns to
          match your Brex transactions.
        </div>
      )}

      {/* Transaction list */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
          View all {job.totalTransactions} transactions
        </summary>
        <div className="card mt-2 overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Date
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Vendor
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Description
                </th>
                <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">
                  Amount
                </th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">
                  Matched
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {job.transactions.map((tx) => {
                const matched = job.invoices.some(
                  (inv) => inv.transactionId === tx.id
                );
                return (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">{tx.date}</td>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {tx.vendor}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {tx.description}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900">
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      {matched ? (
                        <span className="badge-green">Yes</span>
                      ) : (
                        <span className="badge-gray">No</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function InvoiceRow({
  invoice,
  jobId,
}: {
  invoice: Invoice;
  jobId: string;
}) {
  const statusBadge = () => {
    switch (invoice.status) {
      case "downloaded":
        return <span className="badge-green">Downloaded</span>;
      case "fetching":
        return (
          <span className="badge-blue">
            <span className="spinner w-3 h-3 mr-1 border" /> Fetching
          </span>
        );
      case "not_found":
        return <span className="badge-yellow">Not Found</span>;
      case "error":
        return (
          <span className="badge-red" title={invoice.errorMessage}>
            Error
          </span>
        );
      case "pending":
        return <span className="badge-gray">Pending</span>;
      default:
        return <span className="badge-gray">{invoice.status}</span>;
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm font-medium text-gray-900">
        {invoice.providerName}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">{invoice.vendor}</td>
      <td className="px-6 py-4 text-sm text-right text-gray-900">
        ${invoice.amount.toFixed(2)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">{invoice.date}</td>
      <td className="px-6 py-4">{statusBadge()}</td>
      <td className="px-6 py-4">
        {invoice.status === "downloaded" && (
          <a
            href={`/api/invoices/download/${jobId}/${invoice.id}`}
            className="text-brand-600 hover:text-brand-800 text-sm font-medium"
            download
          >
            Download
          </a>
        )}
        {invoice.status === "error" && invoice.errorMessage && (
          <span
            className="text-xs text-red-500 cursor-help"
            title={invoice.errorMessage}
          >
            {invoice.errorMessage.slice(0, 40)}...
          </span>
        )}
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "gray" | "blue" | "green" | "yellow" | "red";
}) {
  const colorMap = {
    gray: "text-gray-900",
    blue: "text-blue-600",
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
  };

  return (
    <div className="card text-center py-4">
      <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
