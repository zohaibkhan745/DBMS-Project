document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in (add your authentication check here)
    // For demo purposes, we're assuming the user is logged in
    
    // Get DOM elements
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const profileIcon = document.querySelector('.profile-icon');
    const logoutBtn = document.getElementById('logout-btn');
    const logoutLink = document.getElementById('logout-link');
    const studentName = document.getElementById('student-name');
    const welcomeName = document.getElementById('welcome-name');
    
    // Toggle sidebar on mobile
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Toggle profile dropdown
    if (profileIcon) {
        profileIcon.addEventListener('click', function() {
            this.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!profileIcon.contains(event.target)) {
                profileIcon.classList.remove('active');
            }
        });
    }
    
    // Handle logout
    function handleLogout(e) {
        e.preventDefault();
        // Add your logout logic here (clear tokens, etc)
        localStorage.removeItem('token');
        window.location.href = '../login.html';
    }
    
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (logoutLink) logoutLink.addEventListener('click', handleLogout);
    
    // Set student name (fetch from backend or localStorage)
    async function displayStudentName() {
        const studentNameElements = [document.getElementById('student-name')].filter(Boolean);
        const welcomeNameElements = [document.getElementById('welcome-name')].filter(Boolean);
        if (studentNameElements.length === 0 && welcomeNameElements.length === 0) return;
        const token = localStorage.getItem('token');
        let userData = null;
        try {
            userData = JSON.parse(localStorage.getItem('userData'));
        } catch (error) {
            console.error('Error parsing userData from localStorage:', error);
        }
        if (userData && userData.name) {
            studentNameElements.forEach(e => e.textContent = userData.name);
            welcomeNameElements.forEach(e => e.textContent = userData.name);
            return;
        }
        if (token) {
            try {
                const response = await fetch('/api/user/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (userData) {
                        userData.name = data.name;
                        localStorage.setItem('userData', JSON.stringify(userData));
                    } else {
                        localStorage.setItem('userData', JSON.stringify({ name: data.name, id: data.id }));
                    }
                    studentNameElements.forEach(e => e.textContent = data.name);
                    welcomeNameElements.forEach(e => e.textContent = data.name);
                    return;
                }
            } catch (error) {
                console.error('Error fetching student profile:', error);
            }
        }
        studentNameElements.forEach(e => e.textContent = 'Student');
        welcomeNameElements.forEach(e => e.textContent = 'Student');
    }
    displayStudentName();
    
    // Load courses
    loadCourses();
});

async function loadCourses() {
    const courseList = document.getElementById('course-list');
    if (!courseList) return;
    // Get registration_number from userData in localStorage
    let userData = null;
    try {
        userData = JSON.parse(localStorage.getItem('userData'));
    } catch (e) {}
    const registrationNumber = userData?.registrationNumber || userData?.registration_number;
    if (!registrationNumber) {
        courseList.innerHTML = '<div class="error-state"><p>Could not determine student registration number.</p></div>';
        return;
    }
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/student/courses/${registrationNumber}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            courseList.innerHTML = `<div class="error-state"><p>Error loading courses: ${response.status} ${response.statusText}</p></div>`;
            console.error('Failed to fetch student courses:', response.status, response.statusText);
            return;
        }
        const data = await response.json();
        const courses = data.courses || [];
    updateStats(courses);
    let coursesHTML = '';
    if (courses.length === 0) {
        coursesHTML = '<div class="empty-state"><p>You are not enrolled in any courses.</p></div>';
    } else {
        for (const course of courses) {
            let attendancePercentage = 0;
            let sessionsCount = 0;
            try {
                // Fetch sessions and attendance for this course
                const matrixRes = await fetch(`/api/faculty/attendance/matrix?course_id=${course.course_id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const matrixData = await matrixRes.json();
                const sessions = matrixData.sessions || [];
                sessionsCount = sessions.length;
                const attendance = matrixData.attendance || [];
                // Get registration number from userData
                let userData = null;
                try { userData = JSON.parse(localStorage.getItem('userData')); } catch (e) {}
                const registrationNumber = userData?.registrationNumber || userData?.registration_number;
                // Count present for this student
                let present = 0;
                attendance.forEach(a => {
                    if (String(a.registration_number) === String(registrationNumber) && a.status_label === 'Present') present++;
                });
                attendancePercentage = sessionsCount > 0 ? ((present / sessionsCount) * 100).toFixed(1) : '0.0';
            } catch (e) {}
            // Add sessions conducted above attendance percentage and below faculty name
            coursesHTML += `
                <div class="course-card">
                    <div class="course-header">
                            <h3>${course.course_title}</h3>
                            <span class="course-code">${course.course_code}</span>
                    </div>
                    <div class="course-info">
                            <p><i class="fas fa-chalkboard-teacher"></i> ${course.instructor_name || 'N/A'}</p>
                            <p style="margin-top:0.25rem;"><strong>Section:</strong> ${course.section || 'N/A'}</p>
                            <p style="margin-top:0.5rem;"><strong>Sessions Conducted:</strong> ${sessionsCount}</p>
                            <p style="margin-top:0.25rem;"><strong>Attendance:</strong> ${attendancePercentage}%</p>
                        </div>
                    <div class="course-actions">
                            <a href="course-details.html?id=${course.course_id}" class="btn-small">View Details</a>
                    </div>
                </div>
            `;
        }
    }
    courseList.innerHTML = coursesHTML;
    } catch (error) {
        courseList.innerHTML = '<div class="error-state"><p>Error loading courses: ' + error.message + '</p></div>';
        console.error('Error loading courses:', error);
    }
}

function updateStats(courses) {
    const courseCount = document.getElementById('course-count');
    const attendanceRate = document.getElementById('attendance-rate');
    const absentCount = document.getElementById('absent-count');

    if (courseCount) courseCount.textContent = courses.length;

    // Calculate total attendance and absences across all courses
    let totalSessions = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalCoursesWithSessions = 0;

    const token = localStorage.getItem('token');
    let userData = null;
    try { userData = JSON.parse(localStorage.getItem('userData')); } catch (e) {}
    const registrationNumber = userData?.registrationNumber || userData?.registration_number;

    // We'll use Promise.all to fetch all matrix data in parallel
    Promise.all(courses.map(async (course) => {
        try {
            const matrixRes = await fetch(`/api/faculty/attendance/matrix?course_id=${course.course_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const matrixData = await matrixRes.json();
            const sessions = matrixData.sessions || [];
            const attendance = matrixData.attendance || [];
            if (sessions.length > 0) totalCoursesWithSessions++;
            totalSessions += sessions.length;
            // Count present and absent for this student
            attendance.forEach(a => {
                if (String(a.registration_number) === String(registrationNumber)) {
                    if (a.status_label === 'Present') totalPresent++;
                    if (a.status_label === 'Absent') totalAbsent++;
                }
            });
        } catch (e) {}
    })).then(() => {
        // Calculate average attendance rate
        let avgAttendance = totalSessions > 0 ? ((totalPresent / totalSessions) * 100).toFixed(1) : '0.0';
        if (attendanceRate) attendanceRate.textContent = avgAttendance + '%';
        if (absentCount) absentCount.textContent = totalAbsent;
    });
}