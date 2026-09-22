/* ============================================================
   LECTURER DASHBOARD & MANAGEMENT PAGE LOGIC
   lecturer.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const token = Utils.getToken();
  const user = Utils.getUser();

  // Route protection
  if (!token || !user || user.role !== 'lecturer') {
    window.location.href = 'login.html';
    return;
  }

  // Initialize Sidebar
  Utils.initSidebar();

  // Load pending complaints count badge in sidebar
  loadPendingComplaintsCount();

  // Populate user name in headers
  const headerName = document.getElementById('header-user-name');
  if (headerName) headerName.textContent = user.name;

  // Logout trigger
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Utils.logout('lecturer');
    });
  }

  // Page Routing
  const pagePath = window.location.pathname;

  if (pagePath.includes('dashboard.html')) {
    initDashboard();
  } else if (pagePath.includes('courses.html')) {
    initCoursesPage();
  } else if (pagePath.includes('score-entry.html')) {
    initScoreEntryPage();
  } else if (pagePath.includes('complaints.html')) {
    initComplaintsPage();
  }

  async function loadPendingComplaintsCount() {
    const badge = document.getElementById('complaint-badge');
    if (!badge) return;
    try {
      const complaints = await API.get('/complaints/lecturer');
      const pending = complaints.filter(c => c.status !== 'Resolved').length;
      if (pending > 0) {
        badge.textContent = pending;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    } catch (err) {
      console.error('Failed to load pending complaints count', err);
    }
  }

  // ── LECTURER DASHBOARD (OVERVIEW) ─────────────────────────
  async function initDashboard() {
    const dCountEl = document.getElementById('stat-total-drafts');
    const pCountEl = document.getElementById('stat-total-published');
    const cCountEl = document.getElementById('stat-total-complaints');
    const recentComplaintsList = document.getElementById('recent-complaints-list');

    try {
      // 1. Load summary stats from courses list
      const courses = await API.get('/courses/my');
      let totalDraft = 0;
      let totalPublished = 0;

      courses.forEach(course => {
        totalDraft += Number(course.draft_count);
        totalPublished += Number(course.published_count);
      });

      if (dCountEl) dCountEl.textContent = totalDraft;
      if (pCountEl) pCountEl.textContent = totalPublished;

      // 2. Load recent complaints
      const complaints = await API.get('/complaints/lecturer');
      const pending = complaints.filter(c => c.status !== 'Resolved');
      
      if (cCountEl) cCountEl.textContent = pending.length;

      if (!recentComplaintsList) return;
      recentComplaintsList.innerHTML = '';

      if (complaints.length === 0) {
        recentComplaintsList.innerHTML = `
          <div class="empty-state p-4" style="text-align:center;">
            <i class="bi bi-chat-left-check" style="font-size:2rem;opacity:0.5;"></i>
            <p style="font-size:0.85rem;margin-top:4px;">No complaints filed yet.</p>
          </div>
        `;
        return;
      }

      // Show top 3 recent complaints
      const recent = complaints.slice(0, 3);
      recent.forEach(c => {
        const div = document.createElement('div');
        div.className = 'complaint-item slide-up';
        div.style.cssText = 'border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-3);background:var(--surface-2);margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;';
        
        let badgeClass = 'badge-pending';
        if (c.status === 'Under Review') badgeClass = 'badge-review';
        if (c.status === 'Resolved') badgeClass = 'badge-resolved';

        div.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:2px;max-width:80%;">
            <span style="font-weight:700;font-size:0.85rem;color:var(--text-primary);">${c.course_code}: ${c.complaint_type}</span>
            <span style="font-size:0.75rem;color:var(--text-muted);">${c.student_name} (${c.reg_number})</span>
          </div>
          <span class="badge ${badgeClass}">${c.status}</span>
        `;
        recentComplaintsList.appendChild(div);
      });

    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      Utils.showToast('Load Error', 'Failed to retrieve overview statistics.', 'error');
    }
  }

  // ── COURSES & CATALOGUE PAGE ──────────────────────────────
  async function initCoursesPage() {
    const courseForm = document.getElementById('course-register-form');
    const coursesGrid = document.getElementById('courses-grid');
    const sessionSelect = document.getElementById('session-select');
    const semesterSelect = document.getElementById('semester-select');

    // Dynamic Live Weight Sum Helper
    const weightInputs = document.querySelectorAll('.weight-input');
    const weightSumVal = document.getElementById('weight-sum-val');

    function updateWeightSum() {
      let sum = 0;
      weightInputs.forEach(input => {
        sum += parseFloat(input.value) || 0;
      });
      if (weightSumVal) {
        weightSumVal.textContent = sum.toFixed(1);
        if (Math.abs(sum - 40.0) < 0.01) {
          weightSumVal.style.color = 'var(--success)';
        } else {
          weightSumVal.style.color = 'var(--danger)';
        }
      }
    }

    weightInputs.forEach(input => {
      input.addEventListener('input', updateWeightSum);
      input.addEventListener('change', updateWeightSum);
    });

    // Handle course submission
    if (courseForm) {
      courseForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!Utils.validateForm(courseForm)) return;

        const course_code = document.getElementById('course_code').value.toUpperCase().trim();
        const course_name = document.getElementById('course_name').value.trim();
        const session = document.getElementById('session').value.trim();
        const semester = Number(document.getElementById('semester').value);
        const department = document.getElementById('department').value.trim();
        const level = document.getElementById('level').value;

        // Weights
        const max_assignment = parseFloat(document.getElementById('max_assignment').value) || 0;
        const max_quiz = parseFloat(document.getElementById('max_quiz').value) || 0;
        const max_attendance = parseFloat(document.getElementById('max_attendance').value) || 0;
        const max_test = parseFloat(document.getElementById('max_test').value) || 0;
        const max_others = parseFloat(document.getElementById('max_others').value) || 0;

        const sum = max_assignment + max_quiz + max_attendance + max_test + max_others;
        if (Math.abs(sum - 40.0) > 0.01) {
          Utils.showToast('Weight Error', `Continuous assessment marks must sum to exactly 40.0. Current sum: ${sum}`, 'error');
          return;
        }

        const submitBtn = document.getElementById('submit-course-btn');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
          await API.post('/courses', {
            course_code, course_name, session, semester, department, level,
            max_assignment, max_quiz, max_attendance, max_test, max_others
          });
          Utils.showToast('Course Registered', 'Successfully registered course with custom weight settings.', 'success');
          courseForm.reset();
          updateWeightSum();
          
          // Reload dynamic session list & catalog
          await loadSessionFilterList();
          await loadCoursesCatalog();
        } catch (err) {
          Utils.showToast('Failed to Save', err.message, 'error');
        } finally {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }
      });
    }

    // Load dynamic session filter list
    await loadSessionFilterList();

    // Listeners for catalog filters
    if (sessionSelect) sessionSelect.addEventListener('change', loadCoursesCatalog);
    if (semesterSelect) semesterSelect.addEventListener('change', loadCoursesCatalog);

    // Initial load of catalog
    await loadCoursesCatalog();

    async function loadSessionFilterList() {
      if (!sessionSelect) return;
      try {
        const sessions = await API.get('/courses/sessions');
        // Clear previous options except "All Sessions"
        sessionSelect.innerHTML = '<option value="">All Sessions</option>';
        sessions.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          sessionSelect.appendChild(opt);
        });
      } catch (err) {
        console.error('Failed to load session list:', err);
      }
    }

    async function loadCoursesCatalog() {
      if (!coursesGrid) return;
      coursesGrid.innerHTML = `
        <div class="text-center p-12 col-span-full">
          <i class="bi bi-arrow-clockwise spin" style="font-size:2rem;color:var(--lecturer-primary);"></i>
          <p class="mt-2 text-muted">Filtering course catalog...</p>
        </div>
      `;

      const session = sessionSelect ? sessionSelect.value : '';
      const semester = semesterSelect ? semesterSelect.value : '';

      try {
        let url = '/courses/my';
        const params = [];
        if (session) params.push(`session=${encodeURIComponent(session)}`);
        if (semester) params.push(`semester=${encodeURIComponent(semester)}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const courses = await API.get(url);
        coursesGrid.innerHTML = '';

        if (courses.length === 0) {
          coursesGrid.innerHTML = `
            <div class="empty-state p-12 col-span-full" style="text-align:center;">
              <i class="bi bi-journal-x" style="font-size:3rem;opacity:0.5;"></i>
              <h3 style="margin-top:8px;font-weight:700;">No Courses Registered</h3>
              <p style="font-size:0.85rem;color:var(--text-muted);">Configure target classes using the registration tool on the left.</p>
            </div>
          `;
          return;
        }

        courses.forEach(c => {
          const item = document.createElement('div');
          item.className = 'card slide-up';
          item.style.cssText = 'padding:var(--space-5);border-color:var(--border-dark);margin-bottom:8px;';

          const hasComplaints = Number(c.pending_complaints_count) > 0;
          const statusBadge = c.published_count > 0 
            ? `<span class="badge badge-published"><i class="bi bi-check-circle-fill"></i> Published</span>`
            : `<span class="badge badge-draft"><i class="bi bi-file-earmark-lock"></i> Draft</span>`;

          item.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
              <div>
                <span class="course-badge" style="background:var(--surface-2);color:var(--lecturer-primary);font-size:0.75rem;padding:2px 6px;border-radius:4px;">${c.session} · Semester ${c.semester}</span>
                <div style="font-size:1.15rem;font-weight:800;color:var(--text-primary);margin-top:4px;">${c.course_code} - ${c.course_name}</div>
                <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">
                  Target: <b>${c.department}</b> (${c.level}) · 
                  Weights: A(${parseFloat(c.max_assignment)}), Q(${parseFloat(c.max_quiz)}), At(${parseFloat(c.max_attendance)}), T(${parseFloat(c.max_test)}), O(${parseFloat(c.max_others)})
                </div>
              </div>
              <div>${statusBadge}</div>
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--border);flex-wrap:wrap;gap:8px;">
              <div style="display:flex;gap:6px;">
                <a href="score-entry.html?courseId=${c.id}" class="btn btn-lecturer btn-sm">
                  <i class="bi bi-pencil-square"></i> Enter Scores
                </a>
                <a href="complaints.html" class="btn btn-outline btn-sm" title="View Disputes">
                  <i class="bi bi-chat-text"></i> Complaints ${hasComplaints ? `<span class="badge badge-error" style="margin-left:4px;padding:2px 6px;">${c.pending_complaints_count}</span>` : ''}
                </a>
              </div>
              <button class="btn btn-outline btn-sm text-danger btn-danger-delete" data-id="${c.id}" style="border-color:rgba(239,68,68,0.25);background:rgba(239,68,68,0.02);">
                <i class="bi bi-trash"></i> Delete
              </button>
            </div>
          `;

          // Bind delete action
          item.querySelector('.btn-danger-delete').addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete ${c.course_code}? All associated student scores and complaint threads will be permanently erased.`)) {
              try {
                await API.delete(`/courses/${c.id}`);
                Utils.showToast('Course Removed', 'Course catalog record deleted successfully.', 'success');
                await loadSessionFilterList();
                await loadCoursesCatalog();
              } catch (err) {
                Utils.showToast('Delete Failed', err.message, 'error');
              }
            }
          });

          coursesGrid.appendChild(item);
        });

      } catch (err) {
        console.error(err);
        coursesGrid.innerHTML = `<div class="text-center text-danger p-6"><i class="bi bi-exclamation-triangle"></i> Failed to reload catalogue.</div>`;
      }
    }
  }

  // ── SCORE ENTRY & GRADING PAGE ────────────────────────────
  async function initScoreEntryPage() {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('courseId');

    if (!courseId) {
      window.location.href = 'dashboard.html';
      return;
    }

    // Tabs switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
      });
    });

    // Elements
    const courseCodeEl = document.getElementById('course-code-title');
    const courseNameEl = document.getElementById('course-name-title');
    const courseDeptLvlEl = document.getElementById('course-dept-lvl');
    const statusBadgeEl = document.getElementById('status-badge');
    const manualTableBody = document.getElementById('manual-table-body');
    const addRowBtn = document.getElementById('add-row-btn');
    
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const publishBtn = document.getElementById('publish-btn');
    const unpublishBtn = document.getElementById('unpublish-btn');
    const lockWarningBanner = document.getElementById('lock-warning-banner');

    // Headers
    const thA = document.getElementById('th-assignment');
    const thQ = document.getElementById('th-quiz');
    const thAt = document.getElementById('th-attendance');
    const thT = document.getElementById('th-test');
    const thO = document.getElementById('th-others');

    // CSV elements
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('csv-file');
    const uploadBtn = document.getElementById('btn-upload-csv');
    const downloadTemplateBtn = document.getElementById('download-template-btn');

    let courseInfo = null;
    let scoresList = [];

    // Load Course metadata and weights
    try {
      courseInfo = await API.get(`/courses/${courseId}`);
      courseCodeEl.textContent = courseInfo.course_code;
      courseNameEl.textContent = courseInfo.course_name;
      courseDeptLvlEl.textContent = `${courseInfo.session} | Semester ${courseInfo.semester} | Department: ${courseInfo.department} | Level: ${courseInfo.level}`;

      // Update Column Headers with configured maximum weights
      if (thA) thA.textContent = `Assgn (Max: ${parseFloat(courseInfo.max_assignment)})`;
      if (thQ) thQ.textContent = `Quiz (Max: ${parseFloat(courseInfo.max_quiz)})`;
      if (thAt) thAt.textContent = `Attend (Max: ${parseFloat(courseInfo.max_attendance)})`;
      if (thT) thT.textContent = `Test (Max: ${parseFloat(courseInfo.max_test)})`;
      if (thO) thO.textContent = `Others (Max: ${parseFloat(courseInfo.max_others)})`;

    } catch (err) {
      Utils.showToast('Fetch Error', 'Failed to retrieve course details.', 'error');
      setTimeout(() => { window.location.href = 'courses.html'; }, 1500);
      return;
    }

    // CSV Template Download
    if (downloadTemplateBtn) {
      downloadTemplateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const csvContent = "data:text/csv;charset=utf-8,reg_number,assignment,quiz,attendance,test,others\nCSC/2022/001,8.0,3.5,4.0,12.5,0.0\nCSC/2022/002,7.0,4.0,3.5,11.0,0.0\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${courseInfo.course_code}_Scores_Template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }

    // Drag / drop CSV handler
    if (dropzone && fileInput) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          fileInput.files = e.dataTransfer.files;
          updateDropzoneLabel();
        }
      });
      fileInput.addEventListener('change', updateDropzoneLabel);
    }

    function updateDropzoneLabel() {
      const filename = fileInput.files[0] ? fileInput.files[0].name : '';
      const lbl = dropzone.querySelector('.upload-subtitle');
      if (lbl && filename) lbl.textContent = `Selected file: ${filename}`;
    }

    // CSV Processing
    if (uploadBtn) {
      uploadBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!fileInput.files[0]) {
          Utils.showToast('Validation Error', 'Please select a CSV file first.', 'error');
          return;
        }

        uploadBtn.classList.add('loading');
        uploadBtn.disabled = true;

        try {
          const res = await API.upload(`/scores/upload/${courseId}`, fileInput.files[0]);
          Utils.showToast('Import Finished', `Successfully updated draft values.`, 'success');
          showPreviewResults(res.results);
          await loadCurrentScores();
        } catch (err) {
          Utils.showToast('Upload Failed', err.message, 'error');
        } finally {
          uploadBtn.classList.remove('loading');
          uploadBtn.disabled = false;
        }
      });
    }

    // Load initial score sheet data
    await loadCurrentScores();

    async function loadCurrentScores() {
      if (!manualTableBody) return;
      manualTableBody.innerHTML = `<tr><td colspan="8" class="text-center p-6"><i class="bi bi-arrow-clockwise spin" style="font-size: 1.5rem;"></i><br>Loading score sheet records &amp; registered students...</td></tr>`;

      try {
        // 1. Fetch saved scores
        scoresList = await API.get(`/scores/course/${courseId}`);
        manualTableBody.innerHTML = '';

        let isPublished = false;
        if (scoresList.length > 0) {
          isPublished = scoresList[0].is_published;
        }

        // Apply published locks
        updateStatusBadge(isPublished);

        // 2. Fetch registered students matching course department & level
        let registeredStudents = [];
        try {
          const searchUrl = `/students/search?department=${encodeURIComponent(courseInfo.department)}&level=${encodeURIComponent(courseInfo.level)}`;
          registeredStudents = await API.get(searchUrl);
        } catch (sErr) {
          console.error('Failed to pre-fetch registered students:', sErr);
        }

        // Track reg numbers already added
        const loadedRegs = new Set();

        // Add saved scores first
        scoresList.forEach(s => {
          addNewRow(s);
          if (s.reg_number) loadedRegs.add(s.reg_number.trim().toUpperCase());
        });

        // Add registered students who don't have saved scores yet
        registeredStudents.forEach(st => {
          const cleanReg = st.reg_number ? st.reg_number.trim().toUpperCase() : '';
          if (cleanReg && !loadedRegs.has(cleanReg)) {
            addNewRow({
              reg_number: st.reg_number,
              student_name: st.name,
              assignment: 0,
              quiz: 0,
              attendance: 0,
              test: 0,
              others: 0,
              total: 0
            });
            loadedRegs.add(cleanReg);
          }
        });

        // If no records at all, add 1 blank row
        if (manualTableBody.querySelectorAll('.score-row').length === 0) {
          addNewRow();
        }

        // If published, enforce form locking
        if (isPublished) {
          lockAllInputs();
        } else {
          unlockAllInputs();
        }

      } catch (err) {
        console.error(err);
        manualTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger p-6"><i class="bi bi-exclamation-triangle"></i> Error loading scores.</td></tr>`;
      }
    }


    function updateStatusBadge(isPublished) {
      if (!statusBadgeEl) return;
      if (isPublished) {
        statusBadgeEl.className = 'badge badge-published score-status-badge';
        statusBadgeEl.innerHTML = `<i class="bi bi-check-circle-fill"></i> Published`;
        if (publishBtn) publishBtn.classList.add('hidden');
        if (unpublishBtn) unpublishBtn.classList.remove('hidden');
        if (lockWarningBanner) lockWarningBanner.classList.remove('hidden');
      } else {
        statusBadgeEl.className = 'badge badge-draft score-status-badge';
        statusBadgeEl.innerHTML = `<i class="bi bi-file-earmark-lock"></i> Draft`;
        if (publishBtn) publishBtn.classList.remove('hidden');
        if (unpublishBtn) unpublishBtn.classList.add('hidden');
        if (lockWarningBanner) lockWarningBanner.classList.add('hidden');
      }
    }

    function lockAllInputs() {
      manualTableBody.querySelectorAll('input').forEach(inp => inp.disabled = true);
      manualTableBody.querySelectorAll('.btn-remove-row').forEach(btn => btn.disabled = true);
      const addControls = document.getElementById('batch-add-controls');
      if (addControls) addControls.style.display = 'none';
      if (saveDraftBtn) saveDraftBtn.style.display = 'none';
      
      // Disable CSV upload as well
      const csvTrigger = document.getElementById('csv-tab-trigger');
      if (csvTrigger) csvTrigger.style.display = 'none';
    }

    function unlockAllInputs() {
      manualTableBody.querySelectorAll('input').forEach(inp => {
        // Only keep disabled if weight is 0
        const isLockedWeight = inp.classList.contains('weight-locked');
        inp.disabled = isLockedWeight;
      });
      manualTableBody.querySelectorAll('.btn-remove-row').forEach(btn => btn.disabled = false);
      const addControls = document.getElementById('batch-add-controls');
      if (addControls) addControls.style.display = 'flex';
      if (saveDraftBtn) saveDraftBtn.style.display = 'flex';
      
      const csvTrigger = document.getElementById('csv-tab-trigger');
      if (csvTrigger) csvTrigger.style.display = 'inline-block';
    }

    // Add manual row function
    if (addRowBtn) {
      addRowBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const countInput = document.getElementById('batch-row-count');
        const count = countInput ? parseInt(countInput.value) || 1 : 1;
        for (let i = 0; i < count; i++) {
          addNewRow();
        }
      });
    }

    function addNewRow(data = null) {
      const tr = document.createElement('tr');
      tr.className = 'score-row';

      const reg = data ? data.reg_number : '';
      const assignment = data ? parseFloat(data.assignment) : 0.0;
      const quiz = data ? parseFloat(data.quiz) : 0.0;
      const attendance = data ? parseFloat(data.attendance) : 0.0;
      const test = data ? parseFloat(data.test) : 0.0;
      const others = data ? parseFloat(data.others) : 0.0;
      const total = data ? parseFloat(data.total) : 0.0;
      const name = data ? data.student_name : '';

      // Check max values
      const maxA = parseFloat(courseInfo.max_assignment);
      const maxQ = parseFloat(courseInfo.max_quiz);
      const maxAt = parseFloat(courseInfo.max_attendance);
      const maxT = parseFloat(courseInfo.max_test);
      const maxO = parseFloat(courseInfo.max_others);

      // Render cells. Apply weight-locked class if max weight is 0.0
      tr.innerHTML = `
        <td style="position:relative;">
          <input type="text" class="form-control reg-input text-uppercase font-semibold" value="${reg}" placeholder="Matric No" required autocomplete="off">
          <div class="student-name-label" style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">${name}</div>
          <div class="autocomplete-dropdown hidden" style="position:absolute;top:100%;left:0;right:0;z-index:99;background:var(--surface);border:1px solid var(--border-dark);border-radius:var(--radius-md);box-shadow:var(--shadow-md);max-height:180px;overflow-y:auto;"></div>
        </td>
        <td class="text-center"><input type="number" class="score-input num-input ass-input ${maxA === 0 ? 'weight-locked' : ''}" step="0.1" min="0" max="${maxA}" value="${assignment}" ${maxA === 0 ? 'disabled' : ''}></td>
        <td class="text-center"><input type="number" class="score-input num-input quiz-input ${maxQ === 0 ? 'weight-locked' : ''}" step="0.1" min="0" max="${maxQ}" value="${quiz}" ${maxQ === 0 ? 'disabled' : ''}></td>
        <td class="text-center"><input type="number" class="score-input num-input att-input ${maxAt === 0 ? 'weight-locked' : ''}" step="0.1" min="0" max="${maxAt}" value="${attendance}" ${maxAt === 0 ? 'disabled' : ''}></td>
        <td class="text-center"><input type="number" class="score-input num-input test-input ${maxT === 0 ? 'weight-locked' : ''}" step="0.1" min="0" max="${maxT}" value="${test}" ${maxT === 0 ? 'disabled' : ''}></td>
        <td class="text-center"><input type="number" class="score-input num-input oth-input ${maxO === 0 ? 'weight-locked' : ''}" step="0.1" min="0" max="${maxO}" value="${others}" ${maxO === 0 ? 'disabled' : ''}></td>
        <td class="text-center font-bold total-val">${total.toFixed(1)}</td>
        <td class="text-center">
          <button class="btn btn-ghost btn-sm btn-remove-row text-danger" title="Remove student row"><i class="bi bi-x-lg"></i></button>
        </td>
      `;

      // Reg Number Autocomplete Dropdown logic
      const regInput = tr.querySelector('.reg-input');
      const nameLabel = tr.querySelector('.student-name-label');
      const dropdown = tr.querySelector('.autocomplete-dropdown');
      let searchTimeout = null;

      regInput.addEventListener('input', () => {
        const query = regInput.value.trim();
        clearTimeout(searchTimeout);

        if (query.length < 2) {
          dropdown.classList.add('hidden');
          dropdown.innerHTML = '';
          return;
        }

        searchTimeout = setTimeout(async () => {
          try {
            const url = `/students/search?query=${encodeURIComponent(query)}&department=${encodeURIComponent(courseInfo.department)}&level=${encodeURIComponent(courseInfo.level)}`;
            const suggestions = await API.get(url);

            if (suggestions.length === 0) {
              dropdown.classList.add('hidden');
              dropdown.innerHTML = '';
              return;
            }

            dropdown.innerHTML = suggestions.map(s => `
              <div class="autocomplete-item" data-reg="${s.reg_number}" data-name="${s.name}" style="padding:6px 10px;cursor:pointer;font-size:0.8rem;border-bottom:1px solid var(--border);">
                <span style="font-weight:700;color:var(--lecturer-primary);">${s.reg_number}</span> — <span style="color:var(--text-primary);">${s.name}</span>
                <div style="font-size:0.7rem;color:var(--text-muted);">${s.department} (${s.level})</div>
              </div>
            `).join('');

            dropdown.classList.remove('hidden');

            dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
              item.addEventListener('click', () => {
                regInput.value = item.dataset.reg;
                nameLabel.textContent = item.dataset.name;
                dropdown.classList.add('hidden');
                dropdown.innerHTML = '';
              });
            });

          } catch (err) {
            console.error('Autocomplete search error:', err);
          }
        }, 250);
      });

      // Hide dropdown on blur/click outside
      document.addEventListener('click', (e) => {
        if (!tr.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
      });

      // Live calculate
      const inputs = tr.querySelectorAll('.score-input');
      const totalCol = tr.querySelector('.total-val');

      inputs.forEach(input => {
        input.addEventListener('input', () => {
          let sum = 0;
          inputs.forEach(i => {
            sum += parseFloat(i.value) || 0;
          });
          totalCol.textContent = sum.toFixed(1);
        });
      });

      // Remove row
      tr.querySelector('.btn-remove-row').addEventListener('click', (e) => {
        e.preventDefault();
        tr.remove();
        if (manualTableBody.querySelectorAll('.score-row').length === 0) {
          addNewRow();
        }
      });

      manualTableBody.appendChild(tr);
    }


    // Save Draft click handler
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const rows = manualTableBody.querySelectorAll('.score-row');
        const scoresToSave = [];
        let hasValidationErrors = false;

        const maxA = parseFloat(courseInfo.max_assignment);
        const maxQ = parseFloat(courseInfo.max_quiz);
        const maxAt = parseFloat(courseInfo.max_attendance);
        const maxT = parseFloat(courseInfo.max_test);
        const maxO = parseFloat(courseInfo.max_others);

        rows.forEach(tr => {
          const regInput = tr.querySelector('.reg-input');
          const reg_number = regInput ? regInput.value.trim().toUpperCase() : '';
          
          if (!reg_number) return;

          const assignment = parseFloat(tr.querySelector('.ass-input').value) || 0;
          const quiz = parseFloat(tr.querySelector('.quiz-input').value) || 0;
          const attendance = parseFloat(tr.querySelector('.att-input').value) || 0;
          const test = parseFloat(tr.querySelector('.test-input').value) || 0;
          const others = parseFloat(tr.querySelector('.oth-input').value) || 0;

          // Check limits
          if (assignment > maxA || quiz > maxQ || attendance > maxAt || test > maxT || others > maxO) {
            hasValidationErrors = true;
            tr.style.background = 'rgba(239,68,68,0.06)';
          } else {
            tr.style.background = '';
          }

          scoresToSave.push({ reg_number, assignment, quiz, attendance, test, others });
        });

        if (hasValidationErrors) {
          Utils.showToast('Validation Error', 'Some student scores exceed their configured maximum component limits. Please correct the highlighted rows.', 'error');
          return;
        }

        if (scoresToSave.length === 0) {
          Utils.showToast('Validation Error', 'No student scores to save.', 'warning');
          return;
        }

        saveDraftBtn.classList.add('loading');
        saveDraftBtn.disabled = true;

        try {
          const res = await API.post(`/scores/${courseId}`, { scores: scoresToSave });
          Utils.showToast('Scores Saved', `Draft saved successfully. Total rows: ${res.savedCount}`, 'success');
          showPreviewResults(res.results);
          await loadCurrentScores();
        } catch (err) {
          Utils.showToast('Save Failed', err.message, 'error');
        } finally {
          saveDraftBtn.classList.remove('loading');
          saveDraftBtn.disabled = false;
        }
      });
    }

    // Publish click handler
    if (publishBtn) {
      publishBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // 1. Gather all rows currently in the table to ensure unsaved inputs are published
        const rows = manualTableBody.querySelectorAll('.score-row');
        const scoresToSave = [];
        let hasValidationErrors = false;

        const maxA = parseFloat(courseInfo.max_assignment);
        const maxQ = parseFloat(courseInfo.max_quiz);
        const maxAt = parseFloat(courseInfo.max_attendance);
        const maxT = parseFloat(courseInfo.max_test);
        const maxO = parseFloat(courseInfo.max_others);

        rows.forEach(tr => {
          const regInput = tr.querySelector('.reg-input');
          const reg_number = regInput ? regInput.value.trim().toUpperCase() : '';
          
          if (!reg_number) return;

          const assignment = parseFloat(tr.querySelector('.ass-input').value) || 0;
          const quiz = parseFloat(tr.querySelector('.quiz-input').value) || 0;
          const attendance = parseFloat(tr.querySelector('.att-input').value) || 0;
          const test = parseFloat(tr.querySelector('.test-input').value) || 0;
          const others = parseFloat(tr.querySelector('.oth-input').value) || 0;

          if (assignment > maxA || quiz > maxQ || attendance > maxAt || test > maxT || others > maxO) {
            hasValidationErrors = true;
            tr.style.background = 'rgba(239,68,68,0.06)';
          } else {
            tr.style.background = '';
          }

          scoresToSave.push({ reg_number, assignment, quiz, attendance, test, others });
        });

        if (hasValidationErrors) {
          Utils.showToast('Validation Error', 'Some student scores exceed their configured maximum limits. Please correct the highlighted rows.', 'error');
          return;
        }

        if (confirm('Are you sure you want to Publish these grades? Students will be able to see their assessment scores immediately.')) {
          publishBtn.disabled = true;
          try {
            await API.post(`/scores/publish/${courseId}`, { scores: scoresToSave });
            Utils.showToast('Scores Published', 'Score sheet has been published and locked.', 'success');
            await loadCurrentScores();
          } catch (err) {
            Utils.showToast('Publish Failed', err.message, 'error');
          } finally {
            publishBtn.disabled = false;
          }
        }
      });
    }

    // Unpublish click handler
    if (unpublishBtn) {
      unpublishBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to revert these scores to draft? They will be hidden from student dashboards and unlocked for editing.')) {
          unpublishBtn.disabled = true;
          try {
            await API.post(`/scores/unpublish/${courseId}`);
            Utils.showToast('Scores Reverted', 'Score sheet reverted to draft and unlocked.', 'success');
            await loadCurrentScores();
          } catch (err) {
            Utils.showToast('Revert Failed', err.message, 'error');
          } finally {
            unpublishBtn.disabled = false;
          }
        }
      });
    }

    // Display summary logs for saved/parsed records (mismatch, not found etc.)
    function showPreviewResults(results) {
      const container = document.getElementById('results-log-container');
      if (!container) return;

      const saved = results.filter(r => r.status === 'saved');
      const unregistered = results.filter(r => r.status === 'not_registered');
      const mismatched = results.filter(r => r.status === 'dept_level_mismatch');
      const errors = results.filter(r => r.status === 'error');

      let errorLogs = '';
      if (mismatched.length > 0 || unregistered.length > 0 || errors.length > 0) {
        errorLogs = `<div class="divider"></div><div class="font-bold text-secondary mb-2"><i class="bi bi-info-circle"></i> Routing observations:</div>`;
        results.forEach(r => {
          if (r.status === 'not_registered') {
            errorLogs += `<div style="font-size:0.8rem;margin-bottom:2px;"><span class="badge badge-draft">Unregistered</span> Student <b>${r.reg_number}</b> is not registered yet (Saved as draft).</div>`;
          } else if (r.status === 'dept_level_mismatch') {
            errorLogs += `<div style="font-size:0.8rem;margin-bottom:2px;"><span class="badge badge-mismatch">Mismatch</span> Student <b>${r.student_name} (${r.reg_number})</b> department/level does not match course meta.</div>`;
          } else if (r.status === 'error') {
            errorLogs += `<div style="font-size:0.8rem;margin-bottom:2px;color:var(--danger);"><span class="badge badge-error">Failed</span> Score limit exceeded: ${r.message}</div>`;
          }
        });
      }

      container.innerHTML = `
        <div class="card p-5 mt-6 fade-in" id="preview-results-panel">
          <h4 class="card-title mb-4"><i class="bi bi-card-checklist"></i> Scores Process Summary</h4>
          <div class="preview-stats">
            <span class="preview-stat-pill preview-stat-success"><i class="bi bi-check-circle"></i> ${saved.length} Synced</span>
            ${unregistered.length > 0 ? `<span class="preview-stat-pill preview-stat-warning"><i class="bi bi-person-fill-dash"></i> ${unregistered.length} Saved (Unregistered)</span>` : ''}
            ${mismatched.length > 0 ? `<span class="preview-stat-pill preview-stat-warning"><i class="bi bi-exclamation-triangle"></i> ${mismatched.length} Mismatches</span>` : ''}
            ${errors.length > 0 ? `<span class="preview-stat-pill preview-stat-danger"><i class="bi bi-x-circle"></i> ${errors.length} Errors</span>` : ''}
          </div>
          ${errorLogs}
        </div>
      `;
    }
  }

  // ── COMPLAINTS INBOX PAGE ──────────────────────────────────
  async function initComplaintsPage() {
    const complaintsGrid = document.getElementById('complaints-grid');
    if (!complaintsGrid) return;

    complaintsGrid.innerHTML = `
      <div class="text-center p-12 w-full col-span-full">
        <i class="bi bi-arrow-clockwise spin" style="font-size:2.5rem;color:var(--lecturer-primary);"></i>
        <p class="mt-2 text-muted">Retrieving student complaints...</p>
      </div>
    `;

    try {
      const complaints = await API.get('/complaints/lecturer');
      complaintsGrid.innerHTML = '';

      if (complaints.length === 0) {
        complaintsGrid.innerHTML = `
          <div class="card p-12 text-center text-muted col-span-full">
            <i class="bi bi-chat-square-check" style="font-size:3.5rem;opacity:0.5;"></i>
            <h3 class="mt-4 font-bold">No Student Complaints</h3>
            <p class="mt-2">Good job! There are no unresolved complaints filed for your courses at this time.</p>
          </div>
        `;
        return;
      }

      complaints.forEach(c => {
        const card = document.createElement('div');
        card.className = 'complaint-card slide-up mb-4';

        let badgeClass = 'badge-pending';
        if (c.status === 'Under Review') badgeClass = 'badge-review';
        if (c.status === 'Resolved') badgeClass = 'badge-resolved';

        let threadHTML = '';
        c.responses.forEach(r => {
          threadHTML += `
            <div class="response-bubble">
              <div class="response-header">
                <span class="response-sender"><i class="bi bi-chat-left-text"></i> ${r.lecturer_name} (You)</span>
                <span class="response-date">${Utils.formatDate(r.created_at)}</span>
              </div>
              <div class="response-text">${r.response_text}</div>
            </div>
          `;
        });

        let studentScoresHTML = '';
        if (c.student_scores) {
          studentScoresHTML = `
            <div class="linked-scores-panel">
              <div class="panel-title"><i class="bi bi-grid-3x3-gap"></i> Student's Current CA Scores (${c.course_code})</div>
              <table class="table" style="background:transparent;">
                <thead>
                  <tr>
                    <th style="padding:0.4rem;font-size:0.75rem;">Assign</th>
                    <th style="padding:0.4rem;font-size:0.75rem;">Quiz</th>
                    <th style="padding:0.4rem;font-size:0.75rem;">Attend</th>
                    <th style="padding:0.4rem;font-size:0.75rem;">Test</th>
                    <th style="padding:0.4rem;font-size:0.75rem;">Others</th>
                    <th style="padding:0.4rem;font-size:0.75rem;">Total /40</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding:0.4rem;font-size:0.8rem;">${c.student_scores.assignment}</td>
                    <td style="padding:0.4rem;font-size:0.8rem;">${c.student_scores.quiz}</td>
                    <td style="padding:0.4rem;font-size:0.8rem;">${c.student_scores.attendance}</td>
                    <td style="padding:0.4rem;font-size:0.8rem;">${c.student_scores.test}</td>
                    <td style="padding:0.4rem;font-size:0.8rem;">${c.student_scores.others}</td>
                    <td style="padding:0.4rem;font-size:0.8rem;font-weight:700;color:var(--lecturer-primary);">${c.student_scores.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        } else {
          studentScoresHTML = `<div class="linked-scores-panel text-muted" style="font-size:0.8rem;"><i class="bi bi-exclamation-triangle"></i> No score records currently entered for this student in this course.</div>`;
        }

        card.innerHTML = `
          <div class="complaint-card-header">
            <div class="student-meta">
              <div class="student-avatar">${c.student_name.substring(0,2).toUpperCase()}</div>
              <div class="student-name-reg">
                <span class="student-name-lbl">${c.student_name}</span>
                <span class="student-reg-lbl">${c.reg_number} | ${c.department} | ${c.level}</span>
              </div>
            </div>
            <span class="badge ${badgeClass}">${c.status}</span>
          </div>
          <div class="complaint-card-body">
            <div class="complaint-meta-bar">
              <span><b>Course:</b> ${c.course_code} - ${c.course_name}</span>
              <span><b>Type:</b> ${c.complaint_type}</span>
              <span><b>Submitted:</b> ${Utils.formatDate(c.created_at)}</span>
            </div>
            
            <div class="panel-title"><i class="bi bi-question-circle"></i> Grievance Statement</div>
            <div class="complaint-text">${c.description}</div>

            ${studentScoresHTML}

            <div class="responses-thread" style="margin-bottom: var(--space-5);">
              <div class="panel-title"><i class="bi bi-reply-all"></i> Message History</div>
              ${threadHTML}
            </div>

            <div class="response-entry-box">
              <div class="panel-title"><i class="bi bi-chat-right-quote"></i> Reply and Resolve</div>
              <form class="complaint-respond-form" data-id="${c.id}">
                <div class="form-row" style="grid-template-columns:1fr auto;align-items:end;gap:var(--space-4);display:grid;">
                  <div class="form-group" style="margin-bottom:0;">
                    <textarea class="form-control" placeholder="Write response to student here..." required style="min-height:80px;"></textarea>
                  </div>
                  <div class="form-group" style="margin-bottom:0;">
                    <label class="form-label">Set Status</label>
                    <select class="form-control" style="min-width:140px;" required>
                      <option value="Under Review" ${c.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                      <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                  </div>
                </div>
                <div class="flex justify-end mt-4">
                  <button type="submit" class="btn btn-lecturer btn-sm"><i class="bi bi-send"></i> Submit Response</button>
                </div>
              </form>
            </div>
          </div>
        `;

        const form = card.querySelector('.complaint-respond-form');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const text = form.querySelector('textarea').value;
          const status = form.querySelector('select').value;
          const submitBtn = form.querySelector('button[type="submit"]');

          submitBtn.disabled = true;

          try {
            await API.post(`/complaints/${c.id}/respond`, { response_text: text, status: status });
            Utils.showToast('Response Sent', 'Response registered and status updated.', 'success');
            await initComplaintsPage(); // Reload complaints list
          } catch (err) {
            Utils.showToast('Error', err.message, 'error');
            submitBtn.disabled = false;
          }
        });

        complaintsGrid.appendChild(card);
      });
    } catch (err) {
      console.error(err);
      complaintsGrid.innerHTML = `<div class="card p-6 text-center text-danger"><i class="bi bi-exclamation-triangle"></i> Failed to retrieve complaints.</div>`;
    }
  }
});
