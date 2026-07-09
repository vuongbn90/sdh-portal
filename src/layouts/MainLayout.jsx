import {
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileDoneOutlined,
  FilePdfOutlined,
  FormOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReadOutlined,
  ScheduleOutlined,
  SettingOutlined,
  SolutionOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Dropdown, Layout, Menu, Space, Switch, Typography } from 'antd'
import { useState } from 'react'
import DashboardPage from '../pages/DashboardPage.jsx'
import ModulePage from '../pages/ModulePage.jsx'
import FacultyPage from '../pages/Faculty/FacultyPage.jsx'
import PhDStudentsPage from '../pages/PhDStudents/PhDStudentsPage.jsx'
import StudentsPage from '../pages/Students/StudentsPage.jsx'
import ProgramsPage from '../pages/Programs/ProgramsPage.jsx'
import CoursesPage from '../pages/Courses/CoursesPage.jsx'
import StudyPlansPage from '../pages/StudyPlans/StudyPlansPage.jsx'
import EnrollmentsPage from '../pages/Enrollments/EnrollmentsPage.jsx'
import GradesPage from '../pages/Grades/GradesPage.jsx'
import ThesisPage from '../pages/Thesis/ThesisPage.jsx'
import CouncilsPage from '../pages/Councils/CouncilsPage.jsx'
import DefenseSchedulePage from '../pages/DefenseSchedule/DefenseSchedulePage.jsx'
import TuitionPage from '../pages/Tuition/TuitionPage.jsx'
import FormsPage from '../pages/Forms/FormsPage.jsx'
import ReportsPage from '../pages/Reports/ReportsPage.jsx'
import AdminPage from '../pages/Admin/AdminPage.jsx'
import NotificationsPage from '../pages/Notifications/NotificationsPage.jsx'
import ScientificProfilesPage from '../pages/ScientificProfiles/ScientificProfilesPage.jsx'
import KpiDashboardPage from '../pages/KpiDashboard/KpiDashboardPage.jsx'
import WorkflowPage from '../pages/Workflow/WorkflowPage.jsx'
import QualityAssurancePage from '../pages/QualityAssurance/QualityAssurancePage.jsx'
import CourseOutcomesPage from '../pages/CourseOutcomes/CourseOutcomesPage.jsx'
import OutcomeAssessmentPage from '../pages/OutcomeAssessment/OutcomeAssessmentPage.jsx'
import CurriculumAnalyticsPage from '../pages/CurriculumAnalytics/CurriculumAnalyticsPage.jsx'
import CQIPage from '../pages/CQI/CQIPage.jsx'
import RISPage from '../pages/RIS/RISPage.jsx'
import RIS2Page from '../pages/RIS2/RIS2Page.jsx'
import RIS21Page from '../pages/RIS21/RIS21Page.jsx'
import DocumentGeneratorPage from '../pages/DocumentGenerator/DocumentGeneratorPage.jsx'
 import RIS21IntegratedPage from '../pages/RIS21/RIS21IntegratedPage.jsx'
import AdmissionsPage from '../pages/Admissions/AdmissionsPage.jsx'
import AdmissionsV3Page from '../modules/admissions/AdmissionsV3Page.jsx'
import SupervisorsPage from '../pages/Supervisors/SupervisorsPage.jsx'
import StudyPlansEnterprisePage from '../pages/StudyPlans/StudyPlansEnterprisePage.jsx'
import CourseRegistrationPage from '../pages/CourseRegistration/CourseRegistrationPage.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import StudentPortalPage from '../pages/Portal/StudentPortalPage.jsx'
import FacultyPortalPage from '../pages/Portal/FacultyPortalPage.jsx'
import FacultyProfilePage from '../pages/FacultyProfile/FacultyProfilePage.jsx'
import CourseSyllabusPage from '../pages/CourseSyllabus/CourseSyllabusPage.jsx'
import CurriculumMatrixPage from '../pages/CurriculumMatrix/CurriculumMatrixPage.jsx'
const { Header, Sider, Content } = Layout

const { Text } = Typography

const menuItems = [
  { key: 'dashboard', icon: <HomeOutlined />, label: 'Dashboard' },
  { key: 'admissions', icon: <AuditOutlined />, label: 'Tuyển sinh' },
  { key: 'students', icon: <UserOutlined />, label: 'Học viên cao học' },
  { key: 'phd_students', icon: <SolutionOutlined />, label: 'Nghiên cứu sinh' },
  { key: 'faculty', icon: <TeamOutlined />, label: 'Thông tin Giảng viên' },
  { key: 'supervisors', icon: <TeamOutlined />, label: 'Người hướng dẫn' },
  { key: 'programs', icon: <BankOutlined />, label: 'Chương trình đào tạo' },
  { key: 'courses', icon: <BookOutlined />, label: 'Học phần' },
  { key: 'study_plans', icon: <ScheduleOutlined />, label: 'Kế hoạch học tập' },
  { key: 'course_registration', icon: <BookOutlined />, label: 'Học viên đăng ký học phần' },
  { key: 'enrollments', icon: <BookOutlined />, label: 'Đăng ký học phần' },
  { key: 'research_topics', icon: <ReadOutlined />, label: 'Đề tài' },
  { key: 'theses', icon: <FilePdfOutlined />, label: 'Luận văn / Luận án' },
  { key: 'councils', icon: <TeamOutlined />, label: 'Hội đồng' },
  { key: 'defense_schedules', icon: <CalendarOutlined />, label: 'Lịch bảo vệ' },
  { key: 'tuition', icon: <DollarOutlined />, label: 'Học phí' },
  { key: 'grades', icon: <FileDoneOutlined />, label: 'Điểm' },
  { key: 'accreditation', icon: <AuditOutlined />, label: 'Minh chứng kiểm định' },
  { key: 'forms', icon: <FormOutlined />, label: 'Biểu mẫu' },
  { key: 'notifications', icon: <BellOutlined />, label: 'Thông báo' },
  { key: 'scientific_profiles', icon: <UserOutlined />, label: 'Hồ sơ khoa học' },
  { key: 'kpis', icon: <BarChartOutlined />, label: 'Bảng điều khiển KPI' },
  { key: 'reports', icon: <FileDoneOutlined />, label: 'Báo cáo thống kê' },
  { key: 'settings', icon: <SettingOutlined />, label: 'Quản trị hệ thống' },
  { key: 'workflow', icon: <ScheduleOutlined />, label: 'Quy trình đăng ký' },
  { key: 'quality_assurance', icon: <SafetyCertificateOutlined />, label: 'Đảm bảo chất lượng' },
  { key: 'course_outcomes', icon: <BookOutlined />, label: 'Học phần & CĐR' },
  { key: 'outcome_assessment', icon: <FileDoneOutlined />, label: 'Đo lường CDR' },
  { key: 'curriculum_analytics', icon: <BarChartOutlined />, label: 'Phân tích chương trình đào tạo' },
  { key: 'cqI', icon: <AuditOutlined />, label: 'CQI' },
  { key: 'course_syllabus', label: 'Đề cương học phần' },
   { key: 'ris21', icon: <UserOutlined />, label: 'RIS / LLKH 2.1' },
   { key: 'faculty_profile', icon: <UserOutlined />, label: 'Hồ sơ giảng viên' },
{ key: 'curriculum_matrix', icon: <BarChartOutlined />, label: 'Ma trận CTĐT' },
]

const titles = Object.fromEntries(menuItems.map((item) => [item.key, item.label]))

export default function MainLayout({ user, darkMode, onToggleDark, onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  const [activeKey, setActiveKey] = useState('dashboard')
const { role } = useAuth()
  const userMenu = {
    items: [
      { key: 'profile', label: 'Hồ sơ cá nhân', icon: <UserOutlined /> },
      { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true, onClick: onLogout },
    ],
  }

  const renderPage = () => {
    if (activeKey === 'dashboard') return <DashboardPage />
    if (activeKey === 'students') return <StudentsPage />
    if (activeKey === 'phd_students') return <PhDStudentsPage />
    if (activeKey === 'faculty') return <FacultyPage />
    if (activeKey === 'faculty_profile') return <FacultyProfilePage />
    if (activeKey === 'supervisors') return <SupervisorsPage />
    if (activeKey === 'programs') return <ProgramsPage />
    if (activeKey === 'courses') return <CoursesPage />
    if (activeKey === 'study_plans') return <StudyPlansPage />
    if (activeKey === 'study_plans_enterprise') return <StudyPlansEnterprisePage />
    if (activeKey === 'course_registration') return <CourseRegistrationPage />
    if (activeKey === 'enrollments' ) return <EnrollmentsPage />
    if (activeKey === 'grades') return <GradesPage />
    if (activeKey === 'theses') return <ThesisPage />
    if (activeKey === 'councils') return <CouncilsPage />
    if (activeKey === 'defense_schedules') return <DefenseSchedulePage />
    if (activeKey === 'tuition') return <TuitionPage />
    if (activeKey === 'forms') return <FormsPage />
    if (activeKey === 'reports') return <ReportsPage />
    if (activeKey === 'settings') return <AdminPage />
    if (activeKey === 'notifications') return <NotificationsPage />
    if (activeKey === 'scientific_profiles') return <ScientificProfilesPage />
    if (activeKey === 'kpis') return <KpiDashboardPage />
    if (activeKey === 'workflow') return <WorkflowPage />
    if (activeKey === 'quality_assurance') return <QualityAssurancePage />
    if (activeKey === 'course_outcomes') return <CourseOutcomesPage />
    if (activeKey === 'outcome_assessment') return <OutcomeAssessmentPage />
    if (activeKey === 'curriculum_analytics') return <CurriculumAnalyticsPage />
    if (activeKey === 'cqI') return <CQIPage />
    if (activeKey === 'ris') return <RISPage />
    if (activeKey === 'ris2') return <RIS2Page />
    if (activeKey === 'ris21') return <RIS21Page />
    if (activeKey === 'document_generator') return <DocumentGeneratorPage />
    if (activeKey === 'scientific_profiles') return <RIS21IntegratedPage />
    if (activeKey === 'admissions') return <AdmissionsPage />
    if (activeKey === 'admissions') return <AdmissionsV3Page />
    if (activeKey === 'course_syllabus') return <CourseSyllabusPage />
     if (activeKey === 'curriculum_matrix') return <CurriculumMatrixPage />
    return <ModulePage tableName={activeKey} title={titles[activeKey]} />
  }
if (role === 'student' || role === 'phd_student') {
  return <StudentPortalPage />
}

if (role === 'faculty') {
  return <FacultyPortalPage />
}
  return (
    <Layout className="app-shell">
      <Sider width={276} collapsed={collapsed} className="app-sider">
        <div className="brand-block">
          <div className="brand-logo">VAA</div>
          {!collapsed && (
            <div>
              <div className="brand-title">HỌC VIỆN HÀNG KHÔNG</div>
              <div className="brand-subtitle">VIỆN ĐÀO TẠO SAU ĐẠI HỌC</div>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={({ key }) => setActiveKey(key)}
          className="side-menu"
        />
        {!collapsed && <div className="support-box">☎ Hỗ trợ trực tuyến<br />028 3811 2321</div>}
      </Sider>
      <Layout>
        <Header className="app-header">
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
          <div className="header-title">HỆ THỐNG QUẢN LÝ SAU ĐẠI HỌC</div>
          <Space size="middle" className="header-actions">
            <Text>Dark mode</Text>
            <Switch checked={darkMode} onChange={onToggleDark} />
            <Dropdown menu={userMenu} trigger={['click']}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar>{user.full_name?.slice(0, 1) || 'A'}</Avatar>
                <div className="user-info">
                  <b>{user.full_name}</b>
                  <span>{user.role}</span>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className="app-content">{renderPage()}</Content>
      </Layout>
    </Layout>
  )
}
