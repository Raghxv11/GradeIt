import { ParsedResult, Section, ResultItem, GradeData } from "@/types/result";

// Helper function to parse result text (no hooks inside)
export const parseResultText = (text: string): ParsedResult => {
  const sections: { [key: string]: string } = {};
  let currentSection = "";
  let totalGrade = "";
  let letterGrade = "";
  let overallFeedback = "";
  
  // Clean up the text: remove the header if it exists and extra blank lines
  let cleanText = text;
  if (cleanText?.startsWith("Response for")) {
    // Remove the "Response for file.pdf:" line and any immediate blank lines
    cleanText = cleanText.replace(/^Response for [^:]+:[\s\n]+/, '');
  }

  // Parse the text into sections using multiple regex patterns to catch all formats
  cleanText?.split("\n").forEach((line) => {
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

// Helper function to parse JSON result data (no hooks inside)
export const parseJsonResult = (result: ResultItem): ParsedResult => {
  // Extract the sections from the grades object
  const sections = Object.entries(result.grades || {}).map(([title, data]: [string, GradeData]) => {
    return {
      title,
      grade: `${data.score}/${data.total}`,
      description: data.comment || ''
    };
  });

  return {
    sections,
    totalGrade: `${result.total_percentage_grade}%`,
    letterGrade: result.letter_grade || '',
    overallFeedback: result.overall_feedback || ''
  };
};

// Helper function to generate content string from raw data
export const generateContentFromRawData = (rawData: ResultItem): string => {
  let content = `Student ID: ${rawData.studentId}\n`;
  content += `Letter Grade: ${rawData.letter_grade}\n`;
  content += `Total Percentage Grade: ${rawData.total_percentage_grade}%\n\n`;
  
  // Add each criterion
  if (rawData.grades) {
    Object.entries(rawData.grades).forEach(([criterion, data]: [string, GradeData]) => {
      content += `**${criterion}:** ${data.score}/${data.total}\n`;
      content += `${data.comment}\n\n`;
    });
  }
  
  // Add overall feedback
  if (rawData.overall_feedback) {
    content += `**Overall Feedback:**\n${rawData.overall_feedback}`;
  }
  
  return content;
};

// Helper function to extract filename from assignment URL
export const getFilenameFromUrl = (url: string): string => {
  // Extract the filename from the URL
  const urlParts = url.split('/');
  const encodedFilename = urlParts[urlParts.length - 1];
  // Decode URI components to handle spaces and special characters
  const decodedFilename = decodeURIComponent(encodedFilename);
  
  // Replace '+' with '_' in student filenames and adjust numbering to start from 0
  // e.g., "student+1.pdf" -> "student_0.pdf", "student+2.pdf" -> "student_1.pdf", etc.
  return decodedFilename.replace(/student\+(\d+)\.pdf/g, (match, num) => {
    const adjustedNum = parseInt(num) - 1;
    return `student_${adjustedNum}.pdf`;
  });
};
