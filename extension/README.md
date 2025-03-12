# GradeIt Chrome Extension

A Chrome extension that processes student assignment PDFs, sends them to a grading server, and displays a loading animation during processing.

## Features

- Input a URL containing an array of PDF file links
- Process multiple files with a visual status indicator for each file
- Smooth loading animation during processing
- Display a link to view graded assignments when processing is complete

## Installation

1. Clone this repository or download the code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The GradeIt extension should now be installed and visible in your Chrome toolbar

## Usage

1. Click on the GradeIt extension icon in your Chrome toolbar
2. Enter the URL that contains an array of PDF file links
3. Click "Process Files" to begin grading
4. Watch the progress as each file is processed
5. Once complete, click the "View Graded Assignment" link to see the results

## Configuration

To configure the extension to work with your grading server, modify the `SERVER_ENDPOINT` variable in `popup.js` to point to your server's API endpoint.

```javascript
const SERVER_ENDPOINT = 'https://cf5a-129-219-21-203.ngrok-free.app/api/grade/';
```

## Development

### Project Structure

- `manifest.json` - Extension configuration
- `popup.html` - Main extension UI
- `popup.js` - Extension functionality
- `styles.css` - Styling for the extension UI
- `images/` - Icon files for the extension

### Expected Server Response

The server should return a JSON response with a `resultUrl` property:

```json
{
  "resultUrl": "https://your-grading-server.com/results/assignment123"
}
```

## License

MIT
