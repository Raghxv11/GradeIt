<h1 align="center">GradeIt</h1>

![WhatsApp Image 2025-03-12 at 12 23 17_8c392cc4](https://github.com/user-attachments/assets/e8666692-6f5c-4095-9654-96a844e69ddd)

## About Us
GradeIt is an AI integrated Grading tool that allows professors and educators to grade assignments using AI. With our bulk upload functionality, plagiarism detection, and advanced PDF and image detection software, our application streamlines the grading process so educators can focus on building personal connections with students and user in a new educational era.

## Tech Stack
- **Frontend**: Next.js + Typescript
- **Backend**: Python, Flask
- **Other Technologies**: Gemini, LangChain, FAISS, AWS, Firebase

## Getting Started

Follow these instructions to set up the project on your local machine.

### Prerequisites
Ensure you have the following installed:
- Node.js
- Python 3.x
- npm (Node Package Manager)
- Conda (for creating a virtual environment)

### Installation and Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Raghxv11/GradeIt.git
   cd GradeIt
   ```

2. **Set up the Conda environment:**
   ```bash
   conda create -n venv python=3.10 -y
   conda activate venv
   ```

3. **Install the backend requirements:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up the backend server:**
   - Create a `.env` file in the root directory and add your Gemini credentials:
     ```
     GOOGLE_API_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
     ```

5. **Install frontend dependencies:**
   ```bash
   cd client
   npm install
   ```

## Running the Project

1. **Start the Backend Server:**
   In the `server` directory:
   ```bash
   python server.py
   ```

2. **Start the Frontend Development Server:**
   In another terminal, navigate to the `client` directory and run:
   ```bash
   npm run dev
   ```

3. **Access the Project:**
   Open your web browser and navigate to `http://localhost:3000`.

## Project Structure

- `/server`: Contains the backend server and AI calls
- `/client`: Contains the frontend NextJs application
- `/extension`: Contians the Chrome extension
