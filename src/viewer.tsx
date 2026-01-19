import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { CVMetadata } from "./types";

const App = () => {
  const [cvs, setCvs] = useState<CVMetadata[]>([]);
  const [selectedCV, setSelectedCV] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCVs();
  }, []);

  const fetchCVs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/cvs");
      if (!response.ok) {
        throw new Error("Failed to fetch CVs");
      }
      const data = await response.json();
      setCvs(data);

      // Auto-select first CV
      if (data.length > 0 && !selectedCV) {
        setSelectedCV(data[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadHTML = (cvName: string) => {
    window.open(`/download/html/${cvName}`, "_blank");
  };

  const handleDownloadPDF = (cvName: string) => {
    window.open(`/download/pdf/${cvName}`, "_blank");
  };

  const handleViewPDF = (cvName: string) => {
    window.open(`/pdf/${cvName}`, "_blank");
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h1 style={styles.title}>CV Viewer</h1>
          <p style={styles.subtitle}>Select a CV to view</p>
        </div>

        {loading && (
          <div style={styles.message}>Loading CVs...</div>
        )}

        {error && (
          <div style={styles.error}>Error: {error}</div>
        )}

        {!loading && !error && cvs.length === 0 && (
          <div style={styles.message}>
            No CVs found. Add a CV to data/ directory.
          </div>
        )}

        {!loading && !error && cvs.length > 0 && (
          <div style={styles.cvList}>
            {cvs.map((cv) => (
              <button
                key={cv.name}
                style={{
                  ...styles.cvButton,
                  ...(selectedCV === cv.name ? styles.cvButtonActive : {}),
                }}
                onClick={() => setSelectedCV(cv.name)}
              >
                <div style={styles.cvButtonName}>{cv.displayName}</div>
                <div style={styles.cvButtonPath}>{cv.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {selectedCV ? (
          <>
            <div style={styles.toolbar}>
              <h2 style={styles.previewTitle}>{selectedCV}</h2>
              <div style={styles.buttonGroup}>
                <button
                  style={styles.actionButton}
                  onClick={() => handleViewPDF(selectedCV)}
                >
                  📄 View PDF
                </button>
                <button
                  style={styles.actionButton}
                  onClick={() => handleDownloadHTML(selectedCV)}
                >
                  ⬇ Download HTML
                </button>
                <button
                  style={styles.actionButton}
                  onClick={() => handleDownloadPDF(selectedCV)}
                >
                  ⬇ Download PDF
                </button>
              </div>
            </div>

            <div style={styles.previewContainer}>
              <iframe
                key={selectedCV}
                src={`/render/${selectedCV}`}
                style={styles.iframe}
                title={`CV Preview: ${selectedCV}`}
              />
            </div>
          </>
        ) : (
          <div style={styles.emptyState}>
            <h2>No CV selected</h2>
            <p>Select a CV from the sidebar to view it</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
  },
  sidebar: {
    width: "300px",
    backgroundColor: "#2c3e50",
    color: "white",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #34495e",
  },
  sidebarHeader: {
    padding: "24px 20px",
    borderBottom: "1px solid #34495e",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#bdc3c7",
  },
  cvList: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
  },
  cvButton: {
    width: "100%",
    padding: "12px 16px",
    marginBottom: "8px",
    backgroundColor: "#34495e",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.2s",
  },
  cvButtonActive: {
    backgroundColor: "#3498db",
  },
  cvButtonName: {
    fontSize: "16px",
    fontWeight: "500",
    marginBottom: "4px",
  },
  cvButtonPath: {
    fontSize: "12px",
    color: "#bdc3c7",
  },
  message: {
    padding: "20px",
    color: "#bdc3c7",
    textAlign: "center",
  },
  error: {
    padding: "20px",
    color: "#e74c3c",
    textAlign: "center",
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ecf0f1",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    backgroundColor: "white",
    borderBottom: "1px solid #ddd",
  },
  previewTitle: {
    fontSize: "18px",
    fontWeight: "500",
    color: "#2c3e50",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
  },
  actionButton: {
    padding: "8px 16px",
    backgroundColor: "#3498db",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  previewContainer: {
    flex: 1,
    padding: "20px",
    overflow: "hidden",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "white",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#7f8c8d",
  },
};

// Mount React app
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
