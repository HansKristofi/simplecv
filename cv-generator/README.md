# CV Generator

## Overview
The CV Generator is a web application that allows users to create and download a personalized CV using predefined templates. Users can fill in their personal information, work experience, education, and skills, and preview the CV before downloading it as a PDF.

## Project Structure
```
cv-generator
├── index.html          # Main structure of the CV generator application
├── script.js           # JavaScript code for handling user interactions
├── styles.css          # CSS styles for the application
├── templates           # Folder containing CV templates
│   ├── figma_basic     # Basic CV template
│   │   ├── template.html   # HTML structure for the basic CV template
│   │   ├── template.css    # CSS styles for the basic CV template
│   │   └── template.json   # Configuration data for the basic CV template
│   ├── figma_professional  # Professional CV template
│   │   ├── template.html   # HTML structure for the professional CV template
│   │   ├── template.css    # CSS styles for the professional CV template
│   │   └── template.json   # Configuration data for the professional CV template
│   └── figma_creative      # Creative CV template
│       ├── template.html   # HTML structure for the creative CV template
│       ├── template.css    # CSS styles for the creative CV template
│       └── template.json   # Configuration data for the creative CV template
├── sample-data.json     # Sample data for testing purposes
├── package.json          # npm configuration file
└── README.md             # Documentation for the project
```

## Setup Instructions
1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Open `index.html` in a web browser or use a local server (e.g., Live Server) to run the application.
4. Ensure that the template folders (`figma_basic`, `figma_professional`, `figma_creative`) are located next to `index.html`.

## Usage
- Select a CV template from the dropdown menu.
- Fill in your personal information, work experience, education, and skills.
- Click the "Update preview" button to see a live preview of your CV.
- Once satisfied, click the "Download PDF" button to save your CV.

## Contributing
Contributions are welcome! Please feel free to submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is open-source and available under the MIT License.