import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Graphs from "@/components/graphs";
import { useRouter } from 'next/router';
import ResultDisplay from '@/components/ResultDisplay';
import { useResultData } from '@/hooks/useResultData';

function ResultPage() {
  const router = useRouter();
  // Use the ID from the URL query
  const { id: urlId } = router.query;
  
  // Use our custom hook to handle all the data and logic
  const {
    results,
    loading,
    error,
    activeTab,
    setActiveTab,
    documentId,
    plagiarismResult,
    visualizationData,
    isEditing,
    setIsEditing,
    hasChanges,
    parsedResults,
    approvedGrades,
    approvingGrade,
    handleSectionChange,
    handleApprove,
    handleApproveGrade
  } = useResultData({ urlId });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {documentId && (
          <div className="mb-4 text-sm text-muted-foreground">
            Document ID: <span className="font-mono">{documentId}</span>
          </div>
        )}
        
        <Card className="border border-border shadow-lg">
          <CardContent className="p-6">
            {/* Edit/Save Button */}
            <div className="flex justify-end mb-4">
              <Button
                variant={isEditing ? "default" : "outline"}
                onClick={() => setIsEditing(!isEditing)}
                className="mr-2"
                disabled={loading}
              >
                {isEditing ? "Cancel Editing" : "Edit Results"}
              </Button>
              {hasChanges && (
                <Button
                  variant="default"
                  onClick={handleApprove}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Approve Changes"}
                </Button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
                <p>{error}</p>
              </div>
            )}

            {results.length > 0 && !loading && (
              <div className="mt-6">
                <h3 className="text-xl font-bold mb-4 text-primary flex items-center">
                  <svg
                    className="w-6 h-6 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Evaluation Results
                </h3>

                {/* Plagiarism Result for Multiple PDFs */}
                {plagiarismResult && results.length > 1 && (
                  <div
                    className={`mb-6 p-4 rounded-lg border ${
                      plagiarismResult.comparisonPercentage > 30
                        ? "bg-destructive/10 border-destructive/30 text-destructive"
                        : "bg-primary/10 border-primary/30 text-primary"
                    }`}
                  >
                    <h4 className="font-bold mb-2 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Plagiarism Check Results
                    </h4>
                    <p>
                      Similarity between submissions:
                      <span className="font-bold ml-2">
                        {plagiarismResult.comparisonPercentage}%
                      </span>
                    </p>
                    <p className="text-sm mt-1">
                      {plagiarismResult.comparisonPercentage > 30
                        ? "Warning: High similarity detected between submissions."
                        : "Acceptable level of similarity between submissions."}
                    </p>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-border mb-4 overflow-x-auto pb-1">
                  {results.map((result, index) => (
                    <button
                      key={index}
                      className={`py-2 px-4 mr-2 font-medium rounded-t-lg whitespace-nowrap ${
                        activeTab === index
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                      onClick={() => setActiveTab(index)}
                    >
                      {result.fileName}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="whitespace-pre-wrap text-foreground">
                  {results[activeTab] && parsedResults && (
                    <ResultDisplay
                      sections={parsedResults.sections}
                      totalGrade={parsedResults.totalGrade}
                      letterGrade={parsedResults.letterGrade}
                      overallFeedback={parsedResults.overallFeedback}
                      isEditing={isEditing}
                      onSectionChange={handleSectionChange}
                      fileName={results[activeTab].fileName}
                      onApproveGrade={handleApproveGrade}
                      isApproving={approvingGrade}
                      isApproved={approvedGrades[results[activeTab].fileName]}
                    />
                  )}
                </div>

                {visualizationData && (
                  <div className="mt-8">
                    <h4 className="text-lg font-bold mb-4 text-primary">
                      Grading Visualization
                    </h4>
                    <Graphs
                      criteria={visualizationData.criteria.map((c) => ({
                        ...c,
                        scored: c.scored.toString(),
                        total: c.total.toString(),
                      }))}
                    />
                    <div className="mt-4 p-4 bg-secondary rounded-lg">
                      <p className="font-semibold">
                        Total Percentage Grade:{" "}
                        <span className="text-primary">
                          {visualizationData.percentage_grade}%
                        </span>
                      </p>
                      <p className="font-semibold">
                        Letter Grade:{" "}
                        <span className="text-primary">
                          {visualizationData.letter_grade}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="p-6 border border-border rounded-lg shadow-md bg-card">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                </div>
                <p className="text-center mt-3 text-base font-medium animate-pulse">
                  Loading results...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ResultPage;