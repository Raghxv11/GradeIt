import React, { ChangeEvent } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Section } from '@/types/result';

interface ResultDisplayProps {
  sections: Section[];
  totalGrade: string;
  letterGrade: string;
  overallFeedback: string;
  isEditing: boolean;
  fileName: string;
  isApproving?: boolean;
  isApproved?: boolean;
  rawData?: any;
  onSectionChange?: (sections: Section[], totalGrade: string, letterGrade: string, overallFeedback: string) => void;
  onApproveGrade: (grade: number) => Promise<void>;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
  sections, 
  totalGrade, 
  letterGrade, 
  overallFeedback,
  isEditing,
  onSectionChange,
  onApproveGrade,
  fileName,
  isApproving,
  isApproved,
  rawData
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
            { onApproveGrade  && (
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

export default ResultDisplay;
