import React, { useState, useEffect, ChangeEvent } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Graphs from "@/components/graphs";
import { useRouter } from 'next/router';
import { getResultById, getAllResults, updateResultById, getStudentByName, updateStudentGrade } from '@/lib/firebase';

// Types from index page
interface CriterionData {
  criteria: string;
  scored: number;
  total: number;
}

interface VisualizationData {
  criteria: CriterionData[];
  percentage_grade: number;
  letter_grade: string;
}

interface AssignmentResult {
  fileName: string;
  content: string;
}

interface PlagiarismResult {
  comparisonPercentage: number;
}

interface Section {
  title: string;
  grade: string;
  description: string;
}

// Add this interface for Student data
interface Student {
  id: string;
  name: string;
  finalProject?: number;
  [key: string]: any; // Allow for other properties
}

// Add this interface for Firebase result data
interface FirebaseResult {
  id?: string;
  results?: AssignmentResult[];
  response?: string;
  visualizationData?: VisualizationData;
  plagiarismResult?: PlagiarismResult;
  timestamp?: any;
}

// Helper function to parse result text (no hooks inside)
const parseResultText = (text: string) => {
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
    // Check for "Steps for Improvement:" section
    else if (trimmedLine === "**Steps for Improvement:**" || 
             trimmedLine === "Steps for Improvement:") {
      currentSection = "StepsForImprovement";
      sections[currentSection] = "";
    }
    // If we have a current section and this is a descriptive line, add it
    else if (trimmedLine && currentSection) {
      // Remove asterisks from description lines
      const cleanLine = trimmedLine.replace(/\*/g, "").trim();
      
      if (currentSection === "OverallFeedback") {
        overallFeedback += (overallFeedback ? "\n" : "") + cleanLine;
      } else if (currentSection === "StepsForImprovement") {
        // Add steps for improvement to overall feedback
        if (!overallFeedback.includes("Steps for Improvement:")) {
          overallFeedback += (overallFeedback ? "\n\n" : "") + "Steps for Improvement:\n" + cleanLine;
        } else {
          overallFeedback += "\n" + cleanLine;
        }
      } else {
        sections[currentSection] += "\n" + cleanLine;
      }
    }
  });

  // Convert sections to array format
  const sectionsArray = Object.entries(sections)
    .filter(([title]) => title !== "OverallFeedback" && title !== "StepsForImprovement")
    .map(([title, content]) => {
      const [grade] = content.split("\n");
      const description = content.split("\n").slice(1).join("\n");
      return { title, grade, description };
    });

  return {
    sections: sectionsArray,
    totalGrade,
    letterGrade,
    overallFeedback
  };
};

// Render component for displaying the result (no hooks inside)
const ResultDisplay = ({ 
  sections, 
  totalGrade, 
  letterGrade, 
  overallFeedback,
  isEditing,
  onSectionChange,
  onApproveGrade,
  fileName,
  isApproving,
  isApproved
}: {
  sections: Section[],
  totalGrade: string,
  letterGrade: string,
  overallFeedback: string,
  isEditing: boolean,
  fileName: string,
  isApproving?: boolean,
  isApproved?: boolean,
  onSectionChange?: (sections: Section[], totalGrade: string, letterGrade: string, overallFeedback: string) => void,
  onApproveGrade?: (grade: number) => Promise<void>
}) => {
  return (
    <div className="space-y-6">
      {/* Grade Summary */}
      {(totalGrade || letterGrade) && (
        <div className="flex items-center justify-between bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center">
            {totalGrade && (
              <div className="text-lg font-semibold">
                <span className="text-muted-foreground">Total Grade:</span>
                {isEditing ? (
                  <Input
                    className="ml-2 w-24 inline-block"
                    value={totalGrade}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (onSectionChange) {
                        onSectionChange(sections, e.target.value, letterGrade, overallFeedback);
                      }
                    }}
                  />
                ) : (
                  <span className="ml-2 text-primary">{totalGrade}</span>
                )}
              </div>
            )}
            {letterGrade && (
              <div className="text-lg font-semibold ml-4">
                <span className="text-muted-foreground">Letter Grade:</span>
                {isEditing ? (
                  <Input
                    className="ml-2 w-24 inline-block"
                    value={letterGrade}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (onSectionChange) {
                        onSectionChange(sections, totalGrade, e.target.value, overallFeedback);
                      }
                    }}
                  />
                ) : (
                  <span className="ml-2 text-primary">{letterGrade}</span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            {/* Approved Status */}
            {isApproved && (
              <div className="flex items-center text-green-600 mr-4">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Grade Approved</span>
              </div>
            )}
            
            {/* Add Approve Grade Button */}
            {!isEditing && onApproveGrade && !isApproved && (
              <Button 
                variant="default" 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  // Extract the numeric value from totalGrade (remove % sign)
                  const gradeValue = parseFloat(totalGrade.replace('%', ''));
                  if (!isNaN(gradeValue)) {
                    onApproveGrade(gradeValue);
                  }
                }}
                disabled={isApproving}
              >
                {isApproving ? "Approving..." : "Approve Grade"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Individual Sections */}
      <div className="grid gap-4">
        {sections.map((section, index) => (
          <div
            key={index}
            className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-center mb-2">
              {isEditing ? (
                <>
                  <Input
                    className="w-1/2 mr-2"
                    value={section.title}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (onSectionChange) {
                        const newSections = [...sections];
                        newSections[index].title = e.target.value;
                        onSectionChange(newSections, totalGrade, letterGrade, overallFeedback);
                      }
                    }}
                  />
                  <Input
                    className="w-24"
                    value={section.grade}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      if (onSectionChange) {
                        const newSections = [...sections];
                        newSections[index].grade = e.target.value;
                        onSectionChange(newSections, totalGrade, letterGrade, overallFeedback);
                      }
                    }}
                  />
                </>
              ) : (
                <>
                  <h3 className="font-bold text-foreground">{section.title}</h3>
                  <span className="font-mono text-primary font-bold">
                    {section.grade}
                  </span>
                </>
              )}
            </div>
            {isEditing ? (
              <Textarea
                className="w-full"
                value={section.description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  if (onSectionChange) {
                    const newSections = [...sections];
                    newSections[index].description = e.target.value;
                    onSectionChange(newSections, totalGrade, letterGrade, overallFeedback);
                  }
                }}
              />
            ) : (
              <p className="text-muted-foreground text-sm">{section.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Overall Feedback */}
      {(overallFeedback || isEditing) && (
        <div className="mt-6 p-4 bg-card rounded-lg border border-border">
          <h3 className="font-bold text-foreground mb-2">Overall Feedback</h3>
          {isEditing ? (
            <Textarea
              className="w-full"
              value={overallFeedback}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                if (onSectionChange) {
                  onSectionChange(sections, totalGrade, letterGrade, e.target.value);
                }
              }}
            />
          ) : (
            <p className="text-muted-foreground">{overallFeedback}</p>
          )}
        </div>
      )}
    </div>
  );
};

function ResultPage() {
  const router = useRouter();
  // Use the ID from the URL query or the hardcoded ID if not available
  const { id: urlId } = router.query;
  const hardcodedId = "0xrLLOuRuOdQQAqG2kGB"; // The specific ID provided
  
  // State for managing results - will be populated from Firebase
  const [results, setResults] = useState<AssignmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
  const [visualizationData, setVisualizationData] = useState<VisualizationData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [approvingGrade, setApprovingGrade] = useState(false);
  const [approvedGrades, setApprovedGrades] = useState<{[key: string]: boolean}>({});

  // Add state to track edited results
  const [editedResults, setEditedResults] = useState<AssignmentResult[]>([]);
  const [editedVisualizationData, setEditedVisualizationData] = useState<VisualizationData | null>(null);
  
  // State for the parsed result data
  const [parsedResults, setParsedResults] = useState<{
    sections: Section[],
    totalGrade: string,
    letterGrade: string,
    overallFeedback: string
  } | null>(null);

  // Effect to parse the active result when it changes
  useEffect(() => {
    if (results.length > 0 && activeTab < results.length) {
      const parsed = parseResultText(results[activeTab].content);
      setParsedResults(parsed);
    } else {
      setParsedResults(null);
    }
  }, [results, activeTab]);

  // Fetch result data when component mounts or ID changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      // Use the URL ID if available, otherwise use the hardcoded ID
      const idToUse = (urlId as string) || hardcodedId;
      setDocumentId(idToUse);
      
      try {
        console.log(`Fetching result with ID: ${idToUse}`);
        const resultData = await getResultById(idToUse) as FirebaseResult | null;
        
        if (resultData) {
          console.log('Result data:', resultData);
          
          // Check if we have results array
          if (resultData.results && Array.isArray(resultData.results)) {
            setResults(resultData.results);
            
            // Check for approved grades
            const approvedGradesObj: {[key: string]: boolean} = {};
            
            // For each result, check if the student has a grade in the database
            for (const result of resultData.results) {
              try {
                const fileName = result.fileName;
                const studentName = fileName.replace('.pdf', '');
                
                // Find the student in the database
                const student = await getStudentByName(studentName) as Student | null;
                
                if (student && student.finalProject !== undefined) {
                  // If the student has a finalProject grade, mark it as approved
                  approvedGradesObj[fileName] = true;
                  console.log(`Found approved grade for ${studentName}: ${student.finalProject}`);
                }
              } catch (err) {
                console.error('Error checking student grade:', err);
              }
            }
            
            setApprovedGrades(approvedGradesObj);
          } else if (resultData.response && typeof resultData.response === 'string') {
            // If we have a response string but no results array, parse it
            const responseStr = resultData.response;
            
            // Check if the response contains multiple student evaluations
            if (responseStr.includes("Response for student")) {
              // Split the response by "Response for" to get individual student responses
              const studentResponses = responseStr.split(/Response for (?=student\d+\.pdf:)/);
              
              // Filter out any empty strings and process each response
              const parsedResults = studentResponses
                .filter(response => response.trim().length > 0)
                .map(response => {
                  // Extract the filename from the response
                  const filenameMatch = response.match(/^(student\d+\.pdf):/);
                  const fileName = filenameMatch ? filenameMatch[1] : "Unknown";
                  
                  // Return the formatted result
                  return {
                    fileName,
                    content: `Response for ${response.trim()}`
                  };
                });
              
              if (parsedResults.length > 0) {
                setResults(parsedResults);
              } else {
                // Fallback to a single result if parsing failed
                setResults([{
                  fileName: 'Student Response',
                  content: responseStr
                }]);
              }
            } else {
              // Single response
              setResults([{
                fileName: 'Student Response',
                content: responseStr
              }]);
            }
          } else {
            setResults([]);
          }
          
          if (resultData.visualizationData) {
            setVisualizationData(resultData.visualizationData);
          }
          
          if (resultData.plagiarismResult) {
            setPlagiarismResult(resultData.plagiarismResult);
          }
        } else {
          setError(`No result found with ID: ${idToUse}`);
          // If the specific ID fails, try fetching all results as a fallback
          console.log('Fetching all results as fallback');
          const allResults = await getAllResults();
          console.log('All results:', allResults);
          
          if (allResults && allResults.length > 0) {
            console.log('Using first result as fallback');
            const firstResult = allResults[0] as FirebaseResult;
            
            if (firstResult.results && Array.isArray(firstResult.results)) {
              setResults(firstResult.results);
            } else if (firstResult.response && typeof firstResult.response === 'string') {
              // If we have a response string but no results array, parse it
              const responseStr = firstResult.response;
              
              // Check if the response contains multiple student evaluations
              if (responseStr.includes("Response for student")) {
                // Split the response by "Response for" to get individual student responses
                const studentResponses = responseStr.split(/Response for (?=student\d+\.pdf:)/);
                
                // Filter out any empty strings and process each response
                const parsedResults = studentResponses
                  .filter(response => response.trim().length > 0)
                  .map(response => {
                    // Extract the filename from the response
                    const filenameMatch = response.match(/^(student\d+\.pdf):/);
                    const fileName = filenameMatch ? filenameMatch[1] : "Unknown";
                    
                    // Return the formatted result
                    return {
                      fileName,
                      content: `Response for ${response.trim()}`
                    };
                  });
                
                if (parsedResults.length > 0) {
                  setResults(parsedResults);
                } else {
                  // Fallback to a single result if parsing failed
                  setResults([{
                    fileName: 'Student Response',
                    content: responseStr
                  }]);
                }
              } else {
                // Single response
                setResults([{
                  fileName: 'Student Response',
                  content: responseStr
                }]);
              }
            } else {
              setResults([]);
            }
            
            if (firstResult.visualizationData) {
              setVisualizationData(firstResult.visualizationData);
            }
            
            if (firstResult.plagiarismResult) {
              setPlagiarismResult(firstResult.plagiarismResult);
            }
            
            setDocumentId(firstResult.id || null);
            setError(`Using fallback result. Original ID (${idToUse}) not found.`);
          }
        }
      } catch (err) {
        console.error('Error fetching result:', err);
        setError('Failed to fetch result data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [urlId]);

  // Update this function to store the changes
  const handleSectionChange = (
    sections: Section[],
    totalGrade: string,
    letterGrade: string,
    overallFeedback: string
  ) => {
    setHasChanges(true);
    
    // Update the parsed results state
    setParsedResults({
      sections,
      totalGrade,
      letterGrade,
      overallFeedback
    });
    
    // Create a copy of the current results
    const updatedResults = [...results];
    
    // Update the content of the active tab
    if (updatedResults[activeTab]) {
      // Get the current content
      let content = updatedResults[activeTab].content;
      
      // Extract the header part if it exists
      const headerMatch = content.match(/^(Response for [^:]+:[\s\n]+)/);
      const header = headerMatch ? headerMatch[1] : '';
      
      // Build the new content
      let newContent = header;
      
      // Add the sections
      sections.forEach(section => {
        newContent += `* **${section.title}:** ${section.grade}\n`;
        if (section.description) {
          newContent += `${section.description}\n\n`;
        }
      });
      
      // Add the overall feedback
      if (overallFeedback) {
        newContent += `**Overall Feedback:**\n${overallFeedback}\n\n`;
      }
      
      // Add the total grade and letter grade
      if (totalGrade) {
        newContent += `**Total Percentage Grade:** ${totalGrade}\n`;
      }
      
      if (letterGrade) {
        newContent += `**Letter Grade:** ${letterGrade}\n`;
      }
      
      updatedResults[activeTab] = {
        ...updatedResults[activeTab],
        content: newContent.trim()
      };
      
      setEditedResults(updatedResults);
      
      // Update visualization data if it exists
      if (visualizationData) {
        const updatedVisualizationData = {
          ...visualizationData,
          percentage_grade: parseFloat(totalGrade.replace('%', '')),
          letter_grade: letterGrade,
          criteria: sections.map(section => {
            const [scored, total] = section.grade.split('/').map(Number);
            return {
              criteria: section.title,
              scored,
              total
            };
          })
        };
        
        setEditedVisualizationData(updatedVisualizationData);
      }
    }
    
    console.log('Changes detected:', { sections, totalGrade, letterGrade, overallFeedback });
  };

  const handleApprove = async () => {
    if (!documentId) {
      setError("Cannot update: No document ID available");
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare the data to update
      const updateData: any = {};
      
      if (editedResults.length > 0) {
        updateData.results = editedResults;
      }
      
      if (editedVisualizationData) {
        updateData.visualizationData = editedVisualizationData;
      }
      
      console.log('Approving changes and updating Firebase...');
      console.log('Update data:', updateData);
      
      // Update the document in Firebase
      await updateResultById(documentId, updateData);
      
      // If we have edited the active tab, also update the student's grade
      if (parsedResults && editedResults[activeTab]) {
        try {
          // Extract student name from the fileName
          const fileName = editedResults[activeTab].fileName;
          const studentName = fileName.replace('.pdf', '');
          
          // Get the grade value
          const gradeValue = parseFloat(parsedResults.totalGrade.replace('%', ''));
          
          if (!isNaN(gradeValue)) {
            // Find the student in the database
            const student = await getStudentByName(studentName) as Student | null;
            
            if (student) {
              // Update the student's finalProject grade
              await updateStudentGrade(student.id, gradeValue);
              console.log(`Updated grade for ${studentName}: ${gradeValue}`);
              
              // Mark this student's grade as approved
              setApprovedGrades(prev => ({
                ...prev,
                [fileName]: true
              }));
            } else {
              console.log(`Student not found: ${studentName}`);
            }
          }
        } catch (err) {
          console.error('Error updating student grade:', err);
          // Don't fail the whole operation if student update fails
        }
      }
      
      console.log('Changes approved and saved to Firebase!');
      setHasChanges(false);
      setIsEditing(false);
      
      // Update the local state to reflect the changes
      if (editedResults.length > 0) {
        setResults(editedResults);
      }
      
      if (editedVisualizationData) {
        setVisualizationData(editedVisualizationData);
      }
    } catch (error) {
      console.error("Error updating results:", error);
      setError('Failed to update results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle approving a grade for a student
  const handleApproveGrade = async (grade: number) => {
    if (!results[activeTab]) {
      setError("No active result to approve");
      return;
    }

    try {
      setApprovingGrade(true);
      
      // Extract student name from the fileName (e.g., "student1.pdf" -> "student1")
      const fileName = results[activeTab].fileName;
      const studentName = fileName.replace('.pdf', '');
      
      console.log(`Approving grade for student: ${studentName}`);
      console.log(`Grade to approve: ${grade}`);
      
      // Find the student in the database
      const student = await getStudentByName(studentName) as Student | null;
      
      if (!student) {
        setError(`Student not found: ${studentName}`);
        return;
      }
      
      // Update the student's finalProject grade
      await updateStudentGrade(student.id, grade);
      
      console.log(`Grade approved for ${studentName}: ${grade}`);
      
      // Mark this student's grade as approved
      setApprovedGrades(prev => ({
        ...prev,
        [fileName]: true
      }));
      
    } catch (err) {
      console.error('Error approving grade:', err);
      setError('Failed to approve grade. Please try again later.');
    } finally {
      setApprovingGrade(false);
    }
  };

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
                      onApproveGrade={!approvedGrades[results[activeTab].fileName] ? handleApproveGrade : undefined}
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
