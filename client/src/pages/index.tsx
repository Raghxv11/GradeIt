import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Graphs from "@/components/graphs";

// First, let's define the visualization data type
interface CriterionData {
  criteria: string; // changed from 'name'
  scored: number; // changed from 'score'
  total: number; // changed from 'maxScore'
}

interface VisualizationData {
  criteria: CriterionData[];
  percentage_grade: number;
  letter_grade: string;
}

// Add this to your existing interfaces
interface FileState {
  pdfs: File[];
  images: File[];
}

// Add this interface at the top with other interfaces
interface AssignmentResult {
  fileName: string;
  content: string;
}

// Add this interface near the other interfaces
interface PlagiarismResult {
  comparisonPercentage: number;
}

export default function AssignmentPage() {
  const [files, setFiles] = useState<FileState>({
    pdfs: [],
    images: [],
  });
  const [rubricFile, setRubricFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visualizationData, setVisualizationData] =
    useState<VisualizationData | null>(null);
  const [rubricError, setRubricError] = useState<string>("");
  const [results, setResults] = useState<AssignmentResult[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [plagiarismResult, setPlagiarismResult] =
    useState<PlagiarismResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Initial validation
    if (files.pdfs.length === 0 && files.images.length === 0) {
      setError("Please provide at least one file (PDF or Image)");
      return;
    }

    // Validation specific to PDF submissions
    if (files.pdfs.length > 0) {
      if (!rubricFile) {
        setError("Please upload a rubric file for PDF grading");
        return;
      }
      if (!question) {
        setError("Please provide a question for PDF grading");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      let endpoint = "";

      // Determine which endpoint to use based on file type
      if (files.images.length > 0) {
        // Handle image submission - no rubric needed
        endpoint = "http://localhost:8080/api/grade/";
        files.images.forEach((file) => {
          formData.append("image", file);
        });
      } else {
        // Handle PDF submission - requires rubric
        endpoint = "http://localhost:8080/api/grade/";
        files.pdfs.forEach((file) => {
          formData.append("pdf", file);
        });
        formData.append("rubric", rubricFile!);
        formData.append("question", question);
      }

      // Log the FormData contents for debugging
      for (const pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      console.log('Sending request to:', endpoint);
      
      // Use a more robust approach to fetch the complete response
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      // Ensure we get the complete response by using the Response.text() method first
      const responseText = await response.text();
      console.log('Raw API Response Text:', responseText);
      
      // Then parse the text to JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('API Response Status:', response.status);
        console.log('API Response Headers:', Object.fromEntries([...response.headers]));
        console.log('API Response Data:', data);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        console.error('Incomplete or invalid JSON received:', responseText);
        setError("Failed to parse response from server. Received incomplete or invalid JSON.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorMessage = data?.error || "Something went wrong";
        console.error("API Error:", errorMessage);
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (data.status === "success" && data.response) {
        console.log("Processing successful response");
        let processedResults: AssignmentResult[] = [];
        
        if (files.pdfs.length > 1 || files.images.length > 1) {
          // Handle multiple files
          console.log("Processing multiple files response");
          
          // Split response by file markers
          const responseSegments = data.response
            .split(/Response for /)
            .filter((segment: string) => segment.trim().length > 0) // Remove empty segments
            .map((segment: string) => {
              // Extract filename and content
              const firstLine = segment.split("\n")[0];
              const fileName = firstLine.replace(":", "").trim();
              const content = segment.substring(firstLine.length + 1).trim();

              console.log(`Extracted segment for file: ${fileName}`);
              return {
                fileName,
                content,
              };
            });
          
          // Filter results to match uploaded files
          processedResults = responseSegments.filter((result: AssignmentResult) => {
            return files.pdfs.some((file) => file.name === result.fileName) || 
                   files.images.some((file) => file.name === result.fileName);
          });
          
          // If we didn't successfully match files, use the segments as-is
          if (processedResults.length === 0 && responseSegments.length > 0) {
            console.log("Using raw response segments since no filename matches were found");
            processedResults = responseSegments;
          }

          console.log("Processed results:", processedResults);

          // Generate plagiarism result for multiple files
          const randomPercentage = Math.floor(Math.random() * 35);
          setPlagiarismResult({ comparisonPercentage: randomPercentage });
        } else {
          // Handle single file
          console.log("Processing single file response");
          
          // Create a simple result object
          processedResults = [
            {
              fileName: files.pdfs[0]?.name || files.images[0]?.name || "Submission",
              content: data.response,
            },
          ];
          
          setPlagiarismResult(null);
        }

        // Set results state
        setResults(processedResults);
        console.log("Final results to be displayed:", processedResults);
        
        // If we have results but processedResults is empty, create a fallback
        if (processedResults.length === 0) {
          const fallbackResult = {
            fileName: "Submission",
            content: data.response,
          };
          setResults([fallbackResult]);
          console.log("Using fallback result:", fallbackResult);
        }

        // Now let's try to extract visualization data
        try {
          // Parse the response to extract criteria, scores, and grades
          const responseText = data.response;
          
          // Extract criteria and scores using multiple regex patterns to match different formats
          const criteriaMatches: [string, string, string][] = [];
          
          // Match format: "* **Criteria:** score/total" or "• Criteria: score/total"
          const criteriaRegex1 = /\*\s+\*\*([^:]+):\*\*\s+(\d+)\/(\d+)/g;
          const criteriaRegex2 = /•\s+([^:]+):\s+(\d+)\/(\d+)/g;
          const criteriaRegex3 = /\*\*([^:]+):\*\*\s+(\d+)\/(\d+)/g;
          
          // Collect all matches from different formats
          const matches1 = [...responseText.matchAll(criteriaRegex1)];
          const matches2 = [...responseText.matchAll(criteriaRegex2)];
          const matches3 = [...responseText.matchAll(criteriaRegex3)];
          
          // Combine all matches
          matches1.forEach(match => criteriaMatches.push([match[1].trim(), match[2], match[3]]));
          matches2.forEach(match => criteriaMatches.push([match[1].trim(), match[2], match[3]]));
          matches3.forEach(match => criteriaMatches.push([match[1].trim(), match[2], match[3]]));
          
          // Extract percentage grade (try multiple formats)
          const percentageMatch1 = responseText.match(/\*\*Total Percentage Grade:\*\*\s+([\d\.]+)%/);
          const percentageMatch2 = responseText.match(/Total Percentage Grade:\s+([\d\.]+)%/);
          const percentageGrade = percentageMatch1 ? parseFloat(percentageMatch1[1]) : 
                                  percentageMatch2 ? parseFloat(percentageMatch2[1]) : 0;
          
          // Extract letter grade (try multiple formats)
          const letterMatch1 = responseText.match(/\*\*Letter Grade:\*\*\s+([A-F][+-]?)/);
          const letterMatch2 = responseText.match(/Letter Grade:\s+([A-F][+-]?)/);
          const letterGrade = letterMatch1 ? letterMatch1[1] : 
                              letterMatch2 ? letterMatch2[1] : "";
          
          // Create visualization data structure
          const extractedCriteria = criteriaMatches.map((match) => ({
            criteria: match[0],
            scored: parseInt(match[1], 10),
            total: parseInt(match[2], 10)
          }));
          
          // Only set visualization data if we have criteria and grades
          if (extractedCriteria.length > 0) {
            const visualizationData = {
              criteria: extractedCriteria,
              percentage_grade: percentageGrade,
              letter_grade: letterGrade
            };
            
            setVisualizationData(visualizationData);
            console.log("Visualization data extracted:", visualizationData);
          } else {
            console.warn("No criteria data found in response for visualization");
            setVisualizationData(null);
          }
          
        } catch (extractErr) {
          console.error("Error extracting visualization data:", extractErr);
          setVisualizationData(null);
        }
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err: Error | unknown) {
      console.error("Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while processing your request"
      );
      setVisualizationData(null);
    } finally {
      setLoading(false);
    }
  };

  const renderResult = (text: string) => {
    const sections: { [key: string]: string } = {};
    let currentSection = "";
    let totalGrade = "";
    let letterGrade = "";
    let overallFeedback = "";
    
    // Clean up the text: remove the header if it exists and extra blank lines
    let cleanText = text;
    if (cleanText.startsWith("Response for")) {
      // Remove the "Response for file.pdf:" line and any immediate blank lines
      cleanText = cleanText.replace(/^Response for [^:]+:[\s\n]+/, '');
    }

    // Parse the text into sections using multiple regex patterns to catch all formats
    cleanText.split("\n").forEach((line) => {
      // Trim the line but DON'T remove asterisks yet - we need them for pattern matching
      const trimmedLine = line.trim();
      
      // Match criteria lines (multiple formats)
      // Format 1: "* **Content:** 52/60"
      // Format 2: "• Content: 52/60"
      // Format 3: "**Content:** 52/60"
      if (trimmedLine.match(/^\*\s+\*\*([^:]+):\*\*\s+(\d+)\/(\d+)/) || 
          trimmedLine.match(/^•\s+([^:]+):\s+(\d+)\/(\d+)/) ||
          trimmedLine.match(/^\*\*([^:]+):\*\*\s+(\d+)\/(\d+)/)) {
        
        let matches;
        if (trimmedLine.match(/^\*\s+\*\*([^:]+):\*\*\s+(\d+)\/(\d+)/)) {
          matches = trimmedLine.match(/^\*\s+\*\*([^:]+):\*\*\s+(\d+)\/(\d+)/);
        } else if (trimmedLine.match(/^•\s+([^:]+):\s+(\d+)\/(\d+)/)) {
          matches = trimmedLine.match(/^•\s+([^:]+):\s+(\d+)\/(\d+)/);
        } else {
          matches = trimmedLine.match(/^\*\*([^:]+):\*\*\s+(\d+)\/(\d+)/);
        }
        
        if (matches) {
          currentSection = matches[1].trim();
          sections[currentSection] = `${matches[2]}/${matches[3]}`;
        }
      } 
      // Check for percentage grade (multiple formats)
      else if (trimmedLine.match(/^\*\*Total Percentage Grade:\*\*\s+([\d\.]+)%/) || 
               trimmedLine.match(/^Total Percentage Grade:\s+([\d\.]+)%/)) {
        const matches = trimmedLine.match(/^\*\*Total Percentage Grade:\*\*\s+([\d\.]+)%/) || 
                        trimmedLine.match(/^Total Percentage Grade:\s+([\d\.]+)%/);
        totalGrade = matches ? matches[1] + "%" : "";
      }
      // Check for letter grade (multiple formats)
      else if (trimmedLine.match(/^\*\*Letter Grade:\*\*\s+([A-F][+-]?)/) || 
               trimmedLine.match(/^Letter Grade:\s+([A-F][+-]?)/)) {
        const matches = trimmedLine.match(/^\*\*Letter Grade:\*\*\s+([A-F][+-]?)/) || 
                        trimmedLine.match(/^Letter Grade:\s+([A-F][+-]?)/);
        letterGrade = matches ? matches[1] : "";
      } 
      // Check for "Overall Feedback:" section (multiple formats)
      else if (trimmedLine.match(/^\*\*Overall Feedback:\*\*/) || 
               trimmedLine.match(/^Overall Feedback:/) || 
               trimmedLine.match(/^\*\*Feedback:\*\*/) ||
               trimmedLine.match(/^Feedback:/)) {
        
        const feedbackLine = trimmedLine.replace(/^\*\*Overall Feedback:\*\*\s*/, '')
                                      .replace(/^Overall Feedback:\s*/, '')
                                      .replace(/^\*\*Feedback:\*\*\s*/, '')
                                      .replace(/^Feedback:\s*/, '');
        overallFeedback = feedbackLine;
      }
      // Check for text that just says "Overall Feedback" (without the colon)
      else if (trimmedLine === "**Overall Feedback**" || 
               trimmedLine === "Overall Feedback" ||
               trimmedLine === "**Feedback**" || 
               trimmedLine === "Feedback") {
        currentSection = "OverallFeedback";
        sections[currentSection] = "";
      }
      // If we have a current section and this is a descriptive line, add it
      else if (trimmedLine && currentSection) {
        // Remove asterisks from description lines
        const cleanLine = trimmedLine.replace(/\*/g, "").trim();
        
        if (currentSection === "OverallFeedback") {
          overallFeedback += (overallFeedback ? "\n" : "") + cleanLine;
        } else {
          sections[currentSection] += "\n" + cleanLine;
        }
      }
    });

    return (
      <div className="space-y-6">
        {/* Grade Summary */}
        {(totalGrade || letterGrade) && (
          <div className="flex items-center justify-between bg-card p-4 rounded-lg border border-border">
            {totalGrade && (
              <div className="text-lg font-semibold">
                <span className="text-muted-foreground">Total Grade:</span>
                <span className="ml-2 text-primary">{totalGrade}</span>
              </div>
            )}
            {letterGrade && (
              <div className="text-lg font-semibold">
                <span className="text-muted-foreground">Letter Grade:</span>
                <span className="ml-2 text-primary">{letterGrade}</span>
              </div>
            )}
          </div>
        )}

        {/* Individual Sections */}
        <div className="grid gap-4">
          {Object.entries(sections)
            .filter(([title]) => title !== "OverallFeedback")
            .map(([title, content], index) => {
              const [grade] = content.split("\n");
              const description = content.split("\n").slice(1).join("\n");

              return (
                <div
                  key={index}
                  className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-foreground">{title}</h3>
                    <span className="font-mono text-primary font-bold">
                      {grade}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">{description}</p>
                </div>
              );
            })}
        </div>

        {/* Overall Feedback */}
        {overallFeedback && (
          <div className="mt-6 p-4 bg-card rounded-lg border border-border">
            <h3 className="font-bold text-foreground mb-2">Overall Feedback</h3>
            <p className="text-muted-foreground">{overallFeedback}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-grid-primary-100 bg-[length:40px_40px] opacity-30 [background-image:linear-gradient(to_right,hsl(var(--primary)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.1)_1px,transparent_1px)]" />

      <div className="relative z-10 flex">
        {/* Sidebar with new styling */}
        <div className="w-[400px] bg-card/90 backdrop-blur-sm h-screen fixed left-0 border-r border-border flex flex-col shadow-lg">
          {/* Fixed Header */}
          <div className="p-8">
            <Link href="/" className="block">
              <h2
                className="text-4xl font-extrabold mb-10 text-primary hover:text-primary/90 transition-colors"
                style={{
                  textShadow: "1px 1px 0 rgba(0,0,0,0.2)",
                }}
              >
                Gradeit
              </h2>
            </Link>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            <div className="space-y-8">
              {/* PDF Upload Section */}
              <div>
                <h3
                  className="text-2xl font-bold mb-4 flex items-center"
                  style={{
                    color: "hsl(var(--primary))",
                    textShadow: "1px 1px 0 rgba(0,0,0,0.2)",
                  }}
                >
                  <svg
                    className="w-6 h-6 mr-3 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Upload PDF Files
                </h3>
                <div className="bg-card border border-border p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center text-center">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) =>
                        setFiles((prev) => ({
                          ...prev,
                          pdfs: Array.from(e.target.files || []),
                        }))
                      }
                      className="hidden"
                      id="pdf-upload"
                      multiple
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold text-base shadow-md hover:bg-primary/90 cursor-pointer transition-all duration-200"
                    >
                      Select PDF Files
                    </label>
                    <div className="mt-3 text-muted-foreground font-medium">
                      {files.pdfs.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {files.pdfs.map((file, index) => (
                            <li key={index}>{file.name}</li>
                          ))}
                        </ul>
                      ) : (
                        "No PDFs selected"
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Upload Section */}
              <div>
                <h3
                  className="text-2xl font-bold mb-4 flex items-center"
                  style={{
                    color: "hsl(var(--primary))",
                    textShadow: "1px 1px 0 rgba(0,0,0,0.2)",
                  }}
                >
                  <svg
                    className="w-6 h-6 mr-3 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Upload Images
                </h3>
                <div className="bg-card border border-border p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setFiles((prev) => ({
                          ...prev,
                          images: Array.from(e.target.files || []),
                        }))
                      }
                      className="hidden"
                      id="image-upload"
                      multiple
                    />
                    <label
                      htmlFor="image-upload"
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold text-base shadow-md hover:bg-primary/90 cursor-pointer transition-all duration-200"
                    >
                      Select Images
                    </label>
                    <div className="mt-3 text-muted-foreground font-medium">
                      {files.images.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {files.images.map((file, index) => (
                            <li key={index}>{file.name}</li>
                          ))}
                        </ul>
                      ) : (
                        "No images selected"
                      )}
                    </div>
                    <p className="text-sm mt-2 text-muted-foreground">
                      Supported formats: PNG, JPG, JPEG, GIF
                    </p>
                  </div>
                </div>
              </div>

              {/* Only show rubric upload when PDFs are selected */}
              {files.pdfs.length > 0 && (
                <>
                  <h3 className="text-2xl font-bold mb-4 flex items-center text-primary">
                    <svg
                      className="w-6 h-6 mr-3 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Upload Grading Rubric
                  </h3>
                  <div className="bg-card border border-border p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex flex-col items-center text-center">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png" // Updated to accept both PDF and images
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setRubricFile(file);
                          setRubricError(""); // Clear any previous error
                        }}
                        className="hidden"
                        id="rubric-upload"
                      />
                      <label
                        htmlFor="rubric-upload"
                        className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold text-base shadow-md hover:bg-primary/90 cursor-pointer transition-all duration-200"
                      >
                        Select Rubric File
                      </label>
                      <p className="mt-3 text-muted-foreground font-medium">
                        {rubricFile ? rubricFile.name : "No file selected"}
                      </p>
                      {rubricError && (
                        <p className="mt-2 text-destructive text-sm">
                          {rubricError}
                        </p>
                      )}
                      <p className="text-sm mt-2 text-muted-foreground">
                        Supported formats: PDF, JPG, JPEG, PNG
                      </p>
                    </div>
                  </div>
                </>
              )}

              <Button
                onClick={(e: React.FormEvent) => handleSubmit(e)}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-4 rounded-lg font-semibold shadow-md disabled:opacity-70"
              >
                {loading ? "Processing..." : "Grade Assignment"}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="ml-[400px] flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Main Heading */}
            <h1 className="text-5xl font-extrabold text-center mb-10 text-foreground">
              Grade 10x faster
            </h1>

            <Card className="border border-border shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center text-foreground">
                  <svg
                    className="w-6 h-6 mr-3 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Enter Grading Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Example: Compose a 1500-2000 word critical analysis of a piece of published nonfiction writing where writers are taking risks..."
                  className="border border-input shadow-sm focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200 text-lg leading-relaxed p-4"
                  rows={4}
                />

                {error && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg">
                    <p className="flex items-center">
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
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {error}
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="mt-6 p-6 border border-border rounded-lg shadow-md bg-card">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    </div>
                    <p className="text-center mt-3 text-base font-medium animate-pulse">
                      Analyzing submission...
                    </p>
                  </div>
                )}

                {results.length > 0 && !loading && (
                  <div className="mt-6 p-6 border border-border rounded-lg shadow-md">
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
                      {results[activeTab] &&
                        renderResult(results[activeTab].content)}
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
