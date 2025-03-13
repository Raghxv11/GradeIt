import { useState, useEffect } from 'react';
import { 
  getResultById, 
  getAllResults, 
  updateResultById, 
  getStudentByName, 
  updateStudentGrade 
} from '@/lib/firebase';
import { 
  AssignmentResult, 
  FirebaseResult, 
  Student, 
  VisualizationData, 
  PlagiarismResult,
  Section,
  ParsedResult,
  ResultItem
} from '@/types/result';
import { parseResultText, parseJsonResult, generateContentFromRawData, getFilenameFromUrl } from '@/utils/resultParser';

interface UseResultDataProps {
  urlId: string | string[] | undefined;
  hardcodedId?: string;
}

interface UseResultDataReturn {
  results: AssignmentResult[];
  loading: boolean;
  error: string | null;
  activeTab: number;
  setActiveTab: (index: number) => void;
  documentId: string | null;
  plagiarismResult: PlagiarismResult | null;
  visualizationData: VisualizationData | null;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  hasChanges: boolean;
  parsedResults: ParsedResult | null;
  approvedGrades: {[key: string]: boolean};
  approvingGrade: boolean;
  handleSectionChange: (sections: Section[], totalGrade: string, letterGrade: string, overallFeedback: string) => void;
  handleApprove: () => Promise<void>;
  handleApproveGrade: (grade: number) => Promise<void>;
}

export function useResultData({ urlId, hardcodedId = "0xrLLOuRuOdQQAqG2kGB" }: UseResultDataProps): UseResultDataReturn {
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
  const [parsedResults, setParsedResults] = useState<ParsedResult | null>(null);

  // Effect to parse the active result when it changes
  useEffect(() => {
    if (results.length > 0 && activeTab < results.length) {
      // Check if the result has rawData property (new JSON format)
      if (results[activeTab].rawData) {
        const parsed = parseJsonResult(results[activeTab].rawData);
        setParsedResults(parsed);
      } else {
        // Legacy text format
        const parsed = parseResultText(results[activeTab].content);
        setParsedResults(parsed);
      }
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
          
          // Check if we have the new JSON format with raw data
          if (resultData.rawData && resultData.rawData.results && Array.isArray(resultData.rawData.results)) {
            console.log('Processing new JSON format with raw data');
            
            // Process the raw data results into formatted results
            const formattedResults: AssignmentResult[] = resultData.rawData.results.map((item: ResultItem) => {
              // Extract filename from the assignment URL
              const fileName = getFilenameFromUrl(item.assignmentUrl);
              
              // Generate content from the raw data
              const content = generateContentFromRawData(item);
              
              return {
                fileName,
                content,
                rawData: item
              };
            });
            
            setResults(formattedResults);
            
            // Check for approved grades
            const approvedGradesObj: {[key: string]: boolean} = {};
            
            // For each result, check if the student has a grade in the database
            for (const result of formattedResults) {
              try {
                // Get student ID from the raw data
                const studentId = result.rawData?.studentId || '';
                
                if (studentId) {
                  // Find the student in the database
                  const student = await getStudentByName(studentId) as Student | null;
                  
                  if (student && student.finalProject !== undefined) {
                    // If the student has a finalProject grade, mark it as approved
                    approvedGradesObj[result.fileName] = true;
                    console.log(`Found approved grade for ${studentId}: ${student.finalProject}`);
                  }
                }
              } catch (err) {
                console.error('Error checking student grade:', err);
              }
            }
            
            setApprovedGrades(approvedGradesObj);
            
            // Create visualization data from the first result
            if (formattedResults.length > 0 && formattedResults[0].rawData) {
              const firstResult = formattedResults[0].rawData;
              const criteria = Object.entries(firstResult.grades || {}).map(([title, data]) => ({
                criteria: title,
                scored: parseInt(data.score),
                total: parseInt(data.total)
              }));
              
              setVisualizationData({
                criteria,
                percentage_grade: parseInt(firstResult.total_percentage_grade),
                letter_grade: firstResult.letter_grade
              });
            }
          }
          // Check if we have results array (legacy format or already processed)
          else if (resultData.results && Array.isArray(resultData.results)) {
            console.log('Processing results array');
            setResults(resultData.results);
            
            // Check for approved grades
            const approvedGradesObj: {[key: string]: boolean} = {};
            
            // For each result, check if the student has a grade in the database
            for (const result of resultData.results) {
              try {
                const fileName = result.fileName;
                const studentId = result.rawData?.studentId || fileName.replace('.pdf', '');
                
                // Find the student in the database
                const student = await getStudentByName(studentId) as Student | null;
                
                if (student && student.finalProject !== undefined) {
                  // If the student has a finalProject grade, mark it as approved
                  approvedGradesObj[fileName] = true;
                  console.log(`Found approved grade for ${studentId}: ${student.finalProject}`);
                }
              } catch (err) {
                console.error('Error checking student grade:', err);
              }
            }
            
            setApprovedGrades(approvedGradesObj);
          } else if (resultData.response && typeof resultData.response === 'string') {
            // If we have a response string but no results array, parse it
            console.log('Processing legacy text format');
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
  }, [urlId, hardcodedId]);

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
      const currentResult = updatedResults[activeTab];
      
      // Check if we have raw data (new JSON format)
      if (currentResult.rawData) {
        // Update the raw data directly
        const rawData = { ...currentResult.rawData } as ResultItem;
        
        // Update the letter grade and total percentage
        rawData.letter_grade = letterGrade;
        rawData.total_percentage_grade = totalGrade.replace('%', '');
        rawData.overall_feedback = overallFeedback;
        
        // Update each criterion in the grades object
        if (!rawData.grades) {
          rawData.grades = {};
        }
        
        // Map sections to grades
        sections.forEach(section => {
          const [score, total] = section.grade.split('/').map(Number);
          
          rawData.grades[section.title] = {
            score: score.toString(),
            total: total.toString(),
            comment: section.description || ''
          };
        });
        
        // Update the result with the new raw data
        updatedResults[activeTab] = {
          ...currentResult,
          rawData,
          // Also update the content for display purposes
          content: generateContentFromRawData(rawData)
        };
      } else {
        // Legacy text format - update content directly
        let content = currentResult.content;
        
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
          ...currentResult,
          content: newContent.trim()
        };
      }
      
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
      const updateData: Partial<FirebaseResult> = {};
      
      if (editedResults.length > 0) {
        updateData.results = editedResults;
        
        // If we have raw data in the results, also update the raw data
        if (editedResults.some(result => result.rawData)) {
          // Extract the raw data from each result
          const rawResults = editedResults
            .filter(result => result.rawData)
            .map(result => result.rawData as ResultItem);
          
          // If we have raw results, update the rawData property
          if (rawResults.length > 0) {
            // Preserve the existing rawData structure and just update the results
            const existingRawData = (await getResultById(documentId) as FirebaseResult)?.rawData || {
              assignmentUrls: [],
              createdAt: new Date().toISOString(),
              meta: {
                savedFrom: 'app',
                version: '1.0'
              }
            };
            
            updateData.rawData = {
              ...existingRawData,
              results: rawResults
            };
          }
        }
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
          // Extract student ID from the result
          const currentResult = editedResults[activeTab];
          let studentId = '';
          
          // Try to get student ID from raw data first
          if (currentResult.rawData && currentResult.rawData.studentId) {
            studentId = currentResult.rawData.studentId;
          } else {
            // Fallback to extracting from filename
            const fileName = typeof currentResult.fileName === 'string' ? currentResult.fileName : '';
            studentId = fileName ? fileName.replace('.pdf', '') : `student_${Math.random().toString(36).substring(2, 10)}`;
          }
          
          // Get the grade value
          const gradeValue = parseFloat(parsedResults.totalGrade.replace('%', ''));
          
          if (!isNaN(gradeValue) && studentId) {
            // Find the student in the database
            const student = await getStudentByName(studentId) as Student | null;
            
            if (student) {
              // Update the student's finalProject grade
              await updateStudentGrade(student.id, gradeValue);
              console.log(`Updated grade for ${studentId}: ${gradeValue}`);
              
              // Mark this student's grade as approved
              // Ensure we use a valid string key for the approvedGrades object
              const gradeKey = typeof currentResult.fileName === 'string' ? 
                currentResult.fileName : 
                `student_${studentId}`;
                
              setApprovedGrades(prev => ({
                ...prev,
                [gradeKey]: true
              }));
            } else {
              console.log(`Student not found: ${studentId}`);
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
      
      const currentResult = results[activeTab];
      let studentId = '';
      
      // Try to get student ID from raw data first
      if (currentResult.rawData && currentResult.rawData.studentId) {
        studentId = currentResult.rawData.studentId;
      } else {
        // Fallback to extracting from filename
        const fileName = currentResult.fileName;
        studentId = fileName.replace('.pdf', '');
      }
      
      console.log(`Approving grade for student: ${studentId}`);
      console.log(`Grade to approve: ${grade}`);
      
      // Find the student in the database
      const student = await getStudentByName(studentId) as Student | null;
      
      if (!student) {
        setError(`Student not found: ${studentId}`);
        return;
      }
      
      // Update the student's finalProject grade
      await updateStudentGrade(student.id, grade);
      
      console.log(`Grade approved for ${studentId}: ${grade}`);
      
      // Mark this student's grade as approved
      setApprovedGrades(prev => ({
        ...prev,
        [currentResult.fileName]: true
      }));
      
    } catch (err) {
      console.error('Error approving grade:', err);
      setError('Failed to approve grade. Please try again later.');
    } finally {
      setApprovingGrade(false);
    }
  };

  return {
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
  };
}
