// Tuition App - LocalStorage Data Manager
// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔴 Apna Firebase config yahan dalna
const firebaseConfig = {
  apiKey: "AIzaSyDofFo8nRTFKgyTFDPa6dlD6IRZ8jsokwk",
  authDomain: "tution-manage.firebaseapp.com",
  projectId: "tution-manage",
  storageBucket: "tution-manage.firebasestorage.app",
  messagingSenderId: "969580557963",
  appId: "1:969580557963:web:44a1b8fca36b53b64cc68e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("Firebase connected ✅");
let currentUser = null;
let currentStudentId = null;


// Sample data init  
async function initData() {
  const usersCol = collection(db, "users");
  const snapshot = await getDocs(usersCol);
  if(snapshot.empty) {
    const sampleUsers = [
      { id: 'admin1', email: 'admin@test.com', password: 'admin123', role: 'admin', name: 'Admin' }
      
    ];

    for(const user of sampleUsers) {
      await addDoc(usersCol, user);
    }
    console.log("Sample users added to Firebase ✅");
  }
}

    
  }
}

// Load data
async function loadData(collectionName) {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addData(collectionName, data) {
  await addDoc(collection(db, collectionName), data);
}

// Generate ID
function genId(prefix) {
  return prefix + Date.now();
}

// Login
async function login() {
  const emailRaw = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value.trim();
  const role = document.getElementById('role').value;

  console.log('=== LOGIN DEBUG ===');
  console.log('Input - email:', emailRaw, 'password:', password ? '[HIDDEN]' : '', 'role:', role);

  try {
    // Firestore query for users collection
    const usersCol = collection(db, "users");
    const q = query(
      usersCol,
      where("email", "==", emailRaw),
      where("role", "==", role)
    );
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log('All users matching email & role:', users);

    const user = users.find(u => u.password === password);

    if (user) {
      console.log('SUCCESS! Logged in user:', user.id);
      currentUser = user;

      document.getElementById('loginSection').classList.add('hidden');
      if (role === 'admin') {
        document.getElementById('adminSection').classList.remove('hidden');
        await loadAdminDashboard();  // agar async ho to await lagao
        showSection('dashboardSection');
      } else {
        document.getElementById('studentSection').classList.remove('hidden');
        await loadStudentView();  // agar async ho to await lagao
      }
    } else {
      console.log('FAILED LOGIN');
      alert('Invalid credentials! Wrong password.');
    }
  } catch (err) {
    console.error('Login error:', err);
    alert('Error logging in. Check console.');
  }

  console.log('===================');
}

async function loadStudentsTable() {
  const studentsCol = collection(db, "students");
  const snapshot = await getDocs(studentsCol);
  const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const tbody = document.querySelector('#studentsTable tbody');
  tbody.innerHTML = students.map(student => `
    <tr>
      <td>${student.id}</td>
      <td>${student.name}</td>
      <td>${student.class}</td>
      <td>₹${student.monthlyFees}</td>
      <td><button onclick="viewStudent('${student.id}')">View</button></td>
    </tr>
  `).join('');
}
// Logout
function logout() {
  currentUser = null;
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('studentSection').classList.add('hidden');
  document.getElementById('adminSection').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
}

// Student View
async function loadStudentView() {
  if (!currentUser) return;

  // 1️⃣ Firestore se student fetch karo
  const studentsCol = collection(db, "students");
  const studentQuery = query(studentsCol, where("id", "==", currentUser.studentId));
  const studentSnapshot = await getDocs(studentQuery);
  const student = studentSnapshot.docs[0]?.data();

  if (student) {
    document.getElementById('studentProfile').innerHTML = `
      <div class="student-profile-details">
        <h3>Student Profile</h3>
        <p><strong>Student ID:</strong> ${student.id}</p>
        <p><strong>User ID:</strong> ${currentUser.id}</p>
        <p><strong>Name:</strong> ${student.name}</p>
        <p><strong>Mobile No:</strong> ${student.mobile || 'N/A'}</p>
        <p><strong>Email ID:</strong> ${student.email}</p>
        <p><strong>Class:</strong> ${student.class}</p>
        <p><strong>Monthly Fees:</strong> ₹${student.monthlyFees.toLocaleString()}</p>
      </div>
    `;
  } else {
    document.getElementById('studentProfile').innerHTML = '<p>No profile data found.</p>';
  }

  // 2️⃣ Firestore se fees fetch karo
  const feesCol = collection(db, "fees");
  const feesQuery = query(feesCol, where("studentId", "==", currentUser.studentId));
  const feesSnapshot = await getDocs(feesQuery);
  const fees = feesSnapshot.docs.map(doc => doc.data())
    .sort((a, b) => {
      const monthA = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(a.month);
      const monthB = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(b.month);
      return a.year - b.year || monthA - monthB;
    });

  const tbody = document.querySelector('#studentFeesTable tbody');
  tbody.innerHTML = fees.map(fee => `
    <tr>
      <td>${fee.month}</td>
      <td>${fee.year}</td>
      <td>${fee.dueDate}</td>
      <td>${fee.paidDate || 'Unpaid'}</td>
      <td><span style="color: ${fee.status === 'paid' ? 'green' : 'red'}">${fee.status.toUpperCase()}</span></td>
    </tr>
  `).join('');
}
// Admin Dashboard
async function loadAdminDashboard() {
  // 1️⃣ Firestore se students aur fees fetch karo
  const studentsSnapshot = await getDocs(collection(db, "students"));
  const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const feesSnapshot = await getDocs(collection(db, "fees"));
  const fees = feesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 2️⃣ Dashboard stats calculate karo
  const totalStudents = students.length;
  const studying = students.filter(s => s.status === 'studying').length;
  const nonActive = students.filter(s => s.status === 'non-active').length;

  const received = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
  const uncollected = fees.filter(f => f.status === 'unpaid').reduce((sum, f) => sum + f.amount, 0);
  const profit = received * 0.9; // Assume 10% costs

  // 3️⃣ Dashboard render karo
  document.getElementById('adminStats').innerHTML = `
    <div class="stat-card"><div class="stat-number">${totalStudents}</div><div class="stat-label">Total Students</div></div>
    <div class="stat-card"><div class="stat-number">${studying}</div><div class="stat-label">Currently Studying</div></div>
    <div class="stat-card"><div class="stat-number">${nonActive}</div><div class="stat-label">Non-Active</div></div>
    <div class="stat-card"><div class="stat-number">₹${received.toLocaleString()}</div><div class="stat-label">Received Money</div></div>
    <div class="stat-card"><div class="stat-number">₹${uncollected.toLocaleString()}</div><div class="stat-label">Uncollected</div></div>
    <div class="stat-card"><div class="stat-number">₹${profit.toLocaleString()}</div><div class="stat-label">Profit</div></div>
  `;
}

// Sections show functions remain same
function showStudents() {
  showSection('studentsSection');
}

function showFees() {
  showSection('feesSection');
}

async function loadStudentsTable() {
  // 1️⃣ Firestore se students fetch karo
  const studentsSnapshot = await getDocs(collection(db, "students"));
  const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 2️⃣ Table render karo
  const tbody = document.querySelector('#studentsTable tbody');
  tbody.innerHTML = students.map(student => `
    <tr>
      <td>${student.id}</td>
      <td>${student.name}</td>
      <td>${student.class}</td>
      <td>₹${student.monthlyFees}</td>
      <td><button onclick="viewStudent('${student.id}')">View</button></td>
    </tr>
  `).join('');
}

async function loadFeesTable() {
  // 1️⃣ Fetch fees and students from Firebase
  const feesSnapshot = await getDocs(collection(db, "fees"));
  const studentsSnapshot = await getDocs(collection(db, "students"));

  const fees = feesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 2️⃣ Enrich fees with student info
  const enrichedFees = fees.map(fee => {
    const student = students.find(s => s.id === fee.studentId);
    return { ...fee, studentName: student ? student.name : '', class: student ? student.class : '' };
  }).sort((a, b) => {
    const nameA = a.studentName.toLowerCase();
    const nameB = b.studentName.toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB);

    const monthA = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(a.month);
    const monthB = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(b.month);
    return a.year - b.year || monthA - monthB;
  });

  // 3️⃣ Render table
  const tbody = document.querySelector('#feesTable tbody');
  tbody.innerHTML = enrichedFees.map(fee => `
    <tr>
      <td>${fee.studentId}</td>
      <td>${fee.studentName}</td>
      <td>${fee.class}</td>
      <td>${fee.month}</td>
      <td>${fee.year}</td>
      <td>${fee.dueDate}</td>
      <td>${fee.paidDate || 'Pending'}</td>
      <td><span style="color: ${fee.status === 'paid' ? 'green' : 'red'}">${fee.status.toUpperCase()}</span></td>
      <td><button onclick="toggleFeeStatus('${fee.studentId}', '${fee.month}', ${fee.year})">${fee.status === 'paid' ? 'Unpaid' : 'Paid'}</button></td>
    </tr>
  `).join('');
}

// Modals
function openAddStudentModal() {
  // Clear form fields when opening modal
  document.getElementById('addName').value = '';
  document.getElementById('addMobile').value = '';
  document.getElementById('addEmail').value = '';
  document.getElementById('addClass').value = '';
  document.getElementById('addStudentId').value = '';
  document.getElementById('addFees').value = '';
  document.getElementById('addUserId').value = '';
  document.getElementById('addPassword').value = '';
  document.getElementById('addStudentModal').classList.remove('hidden');
}
// --- Tumhare saare functions jaise addStudent(), loadStudentsTable() etc --- //

// Ye line JS file ke end me add karo
document.addEventListener('DOMContentLoaded', () => {
  loadStudentsTable();
});

async function openAddFeeModal() {
  const studentSelect = document.getElementById('addFeeStudent');
  const monthInput = document.getElementById('addFeeMonth');
  const dueDateInput = document.getElementById('addFeeDueDate');
  const paidDateInput = document.getElementById('addFeePaidDate');
  const statusSelect = document.getElementById('addFeeStatus');
  const amountInput = document.getElementById('addFeeAmount');

  // Clear all form fields first
  studentSelect.value = '';
  monthInput.value = '';
  dueDateInput.value = '';
  paidDateInput.value = '';
  statusSelect.value = 'unpaid';
  amountInput.value = '';

  // 1️⃣ Fetch students from Firebase
  const studentsCol = collection(db, "students");
  const snapshot = await getDocs(studentsCol);
  const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 2️⃣ Populate dropdown
  studentSelect.innerHTML = '<option value="">Select Student</option>';
  students.forEach(student => {
    const option = document.createElement('option');
    option.value = student.id;
    option.textContent = `${student.id} - ${student.name} (${student.class}) - ₹${student.monthlyFees}`;
    option.dataset.amount = student.monthlyFees;
    studentSelect.appendChild(option);
  });

  // 3️⃣ Add search/filter functionality
  studentSelect.addEventListener('input', function() {
    const filter = this.value.toLowerCase().trim();
    if (!filter) return;

    Array.from(this.options).forEach(option => {
      if (option.value === '') return;
      const text = option.textContent.toLowerCase();
      const idPart = option.value.toLowerCase();
      const namePart = text.split(' - ')[1] || '';
      option.style.display = (idPart.includes(filter) || namePart.includes(filter)) ? '' : 'none';
    });
  });

  // 4️⃣ Auto-fill amount on student selection
  studentSelect.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    if (selectedOption.dataset.amount) {
      amountInput.value = selectedOption.dataset.amount;
    }
  });

  // 5️⃣ Sync Paid Date/Status
  syncStatusPaidDate();

  document.getElementById('addFeeModal').classList.remove('hidden');
}

function syncStatusPaidDate() {
  const statusSelect = document.getElementById('addFeeStatus');
  const paidDateInput = document.getElementById('addFeePaidDate');
  if (statusSelect.value === 'paid' && !paidDateInput.value) {
    paidDateInput.value = new Date().toISOString().split('T')[0];
  } else if (statusSelect.value === 'unpaid') {
    paidDateInput.value = '';
  }
}

// Event listeners for sync (add once)
let statusListenerAdded = false;
if (!statusListenerAdded) {
  document.getElementById('addFeeStatus').addEventListener('change', syncStatusPaidDate);
  document.getElementById('addFeePaidDate').addEventListener('change', function() {
    const statusSelect = document.getElementById('addFeeStatus');
    if (this.value && statusSelect.value === 'unpaid') {
      statusSelect.value = 'paid';
    } else if (!this.value && statusSelect.value === 'paid') {
      statusSelect.value = 'unpaid';
    }
  });
  statusListenerAdded = true;
}

async function addFee() {
  const studentId = document.getElementById('addFeeStudent').value.trim();
  const monthInput = document.getElementById('addFeeMonth').value;
  const dueDate = document.getElementById('addFeeDueDate').value;
  const paidDateInput = document.getElementById('addFeePaidDate');
  const statusSelect = document.getElementById('addFeeStatus');
  const amount = parseInt(document.getElementById('addFeeAmount').value);
  const status = statusSelect.value || 'unpaid';

  if (!studentId || !monthInput || !dueDate || !amount || !status) {
    alert('Please fill required fields!');
    return;
  }

  // Paid date handling
  const finalPaidDate = status === 'paid' ? (paidDateInput.value || new Date().toISOString().split('T')[0]) : null;

  // Convert month input to name
  const [year, month] = monthInput.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[parseInt(month) - 1];

  try {
    // 1️⃣ Check if fee already exists
    const feesCol = collection(db, "fees");
    const feeQuery = query(
      feesCol,
      where("studentId", "==", studentId),
      where("month", "==", monthName),
      where("year", "==", parseInt(year))
    );
    const feeSnapshot = await getDocs(feeQuery);
    if (!feeSnapshot.empty) {
      alert('Fee for this student, month, and year already exists!');
      return;
    }

    // 2️⃣ Add fee document
    await addDoc(feesCol, {
      studentId,
      month: monthName,
      year: parseInt(year),
      dueDate,
      paidDate: finalPaidDate,
      status,
      amount
    });

    // 3️⃣ Clear modal & refresh UI
    closeModal('addFeeModal');
    await loadFeesTable();       // fetch from Firebase
    await loadAdminDashboard();  // fetch from Firebase
    alert('Fee added successfully!');

  } catch (error) {
    console.error("Error adding fee:", error);
    alert("Failed to add fee.");
  }
}



function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  // Clear form fields if it's edit modal
  if (modalId === 'editStudentModal') {
    document.getElementById('editName').value = '';
    document.getElementById('editEmail').value = '';
    document.getElementById('editClass').value = '';
    document.getElementById('editFees').value = '';
    document.getElementById('editPassword').value = '';
  }
  modal.classList.add('hidden');
}

async function addStudent() {
  const name = document.getElementById('addName').value.trim();
  const mobile = document.getElementById('addMobile').value.trim();
  const email = document.getElementById('addEmail').value.trim().toLowerCase();
  const className = document.getElementById('addClass').value.trim();
  const studentId = document.getElementById('addStudentId').value.trim();
  const monthlyFees = parseInt(document.getElementById('addFees').value);
  const userId = document.getElementById('addUserId').value.trim();
  const password = document.getElementById('addPassword').value;

  // ✅ Validate
  if (!name || !mobile || !email || !className || !studentId || !monthlyFees || !userId || !password) {
    alert('Fill all fields!');
    return;
  }

  try {
    // 1️⃣ Check uniqueness in students collection
    const studentsCol = collection(db, "students");
    const studentQuery = query(studentsCol, where("id", "==", studentId));
    const studentEmailQuery = query(studentsCol, where("email", "==", email));
    const [studentSnapshot, studentEmailSnapshot] = await Promise.all([
      getDocs(studentQuery),
      getDocs(studentEmailQuery)
    ]);

    if (!studentSnapshot.empty || !studentEmailSnapshot.empty) {
      alert('Student ID or Email already exists!');
      return;
    }

    // 2️⃣ Check uniqueness in users collection
    const usersCol = collection(db, "users");
    const userQuery = query(usersCol, where("id", "==", userId));
    const userEmailQuery = query(usersCol, where("email", "==", email));
    const [userSnapshot, userEmailSnapshot] = await Promise.all([
      getDocs(userQuery),
      getDocs(userEmailQuery)
    ]);

    if (!userSnapshot.empty || !userEmailSnapshot.empty) {
      alert('User ID or Email already exists!');
      return;
    }

    // 3️⃣ Add student document
    await addDoc(studentsCol, {
      id: studentId,
      name,
      mobile,
      email,
      class: className,
      monthlyFees,
      status: 'studying'
    });

    // 4️⃣ Add user document
    await addDoc(usersCol, {
      id: userId,
      email,
      password,
      role: 'student',
      name,
      studentId
    });

    // 5️⃣ Clear form
    document.getElementById('addName').value = '';
    document.getElementById('addMobile').value = '';
    document.getElementById('addEmail').value = '';
    document.getElementById('addClass').value = '';
    document.getElementById('addStudentId').value = '';
    document.getElementById('addFees').value = '';
    document.getElementById('addUserId').value = '';
    document.getElementById('addPassword').value = '';

    // 6️⃣ Refresh UI
    closeModal('addStudentModal');
    await loadStudentsTable();  // fetch from Firebase
    await loadAdminDashboard(); // fetch from Firebase
    alert(`Student added! StudentID: ${studentId}, Login - Email: ${email}, UserID: ${userId}, Password: ${password}`);

  } catch (error) {
    console.error("Error adding student:", error);
    alert("Failed to add student.");
  }
}

async function viewStudent(studentId) {
  if (!studentId) return alert("No student selected!");

  currentStudentId = studentId;

  try {
    // 1️⃣ Fetch student document
    const studentsCol = collection(db, "students");
    const studentQuery = query(studentsCol, where("id", "==", studentId));
    const studentSnapshot = await getDocs(studentQuery);

    if (studentSnapshot.empty) {
      alert("Student not found!");
      return;
    }

    const studentDoc = studentSnapshot.docs[0];
    const student = studentDoc.data();

    // 2️⃣ Fetch associated user document for login info
    const usersCol = collection(db, "users");
    const userQuery = query(usersCol, where("studentId", "==", studentId));
    const userSnapshot = await getDocs(userQuery);
    const user = userSnapshot.empty ? null : userSnapshot.docs[0].data();

    // 3️⃣ Populate modal
    document.getElementById('viewStudentTitle').textContent = student.name + ' Details';
    let loginInfo = user ? `
      <p><strong>User ID:</strong> ${user.id}</p>
      <p><strong>Password:</strong> ${user.password}</p>
    ` : '<p>Login info not found</p>';

    document.getElementById('viewStudentDetails').innerHTML = `
      <p><strong>Student ID:</strong> ${student.id}</p>
      <p><strong>Name:</strong> ${student.name}</p>
      <p><strong>Mobile:</strong> ${student.mobile || 'N/A'}</p>
      <p><strong>Email:</strong> ${student.email}</p>
      <p><strong>Class:</strong> ${student.class}</p>
      <p><strong>Monthly Fees:</strong> ₹${student.monthlyFees}</p>
      ${loginInfo}
    `;

    // Show modal & actions
    document.getElementById('studentActions').classList.remove('hidden');
    document.getElementById('viewStudentModal').classList.remove('hidden');

  } catch (error) {
    console.error("Error viewing student:", error);
    alert("Failed to load student details.");
  }
}

async function toggleFeeStatus(studentId, month, year) {
  try {
    // 1️⃣ Fetch the fee document
    const feesCol = collection(db, "fees");
    const feeQuery = query(
      feesCol,
      where("studentId", "==", studentId),
      where("month", "==", month),
      where("year", "==", year)
    );

    const feeSnapshot = await getDocs(feeQuery);
    if (feeSnapshot.empty) {
      alert("Fee record not found!");
      return;
    }

    // 2️⃣ Update status and paidDate
    for (const feeDoc of feeSnapshot.docs) {
      const feeData = feeDoc.data();
      const newStatus = feeData.status === "paid" ? "unpaid" : "paid";
      const newPaidDate = newStatus === "paid" ? new Date().toISOString().split('T')[0] : null;

      await updateDoc(doc(db, "fees", feeDoc.id), {
        status: newStatus,
        paidDate: newPaidDate
      });
    }

    // 3️⃣ Refresh UI
    await loadAdminDashboard(); // Make sure these functions fetch from Firebase
    await loadFeesTable();

  } catch (error) {
    console.error("Error toggling fee status:", error);
    alert("Failed to update fee status.");
  }
}

async function editStudent() {
  const studentId = currentStudentId;
  if (!studentId) {
    alert("No student selected!");
    return;
  }

  try {
    // 1️⃣ Fetch student from "students" collection
    const studentsCol = collection(db, "students");
    const studentQuery = query(studentsCol, where("id", "==", studentId));
    const studentSnapshot = await getDocs(studentQuery);
    if (studentSnapshot.empty) {
      alert("Student not found!");
      return;
    }
    const studentDoc = studentSnapshot.docs[0];
    const student = studentDoc.data();

    // 2️⃣ Fetch associated user (for password) from "users" collection
    const usersCol = collection(db, "users");
    const userQuery = query(usersCol, where("studentId", "==", studentId));
    const userSnapshot = await getDocs(userQuery);
    const user = userSnapshot.empty ? null : userSnapshot.docs[0].data();

    // 3️⃣ Fill edit modal fields
    document.getElementById('editName').value = student.name || '';
    document.getElementById('editEmail').value = student.email || '';
    document.getElementById('editClass').value = student.class || '';
    document.getElementById('editFees').value = student.monthlyFees || '';
    document.getElementById('editPassword').value = user ? user.password : '';

    // Close view modal & open edit modal
    closeModal('viewStudentModal');
    document.getElementById('editStudentModal').classList.remove('hidden');

  } catch (error) {
    console.error("Error fetching student for edit:", error);
    alert("Failed to load student data.");
  }
}

async function saveEditStudent() {
  const studentId = currentStudentId;
  if (!studentId) {
    alert("No student selected!");
    return;
  }

  // Get updated values from form
  const newName = document.getElementById('editName').value;
  const newEmail = document.getElementById('editEmail').value;
  const newClass = document.getElementById('editClass').value;
  const newMonthlyFees = parseInt(document.getElementById('editFees').value);
  const newPassword = document.getElementById('editPassword').value;

  try {
    // 1️⃣ Update student document
    const studentsCol = collection(db, "students");
    const studentQuery = query(studentsCol, where("id", "==", studentId));
    const studentSnapshot = await getDocs(studentQuery);
    for (const studentDoc of studentSnapshot.docs) {
      await updateDoc(doc(db, "students", studentDoc.id), {
        name: newName,
        email: newEmail,
        class: newClass,
        monthlyFees: newMonthlyFees
      });
    }

    // 2️⃣ Update associated user password if provided
    if (newPassword) {
      const usersCol = collection(db, "users");
      const userQuery = query(usersCol, where("studentId", "==", studentId));
      const userSnapshot = await getDocs(userQuery);
      for (const userDoc of userSnapshot.docs) {
        await updateDoc(doc(db, "users", userDoc.id), {
          password: newPassword
        });
      }
    }

    // Close modal & refresh UI
    closeModal('editStudentModal');
    await loadStudentsTable();     // make sure this fetches from Firebase
    await loadAdminDashboard();    // make sure this fetches from Firebase
    alert('Updated successfully ✅');

  } catch (error) {
    console.error("Error updating student:", error);
    alert("Failed to update student.");
  }
}

async function deleteStudent() {
  if (!currentStudentId) {
    alert("No student selected!");
    return;
  }

  if (confirm("Delete this student?")) {
    try {
      // 1️⃣ Delete student document from "students" collection
      const studentsCol = collection(db, "students");
      const studentQuery = query(studentsCol, where("id", "==", currentStudentId));
      const studentSnapshot = await getDocs(studentQuery);
      for (const studentDoc of studentSnapshot.docs) {
        await deleteDoc(doc(db, "students", studentDoc.id));
      }

      // 2️⃣ Delete associated user document from "users" collection
      const usersCol = collection(db, "users");
      const userQuery = query(usersCol, where("studentId", "==", currentStudentId));
      const userSnapshot = await getDocs(userQuery);
      for (const userDoc of userSnapshot.docs) {
        await deleteDoc(doc(db, "users", userDoc.id));
      }

      // 3️⃣ Delete associated fees from "fees" collection
      const feesCol = collection(db, "fees");
      const feesQuery = query(feesCol, where("studentId", "==", currentStudentId));
      const feesSnapshot = await getDocs(feesQuery);
      for (const feeDoc of feesSnapshot.docs) {
        await deleteDoc(doc(db, "fees", feeDoc.id));
      }

      // Close modal & refresh UI
      closeModal("viewStudentModal");
      await loadStudentsTable();       // make sure this loads from Firebase now
      await loadAdminDashboard();      // make sure this loads from Firebase
      alert("Deleted successfully ✅");
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student.");
    }
  }
}

// Init Firebase data (e.g., sample admin)
initData();

