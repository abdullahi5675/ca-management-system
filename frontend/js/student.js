/* ============================================================
   STUDENT DASHBOARD & COMPLAINTS PAGE LOGIC
   student.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const token = Utils.getToken();
  const user = Utils.getUser();

  // Route protection
  if (!token || !user || user.role !== 'student') {
    window.location.href = 'login.html';
    return;
  }

  // Initialize Sidebar
  Utils.initSidebar();

  // Populate Header User Info
  const headerName = document.getElementById('header-user-name');
  const headerMeta = document.getElementById('header-user-meta');
  if (headerName) headerName.textContent = user.name;
  if (headerMeta) headerMeta.textContent = `${user.reg_number} | ${user.department} | ${user.level}`;

  // Logout trigger
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Utils.logout('student');
    });
  }

  // Determine current page and initialize features
  const pagePath = window.location.pathname;

  if (pagePath.includes('dashboard.html')) {
    initDashboard();
  } else if (pagePath.includes('complaint-form.html')) {
    initComplaintForm();
  } else if (pagePath.includes('complaints-tracker.html')) {
    initComplaintsTracker();
  }

  // ── STUDENT DASHBOARD ─────────────────────────────────────
  async function initDashboard() {
    const sessionSelect = document.getElementById('session-select');
    const semesterSelect = document.getElementById('semester-select');
    const scoresTableBody = document.getElementById('scores-table-body');
    const complaintsList = document.getElementById('complaints-list');

    // Load dynamic session list
    await loadSessionFilterList();

    // Reload scores on filter changes
    if (sessionSelect) sessionSelect.addEventListener('change', loadScores);
    if (semesterSelect) semesterSelect.addEventListener('change', loadScores);

    // Initial loads
    await loadScores();
    await loadRecentComplaints();

    async function loadSessionFilterList() {
      if (!sessionSelect) return;
      try {
        const sessions = await API.get('/courses/sessions');
        sessionSelect.innerHTML = '';
        if (sessions.length === 0) {
          sessionSelect.innerHTML = '<option value="2025/2026">2025/2026 Session</option>';
          return;
        }
        sessions.forEach((s, idx) => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = `${s} Session`;
          if (idx === 0) opt.selected = true; // Select latest session
          sessionSelect.appendChild(opt);
        });
      } catch (err) {
        console.error('Failed to load sessions for student:', err);
      }
    }

    // Print / Download PDF Handler
    const downloadSheetBtn = document.getElementById('download-sheet-btn');
    if (downloadSheetBtn) {
      downloadSheetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.print();
      });
    }

    // Populate Student Sheet Meta Header
    const sheetStudentName = document.getElementById('sheet-student-name');
    const sheetStudentMeta = document.getElementById('sheet-student-meta');
    const sheetSessionLabel = document.getElementById('sheet-session-label');
    const sheetDate = document.getElementById('sheet-date');

    if (sheetStudentName) sheetStudentName.textContent = user.name;
    if (sheetStudentMeta) sheetStudentMeta.textContent = `Reg No: ${user.reg_number}  |  Dept: ${user.department}  |  Level: ${user.level}`;
    if (sheetDate) sheetDate.textContent = new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

    async function loadScores() {
      if (!scoresTableBody) return;
      scoresTableBody.innerHTML = `<tr><td colspan="10" class="text-center p-6"><i class="bi bi-arrow-clockwise spin" style="font-size: 1.5rem;"></i><br>Loading assessment scores...</td></tr>`;

      const session = sessionSelect ? sessionSelect.value : '';
      const semester = semesterSelect ? semesterSelect.value : '';

      if (sheetSessionLabel) {
        sheetSessionLabel.textContent = `${session || 'All'} Session — Semester ${semester || 'All'}`;
      }

      try {
        let url = '/scores/my';
        const params = [];
        if (session) params.push(`session=${encodeURIComponent(session)}`);
        if (semester) params.push(`semester=${encodeURIComponent(semester)}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const scores = await API.get(url);
        scoresTableBody.innerHTML = '';

        if (scores.length === 0) {
          scoresTableBody.innerHTML = `
            <tr>
              <td colspan="10" class="text-center p-6 text-muted">
                <i class="bi bi-clipboard-x" style="font-size: 2rem;"></i>
                <p class="mt-2 font-medium">No published continuous assessment scores found for this session.</p>
                <span style="font-size: 0.8rem;">Scores will appear here once published by your course lecturers.</span>
              </td>
            </tr>
          `;
          updateScoreStats([]);
          return;
        }

        scores.forEach(row => {
          const tot = parseFloat(row.total) || 0;
          let remarkBadge = `<span class="badge badge-published">Good</span>`;
          if (tot >= 30) remarkBadge = `<span class="badge badge-published" style="background:#dcfce7;color:#14532d;">Excellent</span>`;
          else if (tot < 20) remarkBadge = `<span class="badge badge-error">Pass Warning</span>`;

          const tr = document.createElement('tr');
          tr.className = 'slide-up';
          tr.innerHTML = `
            <td class="font-bold text-primary">${row.course_code}</td>
            <td class="font-medium">${row.course_name}</td>
            <td class="text-secondary" style="font-size:0.8rem;">${row.lecturer_name || 'Faculty Lecturer'}</td>
            <td class="text-center">${row.assignment}</td>
            <td class="text-center">${row.quiz}</td>
            <td class="text-center">${row.attendance}</td>
            <td class="text-center">${row.test}</td>
            <td class="text-center">${row.others}</td>
            <td class="text-center font-bold score-cell-total" style="color:var(--student-primary);">${tot.toFixed(1)}</td>
            <td class="text-center">${remarkBadge}</td>
          `;
          scoresTableBody.appendChild(tr);
        });

        updateScoreStats(scores);
      } catch (err) {
        Utils.showToast('Load Error', 'Failed to retrieve assessment records', 'error');
        scoresTableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger p-6"><i class="bi bi-exclamation-triangle"></i> Error loading scores.</td></tr>`;
      }
    }


    async function loadRecentComplaints() {
      if (!complaintsList) return;
      complaintsList.innerHTML = `<div class="text-center p-4"><i class="bi bi-arrow-clockwise spin"></i> Loading complaints...</div>`;

      try {
        const complaints = await API.get('/complaints/my');
        complaintsList.innerHTML = '';

        // Update stats
        const totalCompCard = document.getElementById('stat-total-complaints');
        const pendingCompCard = document.getElementById('stat-pending-complaints');
        
        const totalCount = complaints.length;
        const pendingCount = complaints.filter(c => c.status !== 'Resolved').length;

        if (totalCompCard) totalCompCard.textContent = totalCount;
        if (pendingCompCard) pendingCompCard.textContent = pendingCount;

        if (complaints.length === 0) {
          complaintsList.innerHTML = `
            <div class="empty-state">
              <i class="bi bi-chat-left-text empty-state-icon"></i>
              <div class="empty-state-title">No Complaints Filed</div>
              <p>Have an issue with your assessment scores? You can submit and track disputes directly through the system.</p>
            </div>
          `;
          return;
        }

        // Show top 3 recent
        const recent = complaints.slice(0, 3);
        recent.forEach(c => {
          const item = document.createElement('div');
          item.className = 'complaint-item slide-up';
          
          let badgeClass = 'badge-pending';
          if (c.status === 'Under Review') badgeClass = 'badge-review';
          if (c.status === 'Resolved') badgeClass = 'badge-resolved';

          item.innerHTML = `
            <div class="complaint-main">
              <div class="complaint-header">
                <span class="complaint-subject">${c.course_code}: ${c.complaint_type}</span>
                <span class="badge ${badgeClass}">${c.status}</span>
              </div>
              <span class="complaint-snippet">${c.description}</span>
              <span class="complaint-date">${Utils.formatDate(c.created_at)}</span>
            </div>
            <a href="/student/complaints-tracker.html" class="btn btn-ghost btn-sm">
              <i class="bi bi-eye"></i> View
            </a>
          `;
          complaintsList.appendChild(item);
        });
      } catch (err) {
        console.error(err);
        complaintsList.innerHTML = `<div class="text-center text-danger p-4"><i class="bi bi-exclamation-triangle"></i> Error loading complaints list.</div>`;
      }
    }

    function updateScoreStats(scores) {
      const avgCard = document.getElementById('stat-avg-score');
      if (!avgCard) return;

      if (scores.length === 0) {
        avgCard.textContent = '0.0%';
        return;
      }

      const sum = scores.reduce((acc, row) => acc + parseFloat(row.total), 0);
      const avg = sum / scores.length;
      avgCard.textContent = `${avg.toFixed(1)}%`;
    }
  }

  // ── COMPLAINT SUBMISSION FORM ─────────────────────────────
  async function initComplaintForm() {
    const courseSelect = document.getElementById('course_id');
    const complaintForm = document.getElementById('complaint-form');
    const descTextarea = document.getElementById('description');
    const charCount = document.getElementById('char-count');

    // Live character counter
    if (descTextarea && charCount) {
      descTextarea.addEventListener('input', () => {
        const count = descTextarea.value.length;
        charCount.textContent = `${count} characters`;
      });
    }

    // Load student's courses (only those courses with published scores)
    try {
      const scores = await API.get('/scores/my');
      if (courseSelect) {
        courseSelect.innerHTML = `<option value="">-- Select affected course --</option>`;
        
        const coursesSeen = new Set();
        scores.forEach(row => {
          if (row.course_id && !coursesSeen.has(row.course_id)) {
            coursesSeen.add(row.course_id);
            const opt = document.createElement('option');
            opt.value = row.course_id;
            opt.textContent = `${row.course_code} - ${row.course_name}`;
            courseSelect.appendChild(opt);
          }
        });
      }
    } catch (err) {
      console.error('Error loading student courses for form:', err);
      Utils.showToast('Load Error', 'Failed to retrieve your courses. Please try again later.', 'error');
    }

    // Handle Form Submit
    if (complaintForm) {
      complaintForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!Utils.validateForm(complaintForm)) return;

        const course_id = courseSelect.value;
        const complaint_type = document.getElementById('complaint_type').value;
        const description = descTextarea.value;

        if (description.trim().length < 20) {
          Utils.showToast('Validation Error', 'Description must be at least 20 characters.', 'error');
          return;
        }

        const submitBtn = complaintForm.querySelector('button[type="submit"]');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
          await API.post('/complaints', { course_id, complaint_type, description });
          Utils.showToast('Complaint Submitted', 'Your academic complaint has been filed.', 'success');
          setTimeout(() => {
            window.location.href = 'complaints-tracker.html';
          }, 1500);
        } catch (err) {
          Utils.showToast('Submission Failed', err.message, 'error');
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }
      });
    }
  }

  // ── COMPLAINTS TRACKER ────────────────────────────────────
  async function initComplaintsTracker() {
    const trackerContainer = document.getElementById('tracker-container');
    if (!trackerContainer) return;

    trackerContainer.innerHTML = `<div class="text-center p-12"><i class="bi bi-arrow-clockwise spin" style="font-size: 2rem;"></i><br>Loading complaints...</div>`;

    try {
      const complaints = await API.get('/complaints/my');
      trackerContainer.innerHTML = '';

      if (complaints.length === 0) {
        trackerContainer.innerHTML = `
          <div class="card p-12 text-center text-muted">
            <i class="bi bi-chat-square-text" style="font-size: 3rem; opacity: 0.5;"></i>
            <h3 class="mt-4 font-bold">No Complaints Filed</h3>
            <p class="mt-2">You haven't submitted any complaints yet. When you do, they will appear here with real-time response threads.</p>
            <div class="mt-6">
              <a href="/student/complaint-form.html" class="btn btn-primary"><i class="bi bi-plus-circle"></i> File a Complaint</a>
            </div>
          </div>
        `;
        return;
      }

      complaints.forEach((c, idx) => {
        const item = document.createElement('div');
        item.className = `tracker-item ${idx === 0 ? 'open' : ''} slide-up`;

        let badgeClass = 'badge-pending';
        if (c.status === 'Under Review') badgeClass = 'badge-review';
        if (c.status === 'Resolved') badgeClass = 'badge-resolved';

        let responsesHTML = '';
        if (c.responses.length === 0) {
          responsesHTML = `<p class="text-muted" style="font-size: 0.85rem; font-style: italic;">No responses from lecturer yet.</p>`;
        } else {
          c.responses.forEach(r => {
            responsesHTML += `
              <div class="response-bubble">
                <div class="response-header">
                  <span class="response-sender"><i class="bi bi-person-fill"></i> ${r.lecturer_name} (Lecturer)</span>
                  <span class="response-date">${Utils.formatDate(r.created_at)}</span>
                </div>
                <div class="response-text">${r.response_text}</div>
              </div>
            `;
          });
        }

        item.innerHTML = `
          <div class="tracker-header">
            <div class="tracker-header-left">
              <i class="bi bi-chevron-down tracker-icon"></i>
              <div>
                <span class="tracker-title">${c.course_code}: ${c.complaint_type}</span>
                <span class="text-muted" style="font-size: 0.8rem; margin-left: var(--space-3);">${Utils.formatDate(c.created_at)}</span>
              </div>
            </div>
            <span class="badge ${badgeClass}">${c.status}</span>
          </div>
          <div class="tracker-body">
            <div class="thread-title"><i class="bi bi-file-text"></i> Complaint Description</div>
            <div class="complaint-detail-desc">${c.description}</div>
            
            <div class="responses-thread">
              <div class="thread-title"><i class="bi bi-reply-all"></i> Response History</div>
              ${responsesHTML}
            </div>
          </div>
        `;

        // Toggle toggle-collapse click event
        const header = item.querySelector('.tracker-header');
        header.addEventListener('click', () => {
          item.classList.toggle('open');
        });

        trackerContainer.appendChild(item);
      });
    } catch (err) {
      console.error(err);
      trackerContainer.innerHTML = `<div class="card p-6 text-center text-danger"><i class="bi bi-exclamation-triangle"></i> Failed to load complaints. Please check server.</div>`;
    }
  }
});
