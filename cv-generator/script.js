const templateSelect = document.getElementById('templateSelect');
const creativeColor = document.getElementById('creativeColor');
const photoInput = document.getElementById('photo');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const addressInput = document.getElementById('address');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const summaryInput = document.getElementById('summary');
const experienceInput = document.getElementById('experienceInput');
const experienceListPreview = document.getElementById('experienceListPreview');
const educationInput = document.getElementById('educationInput');
const educationListPreview = document.getElementById('educationListPreview');
const skillsInput = document.getElementById('skills');
const cvPreview = document.getElementById('cv-preview');
const updatePreviewBtn = document.getElementById('updatePreviewBtn');
const downloadBtn = document.getElementById('downloadBtn');

let experiences = [];
let educations = [];

document.addEventListener('DOMContentLoaded', () => {
    loadTemplates();
    updatePreviewBtn.addEventListener('click', updatePreview);
    document.getElementById('addExperienceBtn').addEventListener('click', addExperience);
    document.getElementById('clearExperienceBtn').addEventListener('click', clearExperiences);
    document.getElementById('addEducationBtn').addEventListener('click', addEducation);
    document.getElementById('clearEducationBtn').addEventListener('click', clearEducations);
    downloadBtn.addEventListener('click', downloadPDF);
});

function loadTemplates() {
    // Fetch template data and populate the template select dropdown
    fetch('templates/figma_basic/template.json')
        .then(response => response.json())
        .then(data => {
            data.templates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.name;
                option.textContent = template.displayName;
                templateSelect.appendChild(option);
            });
        });
}

function updatePreview() {
    const cvData = {
        firstName: firstNameInput.value,
        lastName: lastNameInput.value,
        address: addressInput.value,
        email: emailInput.value,
        phone: phoneInput.value,
        summary: summaryInput.value,
        experiences: experiences,
        educations: educations,
        skills: skillsInput.value.split(',').map(skill => skill.trim()),
        photo: photoInput.files[0]
    };

    renderCV(cvData);
}

function renderCV(data) {
    cvPreview.innerHTML = `
        <h2>${data.firstName} ${data.lastName}</h2>
        <p>${data.address}</p>
        <p>${data.email} | ${data.phone}</p>
        <h3>Profile / Summary</h3>
        <p>${data.summary}</p>
        <h3>Work Experience</h3>
        <ul>${data.experiences.map(exp => `<li>${exp}</li>`).join('')}</ul>
        <h3>Education</h3>
        <ul>${data.educations.map(edu => `<li>${edu}</li>`).join('')}</ul>
        <h3>Skills</h3>
        <p>${data.skills.join(', ')}</p>
    `;
    if (data.photo) {
        const reader = new FileReader();
        reader.onload = function(e) {
            cvPreview.insertAdjacentHTML('afterbegin', `<img src="${e.target.result}" alt="Profile Photo" style="width:100px;height:auto;">`);
        };
        reader.readAsDataURL(data.photo);
    }
}

function addExperience() {
    const experience = experienceInput.value;
    if (experience) {
        experiences.push(experience);
        experienceListPreview.innerHTML += `<div>${experience}</div>`;
        experienceInput.value = '';
    }
}

function clearExperiences() {
    experiences = [];
    experienceListPreview.innerHTML = '';
}

function addEducation() {
    const education = educationInput.value;
    if (education) {
        educations.push(education);
        educationListPreview.innerHTML += `<div>${education}</div>`;
        educationInput.value = '';
    }
}

function clearEducations() {
    educations = [];
    educationListPreview.innerHTML = '';
}

function downloadPDF() {
    // Logic to download the CV as a PDF
    alert('Download PDF functionality is not implemented yet.');
}