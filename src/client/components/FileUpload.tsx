import React, { useState, useCallback, useRef } from "react";
import { useApi } from "../hooks/useApi.js";
import type { UploadResponse } from "../../shared/types.js";

interface FileUploadProps {
  onComplete: (result: UploadResponse) => void;
}

export function FileUpload({ onComplete }: FileUploadProps) {
  const api = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      setError("Please upload a CSV or XLSX file");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setUploading(true);

    try {
      const result = await api.upload<UploadResponse>("/upload", file);
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [api, onComplete]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Upload Brex Export
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload your monthly Brex CSV or XLSX export to match transactions with
          invoice providers
        </p>
      </div>

      <div className="card">
        <div
          className={`drop-zone ${dragging ? "dragging" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleInputChange}
            className="hidden"
          />

          {uploading ? (
            <div>
              <div className="spinner mb-4 w-10 h-10 border-4" />
              <p className="text-lg font-medium text-gray-700">
                Processing {selectedFile?.name}...
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Parsing transactions and matching providers
              </p>
            </div>
          ) : (
            <div>
              <div className="text-5xl mb-4">&#128228;</div>
              <p className="text-lg font-medium text-gray-700">
                Drop your Brex export here
              </p>
              <p className="mt-2 text-sm text-gray-500">
                or click to browse — supports CSV and XLSX
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Expected columns
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Date / Posted Date
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Merchant / Vendor
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Amount
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              Category (optional)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              Description (optional)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              Currency (optional)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
