import json
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import google.generativeai as genai
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains.question_answering import load_qa_chain
from langchain.prompts import PromptTemplate
from langchain.docstore.document import Document
import tempfile
from PIL import Image
import re
import requests

# Initialize Flask app
app = Flask(__name__)
CORS(app)
# Load environment variables and configure Gemini
load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=API_KEY)

# Initialize variables
visualization_data = []
percentage_grade = None
letter_grade = None

def convert_text_to_documents(text_chunks):
    return [Document(page_content=chunk) for chunk in text_chunks]

def get_pdf_text(pdf_docs):
    text = ""
    tasks = {}

    for pdf in pdf_docs:
        try:
            pdf_reader = PdfReader(pdf, strict=False)  # Added strict=False to be more lenient with malformed PDFs
            for page in pdf_reader.pages:
                text += page.extract_text()
            tasks[pdf] = text
        except Exception as e:
            print(f"Error reading PDF {pdf}: {str(e)}")
            tasks[pdf] = "Error: Could not read PDF file. The file might be corrupted or malformed."
    
    return tasks

def get_text_chunks(text):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=10000, chunk_overlap=1000)
    chunks = text_splitter.split_text(text)
    return chunks

def get_vector_store(text_chunks):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vector_store = FAISS.from_texts(text_chunks, embedding=embeddings)
    vector_store.save_local("faiss_index")

def get_rubric_chain():
    prompt_template = f"""
    Extract the given total points, criteria, and points/pts from the given rubric:\n {{context}}?\n

    Answer:
    """
    model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.3)
    prompt = PromptTemplate(
        template=prompt_template, input_variables=["context"]
    )
    chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)
    return chain

def get_gemini_response(image, prompt):
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content([prompt, image[0]])
    return response.text

def get_conversational_chain(rubric=None):
    if rubric:
        rubric_text = f" according to the provided rubric:\n{{rubric}}. Strictly based on the grading criteria, total points, and the points for each criteria given in the provided rubric do the grading\n"
    else:
        rubric_text = " based on the general grading criteria.\n"
    
    prompt_template = f"""
    You are a trained expert on writing and literary analysis. Your job is to accurately and effectively grade a student's essay{rubric_text}
    Respond back with graded points and a level for each criteria. Don't rewrite the rubric. For each criteria, provide a brief comment (1-2 lines) explaining the score.
    In the end, write short feedback about what steps they might take to improve on their assignment. Write a total percentage grade and letter grade. In your overall response, try to be lenient and keep in mind that the student is still learning. While grading the essay remember the writing level the student is at while considering their course level, grade level, and the overall expectations of writing should be producing.
    Your grade should only be below 70 percent if the essay does not succeed at all in any of the criteria. Your grade should only be below 80 percent if the essay is not sufficient in most of the criteria. Your grade should only be below 90% if there are a few criteria where the essay doesn't excell. Your grade should only be above 90 percent if the essay succeeds in most of the criteria.
    Understand that the essay was written by a human and think about their writing expectations for their grade level/course level, be lenient and give the student the benefit of the doubt.

    Format each criteria exactly like this:
    • Criteria_name: score/total
      Brief comment explaining the score (1-2 lines maximum)

        Context:\n {{context}}?\n
        Question: \n{{question}}\n

    Answer: Get the answer in beautiful format, for the criteria present in rubric list them as specified above.
    """
    model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.3)
    prompt = PromptTemplate(
        template=prompt_template, input_variables=["rubric", "context", "question"]
    )
    chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)
    return chain

def extract_criteria_and_values(output_text):
    lines = output_text.split('\n')
    visualization_data.clear()  # Clear previous data

    for line in lines:
        line = line.strip()
        # Skip empty lines and lines with total/letter grade/feedback headers
        if not line or "Total Percentage Grade" in line or "Letter Grade" in line or "Feedback" in line or "Overall Feedback" in line:
            continue
            
        # Check different criteria formats:
        # Format 1: "• Criteria: score/total"
        # Format 2: "* **Criteria:** score/total"
        # Format 3: "**Criteria:** score/total"
        criteria_match = None
        
        if line.startswith('•') and '/' in line:
            # Format 1: "• Criteria: score/total"
            parts = line.split(':')
            if len(parts) >= 2:
                criteria = parts[0].replace('•', '').strip()
                score_part = parts[1].strip()
                if '/' in score_part:
                    score_parts = score_part.split('/')
                    if len(score_parts) >= 2:
                        # Get the first chunk with digits for scored value
                        scored = ''.join(c for c in score_parts[0] if c.isdigit())
                        # Get the first chunk with digits for total value
                        total = ''.join(c for c in score_parts[1].split()[0] if c.isdigit())
                        criteria_match = (criteria, scored, total)
        
        elif line.startswith('*') and '**' in line and ':' in line and '/' in line:
            # Format 2: "* **Criteria:** score/total"
            try:
                pattern = r'\*\s+\*\*([^:]+):\*\*\s+(\d+)\/(\d+)'
                match = re.search(pattern, line)
                if match:
                    criteria = match.group(1).strip()
                    scored = match.group(2)
                    total = match.group(3)
                    criteria_match = (criteria, scored, total)
            except:
                pass
        
        elif line.startswith('**') and ':' in line and '/' in line:
            # Format 3: "**Criteria:** score/total"
            try:
                pattern = r'\*\*([^:]+):\*\*\s+(\d+)\/(\d+)'
                match = re.search(pattern, line)
                if match:
                    criteria = match.group(1).strip()
                    scored = match.group(2)
                    total = match.group(3)
                    criteria_match = (criteria, scored, total)
            except:
                pass
        
        # Add the criteria to visualization data if a match was found
        if criteria_match:
            criteria, scored, total = criteria_match
            try:
                # Ensure scored and total are valid integers
                scored_int = int(scored)
                total_int = int(total)
                
                visualization_data.append({
                    "criteria": criteria,
                    "scored": scored_int,
                    "total": total_int
                })
            except (ValueError, TypeError):
                # Skip if conversion to integers fails
                pass

def create_visualizations(output_text):
    global percentage_grade, letter_grade
    lines = output_text.split('\n')

    # Default values in case we don't find matches
    percentage_grade = None
    letter_grade = None

    for line in lines:
        # Match different formats of Total Percentage Grade
        if "Total Percentage Grade" in line:
            try:
                # Extract digits and decimal point from the line
                percentage_str = ''.join(c for c in line.split(':')[1] if c.isdigit() or c == '.')
                if percentage_str:
                    percentage_grade = float(percentage_str)
            except:
                pass
        
        # Match different formats of Letter Grade
        elif "Letter Grade" in line:
            try:
                # Look for A+, A, A-, B+, B, B-, etc. in the line
                letter_pattern = r'[A-F][+-]?'
                match = re.search(letter_pattern, line.split(':')[1])
                if match:
                    letter_grade = match.group(0)
            except:
                pass
                
    # Make sure we have valid defaults if extraction failed
    if percentage_grade is None:
        percentage_grade = 0
    if letter_grade is None:
        letter_grade = ""

def input_image_setup(image_paths):
    """
    Prepare images for Gemini model input
    """
    image_parts = []
    for path in image_paths:
        image = Image.open(path)
        # Convert to RGB if image is in RGBA format
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        image_parts.append(image)
    return image_parts

@app.route('/hello', methods=['GET'])
def hello():
    return jsonify({'message': 'gradify backend baby'})

@app.route('/api/grade/automate', methods=['POST', 'OPTIONS'])
def grade_files():
    try:
        # Fetch the file URLs from the request body
        file_urls = request.form.get('files').split(',')
        rubric_file_url = request.form.get('rubric')
        question = request.form.get('question')
        
        if not file_urls:
            return jsonify({'error': 'No files uploaded'}), 400
        
        if not question:
            return jsonify({'error': 'No question provided'}), 400
        
        # Temporary storage for downloaded files
        temp_files = []
        pdf_files = []
        image_files = []
        pdf_names = []
        image_names = []
        
        # Download files from the provided URLs
        i = 0
        for file_url in file_urls:
            file_response = requests.get(file_url, stream=True)
            if file_response.status_code == 200:
                file_name = "student" + (str)(i) + ".pdf"
                if file_name.endswith('.pdf'):
                    with tempfile.NamedTemporaryFile(delete=False) as temp_pdf:
                        for chunk in file_response.iter_content(chunk_size=1024):
                            if chunk:
                                temp_pdf.write(chunk)
                        temp_files.append(temp_pdf.name)
                        pdf_files.append(temp_pdf.name)
                        pdf_names.append(file_name)
                elif file_name.endswith(('.png', '.jpg', '.jpeg')):
                    with tempfile.NamedTemporaryFile(delete=False) as temp_image:
                        for chunk in file_response.iter_content(chunk_size=1024):
                            if chunk:
                                temp_image.write(chunk)
                        temp_files.append(temp_image.name)
                        image_files.append(temp_image.name)
                        image_names.append(file_name)
                else:
                    return jsonify({'error': 'Unsupported file type uploaded'}), 400
                i += 1
            else:
                return jsonify({'error': f'Failed to download file from {file_url}'}), 400
        
        # Process rubric file
        rubric_file_response = requests.get(rubric_file_url, stream=True)
        if rubric_file_response.status_code == 200:
            with tempfile.NamedTemporaryFile(delete=False) as temp_rubric:
                for chunk in rubric_file_response.iter_content(chunk_size=1024):
                    if chunk:
                        temp_rubric.write(chunk)
                rubric_text = get_pdf_text([temp_rubric.name])  # Get rubric text from PDF
                temp_rubric.close()
        else:
            return jsonify({'error': f'Failed to download rubric file from {rubric_file_url}'}), 400
        
        # Prepare images for Gemini model if any images are uploaded
        all_images = input_image_setup(image_files) if image_files else []

        # Initialize response holder
        raw_text = get_pdf_text(pdf_files)
        responses = ""
        
        # Process PDF files
        for key, value in raw_text.items():
            text_chunks = get_text_chunks(value)
            get_vector_store(text_chunks)
            rubric_text = get_pdf_text([temp_rubric.name]) if temp_rubric.name else None

            if rubric_text:
                for rubric_key in rubric_text:
                    rubric_str = rubric_text[rubric_key]

                rubric_chain = get_rubric_chain()

                response = rubric_chain({"input_documents": convert_text_to_documents([rubric_str])}, return_only_outputs=True)
                rubric_text = response["output_text"]
            
            chain = get_conversational_chain(rubric=rubric_text)
            
            documents = convert_text_to_documents(text_chunks)
            
            response = chain({"input_documents": documents, "rubric": rubric_text, "question": question}, return_only_outputs=True)
            responses += f"\nResponse for {pdf_names[pdf_files.index(key)]}: \n\n" + response['output_text']
            
            print(response["output_text"])
            create_visualizations(response["output_text"])
            extract_criteria_and_values(response["output_text"])
            
        
        # Process image files if any images are uploaded
        if all_images:
            input_prompt = """
            You are an expert grader. Your task is to grade the student's solution shown in the image.
            
            Follow these steps:
            1. First, carefully read and understand what the student has written/solved
            2. Examine the solution in detail, looking at both the process and final answer
            3. Grade based on mathematical accuracy, problem-solving approach, and clarity of work
            4. Provide specific feedback on what was done well and what could be improved
            
            Use exactly this format:
            
            Student's Solution Analysis:
            [Brief analysis of the student's work and approach]
            
            Grading:
            • Mathematical Accuracy: score/20
              [Brief explanation of score]
            • Problem-Solving Approach: score/20
              [Brief explanation of score]
            • Work Clarity: score/10
              [Brief explanation of score]
            
            Total Percentage Grade: [X]%
            Letter Grade: [X]
            
            Feedback:
            [2-3 sentences of constructive feedback]
            """
            
            # Get response from Gemini for the images
            response = get_gemini_response(all_images, input_prompt)
            
            # Process image grading response
            responses += "\nResponse for images: \n\n" + response
            create_visualizations(response)
            extract_criteria_and_values(response)

        # Clean up temporary files
        for temp_file in temp_files:
            os.unlink(temp_file)
        print(responses)
        return jsonify({
            'status': 'success',
            'response': responses
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/grade/image', methods=['POST', 'OPTIONS'])
def grade_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No Image file uploaded'}), 400
        
        answer_files = request.files.getlist('image')
        temp_images = []
        image_names = []
        
        # Save answer images temporarily
        for image in answer_files:
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_image:
                image.save(temp_image.name)
                temp_images.append(temp_image.name)
                image_names.append(image.filename)
                temp_image.close()
            
        input_prompt = """
        You are an expert grader. Your task is to grade the student's solution shown in the image.
        
        Follow these steps:
        1. First, carefully read and understand what the student has written/solved
        2. Examine the solution in detail, looking at both the process and final answer
        3. Grade based on mathematical accuracy, problem-solving approach, and clarity of work
        4. Provide specific feedback on what was done well and what could be improved
        
        Use exactly this format:
        
        Student's Solution Analysis:
        [Brief analysis of the student's work and approach]
        
        Grading:
        • Mathematical Accuracy: score/20
          [Brief explanation of score]
        • Problem-Solving Approach: score/20
          [Brief explanation of score]
        • Work Clarity: score/10
          [Brief explanation of score]
        
        Total Percentage Grade: [X]%
        Letter Grade: [X]
        
        Feedback:
        [2-3 sentences of constructive feedback]
        """
        
        # Prepare images for Gemini
        all_images = input_image_setup(temp_images)
        
        # Get response from Gemini
        response = get_gemini_response(all_images, input_prompt)
        
        # Process response for visualization
        create_visualizations(response)
        extract_criteria_and_values(response)
            
        # Clean up temporary files
        for temp in temp_images:
            os.unlink(temp)
        
        return jsonify({
            'status': 'success',
            'response': response
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/grade/pdf', methods=['POST', 'OPTIONS'])
def grade_pdf():
    try:
        if 'pdf' not in request.files:
            return jsonify({'error': 'No PDF file uploaded'}), 400
        
        pdf_file = request.files.getlist('pdf')
        rubric_file = request.files.get('rubric')
        question = request.form.get('question')
        
        if not question:
            return jsonify({'error': 'No question provided'}), 400

        temp_pdfs = []
        pdf_names = []

        for pdf in pdf_file:
            with tempfile.NamedTemporaryFile(delete=False) as temp_pdf:
                pdf.save(temp_pdf.name)
                temp_pdfs.append(temp_pdf.name)
                pdf_names.append(pdf.filename)
                temp_pdf.close()
        
        with tempfile.NamedTemporaryFile(delete=False) as temp_rubric:
            rubric_file.save(temp_rubric.name)
            temp_rubric.close()
            
        raw_text = get_pdf_text(temp_pdfs)
        responses = ""

        for key, value in raw_text.items():
            text_chunks = get_text_chunks(value)
            get_vector_store(text_chunks)
            rubric_text = get_pdf_text([temp_rubric.name]) if temp_rubric.name else None

            if rubric_text:
                for rubric_key in rubric_text:
                    rubric_str = rubric_text[rubric_key]

                rubric_chain = get_rubric_chain()

                response = rubric_chain({"input_documents": convert_text_to_documents([rubric_str])}, return_only_outputs=True)
                rubric_text = response["output_text"]
            
            chain = get_conversational_chain(rubric=rubric_text)
            
            documents = convert_text_to_documents(text_chunks)
            
            response = chain({"input_documents": documents, "rubric": rubric_text, "question": question}, return_only_outputs=True)
            responses += f"\nResponse for {pdf_names[temp_pdfs.index(key)]}: \n\n" + response['output_text']
            
            create_visualizations(response["output_text"])
            extract_criteria_and_values(response["output_text"])
        
        for temp in temp_pdfs:
            os.unlink(temp)
        os.unlink(temp_rubric.name)
        
        return jsonify({
            'status': 'success',
            'response': responses
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/grade/', methods=['POST', 'OPTIONS'])
def grade_mixed_files():
    try:
        if 'pdf' not in request.files and 'image' not in request.files:
            return jsonify({'error': 'No files uploaded'}), 400
        
        files = request.files.getlist('pdf') + request.files.getlist('image')
        rubric_file = request.files.get('rubric')
        question = request.form.get('question')
        
        if not question:
            return jsonify({'error': 'No question provided'}), 400
        
        temp_files = []
        pdf_files = []
        image_files = []
        pdf_names = []
        image_names = []
        
        # Separate the files into PDFs and images
        for file in files:
            if file.filename.endswith('.pdf'):
                with tempfile.NamedTemporaryFile(delete=False) as temp_pdf:
                    file.save(temp_pdf.name)
                    temp_files.append(temp_pdf.name)
                    pdf_files.append(temp_pdf.name)
                    pdf_names.append(file.filename)
            elif file.filename.endswith(('.png', '.jpg', '.jpeg')):
                with tempfile.NamedTemporaryFile(delete=False) as temp_image:
                    file.save(temp_image.name)
                    temp_files.append(temp_image.name)
                    image_files.append(temp_image.name)
                    image_names.append(file.filename)
            else:
                return jsonify({'error': 'Unsupported file type uploaded'}), 400
        
        # Process rubric file
        with tempfile.NamedTemporaryFile(delete=False) as temp_rubric:
            rubric_file.save(temp_rubric.name)
            rubric_text = get_pdf_text([temp_rubric.name])  # Get rubric text from PDF
            temp_rubric.close()
        
        # Prepare images for Gemini model if any images are uploaded
        all_images = input_image_setup(image_files) if image_files else []

        # Initialize response holder
        raw_text = get_pdf_text(pdf_files)
        responses = ""

        # Process PDF files
        for key, value in raw_text.items():
            text_chunks = get_text_chunks(value)
            get_vector_store(text_chunks)
            rubric_text = get_pdf_text([temp_rubric.name]) if temp_rubric.name else None

            if rubric_text:
                for rubric_key in rubric_text:
                    rubric_str = rubric_text[rubric_key]

                rubric_chain = get_rubric_chain()

                response = rubric_chain({"input_documents": convert_text_to_documents([rubric_str])}, return_only_outputs=True)
                rubric_text = response["output_text"]
            
            chain = get_conversational_chain(rubric=rubric_text)
            
            documents = convert_text_to_documents(text_chunks)
            
            response = chain({"input_documents": documents, "rubric": rubric_text, "question": question}, return_only_outputs=True)
            responses += f"\nResponse for {pdf_names[pdf_files.index(key)]}: \n\n" + response['output_text']
            
            create_visualizations(response["output_text"])
            extract_criteria_and_values(response["output_text"])
        
        # Process image files if any images are uploaded
        if all_images:
            input_prompt = """
            You are an expert grader. Your task is to grade the student's solution shown in the image.
            
            Follow these steps:
            1. First, carefully read and understand what the student has written/solved
            2. Examine the solution in detail, looking at both the process and final answer
            3. Grade based on mathematical accuracy, problem-solving approach, and clarity of work
            4. Provide specific feedback on what was done well and what could be improved
            
            Use exactly this format:
            
            Student's Solution Analysis:
            [Brief analysis of the student's work and approach]
            
            Grading:
            • Mathematical Accuracy: score/20
              [Brief explanation of score]
            • Problem-Solving Approach: score/20
              [Brief explanation of score]
            • Work Clarity: score/10
              [Brief explanation of score]
            
            Total Percentage Grade: [X]%
            Letter Grade: [X]
            
            Feedback:
            [2-3 sentences of constructive feedback]
            """
            
            # Get response from Gemini for the images
            response = get_gemini_response(all_images, input_prompt)
            
            # Process image grading response
            responses += "\nResponse for images: \n\n" + response
            create_visualizations(response)
            extract_criteria_and_values(response)

        # Clean up temporary files
        for temp_file in temp_files:
            os.unlink(temp_file)
        
        return jsonify({
            'status': 'success',
            'response': responses
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/visualization', methods=['POST', 'OPTIONS'])
def visualization_pdf():
    try:       
        # Use jsonify instead of json.dumps to ensure proper content type
        return jsonify({
            "criteria": visualization_data, 
            "percentage_grade": percentage_grade, 
            "letter_grade": letter_grade
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8080)