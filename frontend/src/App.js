import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login');
  const [emailInput, setEmailInput] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [showFileModal, setShowFileModal] = useState(false);
  const [currentSubmissionText, setCurrentSubmissionText] = useState('');
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [submissionToGrade, setSubmissionToGrade] = useState(null);
  const [gradeValue, setGradeValue] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteBase, setDeleteBase] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [showSESMag, setShowSESMag] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: "Hello! I'm your Student Portal assistant. Ask me anything about how to use the portal!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const API = 'http://localhost:5000/api';

  const getEndpoint = (pageName) => {
    if (pageName === 'students') return user?.role === 'instructor' ? `courses?instructorid=${user.id}` : (user?.role === 'admin' ? 'users?role=student' : 'courses');
    if (pageName === 'courses') return 'courses';
    if (pageName === 'assignments') return 'assignments';
    if (pageName === 'announcements') return 'announcements';
    if (pageName === 'submissions') return user?.role === 'student' ? `submissions?studentid=${user.id}` : 'submissions';
    if (pageName === 'instructors') return 'users?role=instructor';
    return null;
  };

  const getEmptyForm = (pageName) => {
    if (pageName === 'assignments') return { title: '', duedate: '', description: '', courseid: '' };
    if (pageName === 'announcements') return { title: '', message: '', courseid: '' };
    if (pageName === 'instructors') return { name: '', email: '', courseTitle: '', courseDescription: '', courseSyllabus: '' };
    if (pageName === 'students') return { name: '', email: '' };
    return {};
  };

  const login = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return alert('Please enter your email');
    try {
      const res = await axios.post(`${API}/users/login`, { email: emailInput.trim() });
      setUser(res.data);
      setPage(res.data.role === 'admin' ? 'instructors' : res.data.role === 'instructor' ? 'students' : 'courses');
    } catch (err) {
      alert('Login failed — user not found');
    }
  };

  const logout = () => {
    setUser(null);
    setPage('login');
    setEmailInput('');
    setData([]);
    setCourses([]);
    setAssignments([]);
    setEnrolledCourseIds([]);
    setSelectedAssignment(null);
    setSubmissionText('');
    setShowFileModal(false);
    setShowGradeModal(false);
    setAllUsers([]);
    setShowChat(false);
    setShowSESMag(false);
    setChatMessages([{ sender: 'bot', text: "Hello! I'm your Student Portal assistant. Ask me anything about how to use the portal!" }]);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesRes, assignmentsRes, usersRes] = await Promise.all([
        axios.get(`${API}/courses`),
        axios.get(`${API}/assignments`),
        axios.get(`${API}/users`)
      ]);
      setCourses(coursesRes.data);
      setAssignments(assignmentsRes.data);
      setAllUsers(usersRes.data);
      let enrolled = [];
      if (user?.role === 'student') {
        enrolled = coursesRes.data
          .filter(c => c.students?.includes(user.id))
          .map(c => c.id);
        setEnrolledCourseIds(enrolled);
      }
      const endpoint = getEndpoint(page);
      if (!endpoint) {
        setData([]);
        setLoading(false);
        return;
      }
      let fetched = (await axios.get(`${API}/${endpoint}`)).data;
      if (page === 'announcements') {
        if (user?.role === 'student') {
          fetched = fetched.filter(a => enrolled.includes(a.courseid));
        } else if (user?.role === 'instructor') {
          const instructorCourseIds = coursesRes.data
            .filter(c => c.instructorid === user.id)
            .map(c => c.id);
          fetched = fetched.filter(a => instructorCourseIds.includes(a.courseid));
        }
      }
      if (page === 'students' && user?.role === 'instructor') {
        const instructorCourses = coursesRes.data.filter(c => c.instructorid === user.id);
        const expanded = [];
        instructorCourses.forEach(course => {
          if (course.students && course.students.length > 0) {
            course.students.forEach(studentId => {
              const student = usersRes.data.find(u => u.id === studentId);
              if (student) {
                expanded.push({
                  courseId: course.id,
                  courseTitle: course.title,
                  studentId: student.id,
                  studentName: student.name,
                  studentEmail: student.email
                });
              }
            });
          } else {
            expanded.push({
              courseId: course.id,
              courseTitle: course.title,
              studentName: '(No students enrolled)',
              studentEmail: ''
            });
          }
        });
        setData(expanded);
      } else if (page === 'courses' && user?.role === 'student') {
        const enriched = fetched.map(course => ({
          ...course,
          instructorName: usersRes.data.find(u => u.id === course.instructorid)?.name || 'Unknown Instructor'
        }));
        setData(enriched);
      } else if (page === 'assignments') {
        if (user?.role === 'student') {
          setData(fetched.filter(a => enrolled.includes(a.courseid)));
        } else if (user?.role === 'instructor') {
          const instructorCourseIds = coursesRes.data
            .filter(c => c.instructorid === user.id)
            .map(c => c.id);
          setData(fetched.filter(a => instructorCourseIds.includes(a.courseid)));
        } else {
          setData(fetched);
        }
      } else if (page === 'announcements') {
        setData(fetched);
      } else if (page === 'submissions') {
        if (user?.role === 'instructor') {
          const instructorCourseIds = coursesRes.data
            .filter(c => c.instructorid === user.id)
            .map(c => c.id);
          const relevantAssignmentIds = assignmentsRes.data
            .filter(a => instructorCourseIds.includes(a.courseid))
            .map(a => a.id);
          setData(fetched.filter(s => relevantAssignmentIds.includes(s.assignmentid)));
        } else {
          setData(fetched);
        }
      } else {
        setData(fetched);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && page !== 'login') loadData();
  }, [page, user]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleCreateOrUpdate = async (e) => {
    if (e) e.preventDefault();
    try {
      let base = (page === 'instructors' || page === 'students') ? 'users' : page;
      let payload = { ...formData };
      if (page === 'instructors' && !editingItem) {
        payload.role = 'instructor';
      }
      if (page === 'students' && !editingItem) {
        payload.role = 'student';
      }
      let res;
      if (editingItem) {
        res = await axios.put(`${API}/${base}/${editingItem.id}`, payload);
      } else {
        res = await axios.post(`${API}/${base}`, payload);
      }
      if (page === 'instructors' && !editingItem) {
        await axios.post(`${API}/courses`, {
          title: formData.courseTitle,
          description: formData.courseDescription || null,
          syllabus: formData.courseSyllabus || null,
          instructorid: res.data.id
        });
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({});
      loadData();
    } catch (err) {
      console.error(err);
      alert('Error saving item');
    }
  };

  const editItem = (item) => {
    setEditingItem(item);
    setFormData({
      ...item,
      courseid: item.courseid || item.courseId
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    try {
      let base = deleteBase || page;
      if (page === 'instructors' || page === 'students') base = 'users';
      const id = itemToDelete.id || itemToDelete;
      if (page === 'instructors') {
        const coursesRes = await axios.get(`${API}/courses?instructorid=${id}`);
        for (const course of coursesRes.data) {
          const assignmentsRes = await axios.get(`${API}/assignments?courseid=${course.id}`);
          for (const assignment of assignmentsRes.data) {
            const submissionsRes = await axios.get(`${API}/submissions?assignmentid=${assignment.id}`);
            for (const submission of submissionsRes.data) {
              await axios.delete(`${API}/submissions/${submission.id}`);
            }
            await axios.delete(`${API}/assignments/${assignment.id}`);
          }
          const announcementsRes = await axios.get(`${API}/announcements?courseid=${course.id}`);
          for (const announcement of announcementsRes.data) {
            await axios.delete(`${API}/announcements/${announcement.id}`);
          }
          await axios.delete(`${API}/courses/${course.id}`);
        }
      }
      await axios.delete(`${API}/${base}/${id}`);
      setShowConfirmDelete(false);
      setItemToDelete(null);
      setDeleteBase('');
      loadData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const enrollInCourse = async (courseId) => {
    try {
      await axios.post(`${API}/courses/${courseId}/enroll`, { studentid: user.id });
      loadData();
    } catch (err) {
      alert('Already enrolled or error');
    }
  };

  const dropCourse = async (courseId) => {
    try {
      await axios.post(`${API}/courses/${courseId}/drop`, { studentid: user.id });
      loadData();
    } catch (err) {
      alert('Error dropping course');
    }
  };

  const submitAssignment = async (e) => {
    e.preventDefault();
    if (!submissionText.trim()) return alert('Please enter your submission');
    try {
      await axios.post(`${API}/submissions`, {
        assignmentid: selectedAssignment.id,
        studentid: user.id,
        fileurl: submissionText
      });
      setSubmissionText('');
      setSelectedAssignment(null);
      loadData();
    } catch (err) {
      alert('Submission failed');
    }
  };

  const gradeSubmission = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/submissions/${submissionToGrade.id}/grade`, {
        grade: parseInt(gradeValue) || null,
        feedback: feedbackText || null
      });
      setShowGradeModal(false);
      setGradeValue('');
      setFeedbackText('');
      setSubmissionToGrade(null);
      loadData();
    } catch (err) {
      alert('Error grading');
    }
  };

  const getAssignmentTitle = (id) => assignments.find(a => a.id === id)?.title || `Assignment ${id}`;
  const getStudentName = (id) => allUsers.find(u => u.id === id)?.name || `Student ${id}`;

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: msg }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, { message: msg });
      setChatMessages(prev => [...prev, { sender: 'bot', text: res.data.reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, the AI assistant is temporarily unavailable.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontFamily: '"Segoe UI", Roboto, sans-serif', color: '#333' }}>
      {page === 'login' && !user && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '20px' }}>
          <div style={{ background: 'white', padding: '40px 50px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 30px', color: '#4a5568', fontSize: '2.5rem', fontWeight: '700' }}>Student Portal</h1>
            <form onSubmit={login}>
              <input type="email" placeholder="Enter your email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} required style={{ width: '100%', padding: '14px', margin: '10px 0', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '1rem' }} />
              <button type="submit" style={{ width: '100%', padding: '14px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', marginTop: '10px' }}>Login</button>
            </form>
          </div>
        </div>
      )}
      {user && (
        <>
          <header style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', padding: '15px 30px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 1000 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
              <h1 style={{ margin: 0, color: '#4a5568', fontSize: '1.8rem' }}>Student Portal</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ color: '#718096', fontWeight: '500' }}>Welcome, <strong>{user.name}</strong> ({user.role})</span>
                <button onClick={() => setShowChat(prev => !prev)} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  {showChat ? 'Hide Assistant' : 'AI Assistant'}
                </button>
                <button onClick={() => setShowSESMag(true)} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  SESMag
                </button>
                <button onClick={logout} style={{ padding: '10px 20px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Logout</button>
              </div>
            </div>
          </header>

          {/* AI Chat Bot */}
          {showChat && (
            <div style={{ position: 'fixed', bottom: '20px', right: '20px', width: '380px', height: '520px', background: 'white', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: '#667eea', color: 'white', padding: '15px 20px', borderRadius: '16px 16px 0 0', fontWeight: '600', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Portal Assistant</span>
                <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ flex: 1, padding: '15px', overflowY: 'auto', background: '#f8fafc' }}>
                {chatMessages.map((msg, idx) => (
                  <div key={idx} style={{ marginBottom: '12px', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                    <div style={{
                      display: 'inline-block',
                      maxWidth: '80%',
                      padding: '10px 14px',
                      borderRadius: '14px',
                      background: msg.sender === 'user' ? '#667eea' : '#e2e8f0',
                      color: msg.sender === 'user' ? 'white' : '#333'
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'inline-block', padding: '10px 14px', borderRadius: '14px', background: '#e2e8f0', color: '#666' }}>
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding: '15px', borderTop: '1px solid #ddd', display: 'flex' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !chatLoading && sendChatMessage()}
                  placeholder="Ask a question..."
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none' }}
                />
                <button onClick={sendChatMessage} disabled={chatLoading} style={{ marginLeft: '8px', padding: '10px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer' }}>
                  Send
                </button>
              </div>
            </div>
          )}

          {/* SESMag Modal */}
          {showSESMag && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
              <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%', overflow: 'hidden' }}>
                <h2 style={{ margin: '0 0 20px', textAlign: 'center' }}>Socio-Economic Magnifier</h2>
                <p>SESMag a usability inspection method created to identify socioeconomic inclusivity issues in software design. It focuses on uncovering “SES-inclusivity bugs,” which are features that may unintentionally disadvantage users from lower socioeconomic backgrounds. The method uses research-based facets and personas such as Dav, Ash, and Fee to represent different patterns of technology access, experience, and problem-solving styles. By evaluating software through these personas, developers and designers can better understand how certain design choices may exclude or frustrate specific user groups. Overall, SESMag encourages more equitable software design by highlighting problems that traditional usability testing might overlook.</p>
                <br />
                <p>This part of the assignment was moderately challenging but manageable. Understanding how to apply the personas and facets required careful thought and reflection, especially when analyzing software from perspectives different from my own. However, once I became familiar with the process, it was easier to see how effective SESMag can be in revealing hidden design flaws. The assignment was valuable in showing how socioeconomic factors influence user experience. If I were to change anything, I would include more structured examples or step by step walk-throughs before the main task, which would help students apply the SESMag framework more confidently and efficiently</p>
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button onClick={() => setShowSESMag(false)} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <nav style={{ background: '#4a5568', padding: '15px 30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              {user.role === 'student' && (
                <>
                  <button onClick={() => setPage('courses')} style={{ padding: '12px 24px', background: page === 'courses' ? '#667eea' : '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Courses</button>
                  <button onClick={() => setPage('assignments')} style={{ padding: '12px 24px', background: page === 'assignments' ? '#667eea' : '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Assignments</button>
                  <button onClick={() => setPage('announcements')} style={{ padding: '12px 24px', background: page === 'announcements' ? '#667eea' : '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Announcements</button>
                  <button onClick={() => setPage('submissions')} style={{ padding: '12px 24px', background: page === 'submissions' ? '#667eea' : '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>My Submissions</button>
                </>
              )}
              {user.role === 'instructor' && (
                <>
                  <button onClick={() => setPage('students')} style={{ padding: '12px 24px', background: page === 'students' ? '#667eea' : '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>My Students</button>
                  <button onClick={() => setPage('assignments')} style={{ padding: '12px 24px', background: page === 'assignments' ? '#667eea' : '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Assignments</button>
                  <button onClick={() => setPage('announcements')} style={{ padding: '12px 24px', background: page === 'announcements' ? '#667eea' : '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Announcements</button>
                  <button onClick={() => setPage('submissions')} style={{ padding: '12px 24px', background: page === 'submissions' ? '#667eea' : '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Grade Submissions</button>
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <button onClick={() => setPage('instructors')} style={{ padding: '12px 24px', background: page === 'instructors' ? '#667eea' : '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Manage Instructors</button>
                  <button onClick={() => setPage('students')} style={{ padding: '12px 24px', background: page === 'students' ? '#667eea' : '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Manage Students</button>
                </>
              )}
            </div>
          </nav>

          <main style={{ maxWidth: '1400px', margin: '30px auto', padding: '0 20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '30px', minHeight: '600px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0, color: '#2d3748', fontSize: '2rem' }}>
                  {page === 'students' ? (user.role === 'admin' ? 'Manage Students' : 'My Enrolled Students') : page.charAt(0).toUpperCase() + page.slice(1)}
                </h2>
                {(user.role === 'instructor' && ['assignments', 'announcements'].includes(page)) || (user.role === 'admin' && ['instructors', 'students'].includes(page)) ? (
                  <button onClick={() => { setEditingItem(null); setFormData(getEmptyForm(page)); setShowForm(true); }} style={{ padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    + Add New {page.slice(0, -1)}
                  </button>
                ) : null}
              </div>

              {loading && <p style={{ textAlign: 'center', color: '#718096' }}>Loading...</p>}
              {!loading && data.length === 0 && <p style={{ textAlign: 'center', color: '#718096' }}>No {page === 'students' ? 'students' : page} available.</p>}

              {/* Courses - Student */}
              {page === 'courses' && user.role === 'student' && data.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Course Title</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Instructor</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Description</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Syllabus</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(course => (
                      <tr key={course.id}>
                        <td style={{ padding: '16px' }}>{course.title}</td>
                        <td style={{ padding: '16px' }}>{course.instructorName}</td>
                        <td style={{ padding: '16px' }}>{course.description || '—'}</td>
                        <td style={{ padding: '16px' }}>{course.syllabus || '—'}</td>
                        <td style={{ padding: '16px', fontWeight: '600', color: enrolledCourseIds.includes(course.id) ? '#48bb78' : '#e53e3e' }}>
                          {enrolledCourseIds.includes(course.id) ? 'Enrolled' : 'Not Enrolled'}
                        </td>
                        <td style={{ padding: '16px' }}>
                          {enrolledCourseIds.includes(course.id) ? (
                            <button onClick={() => dropCourse(course.id)} style={{ padding: '10px 20px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Drop Course</button>
                          ) : (
                            <button onClick={() => enrollInCourse(course.id)} style={{ padding: '10px 20px', background: '#48bb78', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Enroll</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* My Students - Instructor */}
              {page === 'students' && user.role === 'instructor' && data.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      <th style={{ padding: '16px', textAlign: 'left' }}>My Course</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Student Name</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Student Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reduce((groups, item) => {
                      const existing = groups.find(g => g.courseId === item.courseId);
                      if (existing) {
                        existing.students.push({ name: item.studentName, email: item.studentEmail });
                      } else {
                        groups.push({
                          courseId: item.courseId,
                          courseTitle: item.courseTitle,
                          students: [{ name: item.studentName, email: item.studentEmail }]
                        });
                      }
                      return groups;
                    }, []).map(group => (
                      <React.Fragment key={group.courseId}>
                        {group.students.map((student, idx) => (
                          <tr key={`${group.courseId}-${idx}`}>
                            {idx === 0 && (
                              <td rowSpan={group.students.length} style={{ padding: '16px', verticalAlign: 'top' }}>
                                {group.courseTitle}
                              </td>
                            )}
                            <td style={{ padding: '16px' }}>{student.name}</td>
                            <td style={{ padding: '16px' }}>{student.email}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Assignments */}
              {page === 'assignments' && data.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Title</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Due Date</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Description</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Course</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(assignment => (
                      <tr key={assignment.id}>
                        <td style={{ padding: '16px' }}>{assignment.title}</td>
                        <td style={{ padding: '16px' }}>{assignment.duedate || 'No due date'}</td>
                        <td style={{ padding: '16px' }}>{assignment.description || '—'}</td>
                        <td style={{ padding: '16px' }}>{courses.find(c => c.id === assignment.courseid)?.title || assignment.courseid}</td>
                        <td style={{ padding: '16px' }}>
                          {user.role === 'student' && (
                            <button onClick={() => { setSelectedAssignment(assignment); setSubmissionText(''); }} style={{ padding: '10px 20px', background: '#48bb78', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                              Submit
                            </button>
                          )}
                          {user.role === 'instructor' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => editItem(assignment)} style={{ padding: '8px 16px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                              <button onClick={() => { setItemToDelete(assignment.id); setDeleteBase('assignments'); setShowConfirmDelete(true); }} style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Assignment Submission Modal */}
              {selectedAssignment && user.role === 'student' && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                  <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '600px' }}>
                    <h3>Submit Assignment: {selectedAssignment.title}</h3>
                    <form onSubmit={submitAssignment}>
                      <textarea
                        placeholder="Enter your submission text here..."
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        required
                        style={{ width: '100%', padding: '12px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd', minHeight: '200px', fontSize: '1rem' }}
                      />
                      <div style={{ marginTop: '20px' }}>
                        <button type="submit" style={{ padding: '10px 20px', background: '#48bb78', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' }}>Submit Assignment</button>
                        <button type="button" onClick={() => { setSelectedAssignment(null); setSubmissionText(''); }} style={{ padding: '10px 20px', background: '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Announcements */}
              {page === 'announcements' && data.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Title</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Message</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Course</th>
                      {user.role === 'instructor' && <th style={{ padding: '16px', textAlign: 'left' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(ann => (
                      <tr key={ann.id}>
                        <td style={{ padding: '16px' }}>{ann.title}</td>
                        <td style={{ padding: '16px' }}>{ann.message}</td>
                        <td style={{ padding: '16px' }}>{ann.dateposted || '—'}</td>
                        <td style={{ padding: '16px' }}>{courses.find(c => c.id === ann.courseid)?.title || ann.courseid}</td>
                        {user.role === 'instructor' && (
                          <td style={{ padding: '16px' }}>
                            <button onClick={() => editItem(ann)} style={{ padding: '8px 16px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', marginRight: '8px', cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => { setItemToDelete(ann.id); setDeleteBase('announcements'); setShowConfirmDelete(true); }} style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Submissions */}
              {page === 'submissions' && data.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      {user.role === 'student' && (
                        <>
                          <th style={{ padding: '16px', textAlign: 'left' }}>Assignment</th>
                          <th style={{ padding: '16px', textAlign: 'left' }}>Your Submission</th>
                          <th style={{ padding: '16px', textAlign: 'left' }}>Actions</th>
                          <th style={{ padding: '16px', textAlign: 'left' }}>Grade</th>
                        </>
                      )}
                      {user.role === 'instructor' && (
                        <>
                          <th style={{ padding: '16px', textAlign: 'left' }}>Student</th>
                          <th style={{ padding: '16px', textAlign: 'left' }}>Assignment</th>
                          <th style={{ padding: '16px', textAlign: 'left' }}>Submission</th>
                          <th style={{ padding: '16px', textAlign: 'left' }}>Grade</th>
                          <th style={{ padding: '16px', textAlign: 'left' }}>Action</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(sub => (
                      <tr key={sub.id}>
                        {user.role === 'student' && (
                          <>
                            <td style={{ padding: '16px' }}>{getAssignmentTitle(sub.assignmentid)}</td>
                            <td style={{ padding: '16px' }}>{sub.fileurl ? 'Submitted' : 'Not submitted'}</td>
                            <td style={{ padding: '16px' }}>
                              {sub.fileurl && (
                                <>
                                  <button onClick={() => { setCurrentSubmissionText(sub.fileurl); setShowFileModal(true); }} style={{ marginRight: '8px', padding: '8px 16px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>View</button>
                                  <button onClick={() => { setItemToDelete(sub.id); setDeleteBase('submissions'); setShowConfirmDelete(true); }} style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                                </>
                              )}
                            </td>
                            <td style={{ padding: '16px', color: sub.grade !== null ? '#48bb78' : '#718096' }}>
                              {sub.grade !== null ? `${sub.grade}/100` : 'Not graded'}
                            </td>
                          </>
                        )}
                        {user.role === 'instructor' && (
                          <>
                            <td style={{ padding: '16px' }}>{getStudentName(sub.studentid)}</td>
                            <td style={{ padding: '16px' }}>{getAssignmentTitle(sub.assignmentid)}</td>
                            <td style={{ padding: '16px' }}>
                              {sub.fileurl ? (
                                <button onClick={() => { setCurrentSubmissionText(sub.fileurl); setShowFileModal(true); }} style={{ padding: '8px 16px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>View</button>
                              ) : 'No submission'}
                            </td>
                            <td style={{ padding: '16px', color: sub.grade !== null ? '#48bb78' : '#718096' }}>
                              {sub.grade !== null ? `${sub.grade}/100` : 'Not graded'}
                            </td>
                            <td style={{ padding: '16px' }}>
                              <button onClick={() => { setSubmissionToGrade(sub); setGradeValue(sub.grade?.toString() || ''); setFeedbackText(sub.feedback || ''); setShowGradeModal(true); }} style={{ padding: '10px 20px', background: sub.grade === null ? '#48bb78' : '#ed8936', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                {sub.grade === null ? 'Grade' : 'Regrade'}
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Instructors (Admin) */}
              {page === 'instructors' && data.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(inst => (
                      <tr key={inst.id}>
                        <td style={{ padding: '16px' }}>{inst.name}</td>
                        <td style={{ padding: '16px' }}>{inst.email}</td>
                        <td style={{ padding: '16px' }}>
                          <button onClick={() => editItem(inst)} style={{ marginRight: '8px', padding: '8px 16px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => { setItemToDelete(inst.id); setDeleteBase('users'); setShowConfirmDelete(true); }} style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Students (Admin) */}
              {page === 'students' && user.role === 'admin' && data.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f7fafc' }}>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '16px', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(stu => (
                      <tr key={stu.id}>
                        <td style={{ padding: '16px' }}>{stu.name}</td>
                        <td style={{ padding: '16px' }}>{stu.email}</td>
                        <td style={{ padding: '16px' }}>
                          <button onClick={() => editItem(stu)} style={{ marginRight: '8px', padding: '8px 16px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => { setItemToDelete(stu.id); setDeleteBase('users'); setShowConfirmDelete(true); }} style={{ padding: '8px 16px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Edit Form Modal */}
              {showForm && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                  <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '600px' }}>
                    <h3>{editingItem ? 'Edit' : 'Add'} {page === 'instructors' ? 'Instructor' : page === 'students' ? 'Student' : page.slice(0, -1)}</h3>
                    <form onSubmit={handleCreateOrUpdate}>
                      {(page === 'assignments' || page === 'announcements') && (
                        <select value={formData.courseid || ''} onChange={(e) => setFormData({ ...formData, courseid: e.target.value })} required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd' }}>
                          <option value="">Select Course</option>
                          {courses.filter(c => c.instructorid === user.id).map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>
                      )}
                      {page === 'assignments' && (
                        <>
                          <input type="text" placeholder="Title" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd' }} />
                          <input type="date" placeholder="Due Date" value={formData.duedate || ''} onChange={(e) => setFormData({ ...formData, duedate: e.target.value })} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd' }} />
                          <textarea placeholder="Description" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd', minHeight: '100px' }} />
                        </>
                      )}
                      {page === 'announcements' && (
                        <>
                          <input type="text" placeholder="Title" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd' }} />
                          <textarea placeholder="Message" value={formData.message || ''} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd', minHeight: '150px' }} />
                        </>
                      )}
                      {(page === 'instructors' || page === 'students') && (
                        <>
                          <input type="text" placeholder="Name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd' }} />
                          <input type="email" placeholder="Email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd' }} />
                        </>
                      )}
                      {page === 'instructors' && !editingItem && (
                        <>
                          <input type="text" placeholder="Course Title" value={formData.courseTitle || ''} onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })} required style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd' }} />
                          <textarea placeholder="Course Description (optional)" value={formData.courseDescription || ''} onChange={(e) => setFormData({ ...formData, courseDescription: e.target.value })} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd', minHeight: '100px' }} />
                          <textarea placeholder="Course Syllabus (optional)" value={formData.courseSyllabus || ''} onChange={(e) => setFormData({ ...formData, courseSyllabus: e.target.value })} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd', minHeight: '100px' }} />
                        </>
                      )}
                      <div style={{ marginTop: '20px' }}>
                        <button type="submit" style={{ padding: '10px 20px', background: '#48bb78', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' }}>Save</button>
                        <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); setFormData({}); }} style={{ padding: '10px 20px', background: '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Grade Submission Modal */}
              {showGradeModal && submissionToGrade && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                  <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '600px' }}>
                    <h3>Grade Submission</h3>
                    <p><strong>Student:</strong> {getStudentName(submissionToGrade.studentid)}</p>
                    <p><strong>Assignment:</strong> {getAssignmentTitle(submissionToGrade.assignmentid)}</p>
                    <form onSubmit={gradeSubmission}>
                      <input type="number" min="0" max="100" placeholder="Grade (0-100)" value={gradeValue} onChange={(e) => setGradeValue(e.target.value)} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd' }} />
                      <textarea placeholder="Feedback (optional)" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '6px', border: '1px solid #ddd', minHeight: '120px' }} />
                      <div style={{ marginTop: '20px' }}>
                        <button type="submit" style={{ padding: '10px 20px', background: '#48bb78', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' }}>Submit Grade</button>
                        <button type="button" onClick={() => { setShowGradeModal(false); setSubmissionToGrade(null); setGradeValue(''); setFeedbackText(''); }} style={{ padding: '10px 20px', background: '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* View Submission Text Modal */}
              {showFileModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                  <div style={{ background: 'white', padding: '30px', borderRadius: '12px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
                    <h3 style={{ margin: '0 0 20px' }}>Submission Text</h3>
                    <p style={{ whiteSpace: 'pre-wrap', background: '#f7fafc', padding: '20px', borderRadius: '8px', minHeight: '200px' }}>
                      {currentSubmissionText || 'No content'}
                    </p>
                    <button onClick={() => setShowFileModal(false)} style={{ padding: '10px 20px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Delete Modal */}
              {showConfirmDelete && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                  <div style={{ background: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center' }}>
                    <h3>Are you sure you want to delete?</h3>
                    <div style={{ marginTop: '20px' }}>
                      <button onClick={handleDelete} style={{ marginRight: '10px', padding: '10px 20px', background: '#e53e3e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Yes, Delete</button>
                      <button onClick={() => { setShowConfirmDelete(false); setItemToDelete(null); setDeleteBase(''); }} style={{ padding: '10px 20px', background: '#718096', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>

          <footer style={{ textAlign: 'center', padding: '30px', color: 'white', background: 'rgba(0,0,0,0.3)', marginTop: '50px' }}>
            <h3 style={{ margin: '0 0 10px' }}>Student Portal © 2025</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Nikko Manuel - Marlon Chipa Learning Management System</p>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;